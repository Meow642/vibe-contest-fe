# 后端开发补充说明

> 除了 [API.md](./API.md) / [API-auth.md](./API-auth.md) / [API-comments.md](./API-comments.md) / [API-realtime.md](./API-realtime.md) 定义的接口契约之外，后端实现层面还需要定死的东西。读完这份就可以直接建仓库开工。
>
> 本文档约束的是**后端内部契约**（技术选型、env、迁移、内部数据结构、限流算法）。前端不需要关心大多数内容，但**所有写入 HTTP 接口成功后必须触发对应 WS 广播**这条是跨栈硬约束，下面会再强调一次。

---

## 1. 技术栈（定稿，不再讨论）

| 项 | 选型 | 理由 |
|---|---|---|
| 运行时 | Node.js ≥ 20 | 原生 `fetch`、LTS |
| HTTP 框架 | Express 4 | 简单、中间件生态 |
| WebSocket | **`ws`** 库（**非 socket.io**） | 信封格式已按原生 WS 设计，socket.io 会自动包一层不兼容 |
| 数据库 | **SQLite**，通过 `better-sqlite3`（同步 API、更快） | MVP 单进程单文件 |
| 密码哈希 | `bcrypt`，cost = **10** | Node 生态最稳 |
| JWT | `jsonwebtoken`，算法 **HS256** | 对称密钥够用 |
| 输入 sanitize | `sanitize-html` | 配置对象见下文第 7 节 |
| 进程管理 | 直接 `node dist/index.js`；不上 PM2 cluster | **MVP 单进程部署**（见第 5 节） |

> 不准换技术栈；如发现选型不合理请先改本文档再改代码。

---

## 2. 环境变量清单

**所有** env 在启动时读取、缺失即 panic。在仓库根放 `.env.example`，字段一字不差：

```ini
# 服务
PORT=3000
NODE_ENV=development

# 数据库
DATABASE_PATH=./data/vibe.db

# JWT
JWT_SECRET=change-me-in-prod-please
JWT_EXPIRES_IN=7d

# CORS
# 开发环境用 * ；生产必须收窄成前端域名，逗号分隔
CORS_ORIGIN=*
```

**生产部署 checklist**：
- `JWT_SECRET` 用 ≥ 32 字节随机串（`openssl rand -base64 48`）。
- `CORS_ORIGIN` 显式写成 `https://vibecontest.example.com`，不要留 `*`。
- `DATABASE_PATH` 指向持久化卷，不要放临时目录。

---

## 3. 目录结构约定

```
vibe-contest-api/
  src/
    index.ts              # 入口：读 env → 建 DB → 建 HTTP + WS → listen
    db/
      migrate.ts          # 启动时自动建表（见第 4 节）
      schema.sql          # 直接保存第 4 节的建表 SQL，便于人类查阅
    auth/
      routes.ts           # /auth/*
      jwt.ts              # sign/verify
      middleware.ts       # requireAuth / optionalAuth
    comments/
      routes.ts           # /comments/*
      sanitize.ts         # sanitize-html 配置
      validators.ts       # zod / 手写皆可
    realtime/
      server.ts           # WS 升级握手 + 路由分发
      presence.ts         # 连接池 + presence 广播
      broadcaster.ts      # HTTP 层调的统一广播 API
      rate-limit.ts       # drag 限流
    lib/
      errors.ts           # ApiError 类 + 统一错误中间件
      time.ts             # datetime('now') 的 Node 端等价工具（如需）
  data/
    vibe.db               # gitignore
  .env.example
  README.md
```

---

## 4. 数据库迁移

**方式：启动时执行 `db/migrate.ts`**，用 `CREATE TABLE IF NOT EXISTS` 保证幂等。**不引入独立迁移工具**（Knex / Prisma migrate），MVP 不值得。

```ts
// src/db/migrate.ts
import Database from "better-sqlite3";

export function migrate(db: Database.Database) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      display_name  TEXT    NOT NULL,
      avatar_url    TEXT    NOT NULL DEFAULT '',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content    TEXT    NOT NULL,
      x          REAL    NOT NULL,
      y          REAL    NOT NULL,
      rotation   REAL    NOT NULL DEFAULT 0,
      color      TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_comments_created_at
      ON comments (created_at DESC);

    CREATE TABLE IF NOT EXISTS comment_likes (
      comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (comment_id, user_id)
    );
  `);
}
```

- **`PRAGMA journal_mode = WAL`** 必须开：提升并发读写。
- **`PRAGMA foreign_keys = ON`** 必须开：否则 `ON DELETE CASCADE` 不生效。
- 未来 schema 变更：在同一文件里**追加** `ALTER TABLE` 语句，用 `PRAGMA user_version` 做版本判断。不要回头改历史 `CREATE`。

---

## 5. 单进程部署约束（硬约束）

**MVP 明确只支持单进程部署**。

**原因**：HTTP 写入触发的 WS 广播、presence 状态全部在**进程内存**里。多进程下 A 实例的写入无法广播给 B 实例连着的客户端，会出现「B 的客户端收不到 A 发的实时事件」的脏现象。

**落地要求**：
- 不用 PM2 `cluster` 模式；用 `fork` 模式单实例即可。
- Docker 部署时 `replicas: 1`。
- 横扩前必须先引入 Redis pub/sub 作为广播总线，**这是另一次需求**，不在本 MVP 范围。

---

## 6. JWT 实现细节

### payload 结构

```ts
interface JwtPayload {
  sub: number;      // userId（JWT 标准 claim）
  iat: number;      // jsonwebtoken 自动填
  exp: number;      // jsonwebtoken 按 JWT_EXPIRES_IN 自动填
}
```

**不要往 payload 里塞 `username` / `displayName` 等可变字段**；显示用字段每次从 DB 读（`/auth/me` 会重新查）。

### 签发 / 校验

```ts
// src/auth/jwt.ts
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET!;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

export const signToken = (userId: number) =>
  jwt.sign({ sub: userId }, SECRET, { algorithm: "HS256", expiresIn: EXPIRES_IN });

export const verifyToken = (token: string) =>
  jwt.verify(token, SECRET, { algorithms: ["HS256"] }) as JwtPayload;
```

### `expiresAt` 字段的生成

`/auth/login` / `/auth/register` 响应里的 `expiresAt` 字段格式必须是 `"YYYY-MM-DD HH:mm:ss"`（UTC），与其他时间字段统一。jsonwebtoken 里 `exp` 是秒级 unix 时间戳，要自己转：

```ts
const toSqlTime = (unixSec: number) =>
  new Date(unixSec * 1000).toISOString().replace("T", " ").slice(0, 19);
```

### 中间件

```ts
// src/auth/middleware.ts
// requireAuth：失败直接 401
// optionalAuth：失败不报错，req.user = null（用于 GET /comments）
```

**`optionalAuth` 不允许在非法 token 上静默放行** —— token 存在但解析失败仍应返回 401。只有**完全没带 Authorization 头**才视为匿名。

---

## 7. sanitize-html 配置（跨端一致）

把这份配置作为常量 export，在 `POST /comments` 和 `PUT /comments` 里都用同一份：

```ts
// src/comments/sanitize.ts
import sanitizeHtml from "sanitize-html";

export const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "b", "strong", "i", "em", "u", "s", "strike",
    "ul", "ol", "li",
    "br", "p",
  ],
  allowedAttributes: {},        // 任何标签都不允许属性
  allowedSchemes: [],            // 禁所有 URL scheme（因为不允许 <a>）
  disallowedTagsMode: "discard", // script 等直接扔
  enforceHtmlBoundary: true,
};

export const sanitize = (html: string) => sanitizeHtml(html, SANITIZE_OPTIONS);
```

**校验顺序**（出错即 400，不继续）：
1. `content` 必须是 string。
2. `sanitize(content)` → 得到 `cleanHtml`。
3. `cleanHtml.length > 5000` → 400 `content is required and must be 1-2000 chars (plain text)`（消息可以复用）。
4. 用 `sanitizeHtml(cleanHtml, { allowedTags: [], allowedAttributes: {} })` 再 strip 一次得到纯文本；`plain.trim().length === 0` 或 `> 2000` → 400。
5. 存库时存 `cleanHtml`（保留格式），纯文本只用于校验。

---

## 8. WebSocket 实现

### 升级握手与端口共享

```ts
// src/index.ts
import http from "http";
import { WebSocketServer } from "ws";
import { handleUpgrade } from "./realtime/server";

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  if (new URL(req.url!, "http://x").pathname !== "/ws") {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => handleUpgrade(ws, req));
});

server.listen(Number(process.env.PORT) || 3000);
```

### 连接身份 / presence 数据结构

```ts
// src/realtime/presence.ts
interface Conn {
  ws: WebSocket;
  userId: number | null;   // null = 匿名
  sessionId: string;
}

// 按 userId 维护所有连接（同一用户多标签页）
const byUser = new Map<number, Set<Conn>>();
// 全部连接（含匿名），广播时遍历
const all = new Set<Conn>();
```

**presence 事件的幂等规则**：
- 新连接 `byUser.get(userId)?.size === 0`（或 `undefined`）时，广播 `presence.joined`。
- 断开时把 conn 从 `byUser.get(userId)` 移除，若移除后 `size === 0`，广播 `presence.left`。
- 匿名连接不进 `byUser`，但进 `all`。

### 广播器：HTTP 层与 WS 层的唯一接口

HTTP routes 不应直接接触 `wss` / `Set<WebSocket>`；统一通过 `broadcaster`：

```ts
// src/realtime/broadcaster.ts
export const broadcaster = {
  commentCreated: (c: Comment) => broadcast({ type: "comment.created", data: { comment: c } }),
  commentUpdated: (c: Comment) => broadcast({ type: "comment.updated", data: { comment: c } }),
  commentDeleted: (id: number) => broadcast({ type: "comment.deleted", data: { id } }),
  commentLiked:   (p: { commentId: number; likeCount: number; actorId: number; liked: boolean }) =>
    broadcast({ type: "comment.liked", data: p }),
};
```

**硬约束**：每个写入 HTTP 接口在**事务 commit 成功后**才调 `broadcaster.*`；commit 失败则**不广播**。广播失败（任何 ws send 抛错）**不影响 HTTP 200/201 响应**，只写日志。

### `comment.dragging` 的限流

每个登录连接维护一个**固定窗口计数器**：

```ts
interface DragCounter {
  windowStart: number;   // ms
  count: number;         // 当前窗口内接收的 drag 帧数
  overSecs: number;      // 连续超限秒数
}
```

- 每秒窗口，阈值 120 帧/秒。
- 超限帧：**丢弃**并下发一次 `error { code: "rate_limited" }`（一个窗口内只发一次，避免放大）。
- 连续 3 个窗口超限 → `ws.close(4429)`。
- 匿名连接直接拒绝 `comment.drag`（`error { code: "forbidden" }`）。

---

## 9. HTTP 限流

MVP 只给登录接口加 rate limit，防暴力破解：

- `POST /auth/login`：**同 IP 每分钟 10 次**，超出 `429 Too Many Requests`，body `{ "error": "too many login attempts, try again later" }`。
- `POST /auth/register`：**同 IP 每分钟 5 次**。
- 其他接口**不限流**。

用 `express-rate-limit`，内存 store（单进程，不需要 Redis）。

```ts
import rateLimit from "express-rate-limit";

const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many login attempts, try again later" },
});
app.post("/auth/login", loginLimiter, loginHandler);
```

---

## 10. 错误处理中间件

项目里到处 throw `new ApiError(status, message)`；最末端用一个中间件统一转 JSON：

```ts
// src/lib/errors.ts
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// src/index.ts 末尾
app.use((err: any, _req, res, _next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});
```

**`unhandledRejection` / `uncaughtException` 不 swallow**，打日志后 `process.exit(1)`，让进程守护（systemd / docker restart）重启，避免半死状态。

---

## 11. 实现 checklist（按顺序做）

1. [ ] `npm init` + 装依赖：`express cors helmet ws better-sqlite3 bcrypt jsonwebtoken sanitize-html express-rate-limit zod`（zod 可选）。
2. [ ] 写 `src/index.ts` 最小骨架：`GET /health` → `{ ok: true }`，能跑。
3. [ ] 写 `db/migrate.ts`，启动时 auto-migrate。
4. [ ] 实现 `/auth/register` + `/auth/login` + `/auth/me` + `/auth/logout`，用 curl 打通。
5. [ ] 实现 `requireAuth` / `optionalAuth` 中间件。
6. [ ] 实现 `/comments` CRUD，不带广播，打通 HTTP。
7. [ ] 实现 `/comments/:id/like` + DELETE。
8. [ ] 加 WS 握手 + `hello` + `presence.sync`；不带业务事件，先跑通连接。
9. [ ] 加 presence.joined/left 广播（单用户多标签页幂等）。
10. [ ] 把 `broadcaster` 接到 comments routes 上，所有写入事务提交后广播。
11. [ ] 实现 `comment.drag` 接收 + 限流 + 广播 `comment.dragging`。
12. [ ] 写 `.env.example` + `README.md`（启动命令、部署说明）。
13. [ ] 联调：对着前端的[联调 checklist](./API-comments.md#联调-checklist) 和 [实时 checklist](./API-realtime.md#联调-checklist) 过一遍。

---

## 12. README 必写内容（最小交付文档）

仓库 `README.md` 至少覆盖：

1. **快速启动**：`cp .env.example .env && npm i && npm run dev`
2. **生产部署**：`npm run build && node dist/index.js`，env 清单与必改项。
3. **单进程部署的硬约束**（第 5 节的原因 + 横扩前需引入 Redis pub/sub）。
4. **API 文档入口**：链到 `api_docs/API.md`。
5. **端口与路径**：默认 `:3000`，HTTP 和 WS 共享端口，WS 路径 `/ws`。
6. **数据库文件位置**：`DATABASE_PATH`，提醒 docker 挂卷。

---

## 13. 常见坑

1. **`better-sqlite3` 是同步 API**，不要 `await db.prepare(...)`。事务用 `db.transaction(() => {...})()` 包裹。
2. **JWT 校验失败必须返回 401**，不要 500。`jsonwebtoken` 抛 `TokenExpiredError` / `JsonWebTokenError`，要在 catch 里区分。
3. **`PRAGMA foreign_keys = ON` 必须在每次连接上执行**，SQLite 默认关。`better-sqlite3` 同一 DB 实例全程一个连接，migrate 里执行一次即可。
4. **WebSocket `ws.send` 在连接已关闭时会抛错**，广播循环必须 `try/catch` 单条，否则一个死链会中断整轮广播。
5. **`sanitize-html` 默认允许 `data:` / `http:` 等 scheme**，本项目必须把 `allowedSchemes` 设为 `[]`。
6. **`express.json()` 的 body 大小默认 100kb**，富文本 5000 字符够用，不需要调。反倒应该设个上限防滥用：`express.json({ limit: "64kb" })`。
7. **CORS preflight 要放行 `Authorization` 头**：`cors({ origin: CORS_ORIGIN, allowedHeaders: ["Content-Type", "Authorization"] })`。
8. **bcrypt cost=10** 大约每次 hash 100ms，登录/注册接口要异步（`bcrypt.hash` / `bcrypt.compare` 返回 Promise），别用同步版本阻塞事件循环。
