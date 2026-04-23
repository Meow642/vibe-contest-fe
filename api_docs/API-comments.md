# Comments API（评论卡片 / 便签墙）

> 画布形态的实时评论墙。每条评论是一张贴纸（sticker），带位置、旋转角、颜色、富文本内容与点赞数。
>
> 通用约定（Base URL、错误格式、状态码、时间字段等）见 [API.md](./API.md)；鉴权方式见 [API-auth.md](./API-auth.md)。本文只描述 Comments 模块的独有部分。
>
> **字段命名一次定稿**：下文出现的 `x / y / rotation / color / content / likeCount / likedByMe / author` 等字段为前后端契约，实现时不得随意重命名或增删。
>
> 实时同步（WebSocket 广播 `comment.created` / `comment.updated` / `comment.deleted` / `comment.liked`）在后续 `API-realtime.md` 中定义；本文仅定义 HTTP 接口，所有写操作应在成功提交后由服务端同步触发一次对应广播。

---

## 权限矩阵

| 操作 | 未登录 | 已登录（非作者） | 已登录（作者本人） |
|---|---|---|---|
| `GET /comments` 读画板 | ✅ | ✅ | ✅ |
| `POST /comments` 发卡片 | ❌ `401` | ✅ | ✅ |
| `PUT /comments/:id` 改内容/位置 | ❌ `401` | ❌ `403` | ✅ |
| `DELETE /comments/:id` 删卡片 | ❌ `401` | ❌ `403` | ✅ |
| `POST /comments/:id/like` 点赞 | ❌ `401` | ✅ | ❌ `403`（不能给自己点赞） |
| `DELETE /comments/:id/like` 取消点赞 | ❌ `401` | ✅ | ❌ `403` |

> 「未登录可读画板」对应需求里的第 8 条：登录前也可展示所有卡片，只是少了工具条与左侧在线用户。

---

## 资源模型

### 表结构（SQLite，建议）

```sql
CREATE TABLE comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT    NOT NULL,                       -- 富文本（sanitized HTML）
  x          REAL    NOT NULL,                       -- 画布坐标 X
  y          REAL    NOT NULL,                       -- 画布坐标 Y
  rotation   REAL    NOT NULL DEFAULT 0,             -- 旋转角（度）
  color      TEXT    NOT NULL,                       -- 颜色枚举
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_comments_created_at ON comments (created_at DESC);

CREATE TABLE comment_likes (
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (comment_id, user_id)
);
```

### 响应实体 `Comment`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `number` (int) | 自增主键 |
| `content` | `string` | **已做服务端 sanitize** 的 HTML；仅保留下方白名单标签 |
| `x` | `number` (float) | 画布坐标 X（CSS 像素，基于「画板逻辑坐标系」，详见下文） |
| `y` | `number` (float) | 画布坐标 Y |
| `rotation` | `number` (float) | 旋转角，单位度，允许范围 `[-30, 30]`，创建默认 `0` |
| `color` | `CommentColor` | 便签颜色枚举，见下 |
| `likeCount` | `number` (int) | 点赞总数 |
| `likedByMe` | `boolean` | **依赖调用者身份**：未登录恒为 `false`；作者本人恒为 `false` |
| `author` | `CommentAuthor` | 作者公开视图（见下） |
| `createdAt` | `string` | UTC `"YYYY-MM-DD HH:mm:ss"` |
| `updatedAt` | `string` | 同上，内容或位置变更时刷新 |

### 嵌入实体 `CommentAuthor`

评论响应里嵌入的作者「瘦身视图」，避免 N+1 请求。**注意与 [API-auth.md](./API-auth.md) 的 `User` 是两个不同类型**，字段必须一致。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `number` | 用户 id |
| `displayName` | `string` | 昵称（卡片署名用） |
| `avatarUrl` | `string` | 头像，允许空串 |

> 刻意不暴露 `username` / `createdAt` 等字段 —— 墙上只需要昵称和头像。

### 枚举 `CommentColor`

```ts
type CommentColor = "pink" | "yellow" | "green" | "blue" | "purple" | "orange";
```

对应 Figma 里 6 种便签配色。**前端实际显示颜色由前端样式表定义**，后端只负责存枚举值。不在枚举中的值 → `400`。

### 画板坐标系

**约定一次定稿**：
- 坐标原点 `(0, 0)` 在画板左上角，X 向右、Y 向下（标准屏幕坐标）。
- **单位为 CSS 像素**，基于一个**逻辑画布尺寸 `4000 × 3000`**（X ∈ [0, 4000]，Y ∈ [0, 3000]）。前端负责把用户视口映射到这个逻辑坐标系再上报。
- 服务端**只存不校正**：只校验在合法范围内（见下方约束）、不做缩放/旋转归一化。
- 后端校验范围：`x ∈ [0, 4000]`，`y ∈ [0, 3000]`，越界 → `400`。

> 选择固定逻辑坐标而不是百分比，是为了让所有客户端看到的卡片在「相对画布」上的位置绝对一致，与设备 DPR、窗口大小解耦。后续如要支持无限画布，再扩展坐标范围，**不改字段名**。

### TypeScript 类型（前端直接复制）

```ts
export type CommentColor =
  | "pink" | "yellow" | "green" | "blue" | "purple" | "orange";

export interface CommentAuthor {
  id: number;
  displayName: string;
  avatarUrl: string;
}

export interface Comment {
  id: number;
  content: string;
  x: number;
  y: number;
  rotation: number;
  color: CommentColor;
  likeCount: number;
  likedByMe: boolean;
  author: CommentAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentPayload {
  content: string;        // 必填，非空（sanitize 后仍非空）
  x: number;              // 必填
  y: number;              // 必填
  color: CommentColor;    // 必填
  rotation?: number;      // 可选，默认 0
}

// PUT 是 partial：至少传 1 个字段；作者以外的字段（author/likeCount 等）不可改
export interface UpdateCommentPayload {
  content?: string;
  x?: number;
  y?: number;
  rotation?: number;
  color?: CommentColor;
}

export interface CommentListResponse {
  total: number;
  limit: number;
  offset: number;
  items: Comment[];
}
```

---

## 富文本内容约定

- **存储 / 传输格式**：HTML 字符串，已由后端 sanitize。
- **允许的标签白名单**（对应 Figma 工具条 B / I / U / S / 无序 / 有序）：

  ```
  <b> <strong> <i> <em> <u> <s> <strike>
  <ul> <ol> <li>
  <br> <p>
  ```

- **不允许**：任何标签属性（`class` / `style` / `onclick` / ...）、`<script>`、`<a>`（后续再加）、`<img>`、自定义元素等 —— 一律被 strip。
- **长度约束**：sanitize **后**的 HTML 长度 ≤ 5000 字符；**纯文本**（strip tags 后）非空且 ≤ 2000 字符。
- **换行**：前端可用 `<br>` 或 `<p>…</p>`；后端不做归一化。
- **编辑器**：前端实现用什么（Tiptap / ProseMirror / contentEditable 自研…）都可以，只要**输出白名单 HTML**即可。

> 推荐后端用 [`sanitize-html`](https://www.npmjs.com/package/sanitize-html) 或 DOMPurify (jsdom) 实现，白名单与上表完全一致。

---

## 字段约束与错误消息（统一）

| 字段 | 约束 | 错误消息 |
|---|---|---|
| `content` | 必填；sanitize 后纯文本非空且 ≤ 2000；HTML ≤ 5000 | `content is required and must be 1-2000 chars (plain text)` |
| `x` | `number`，`0 ≤ x ≤ 4000` | `x must be a number in [0, 4000]` |
| `y` | `number`，`0 ≤ y ≤ 3000` | `y must be a number in [0, 3000]` |
| `rotation` | `number`，`-30 ≤ rotation ≤ 30` | `rotation must be a number in [-30, 30]` |
| `color` | 枚举值 | `color must be one of: pink, yellow, green, blue, purple, orange` |

---

## 1. 列表查询

**`GET /comments`**

> 公共接口，**无需登录**。但若携带了合法 `Authorization` 头，响应中的 `likedByMe` 会按当前用户计算；否则恒为 `false`。

### Query 参数

| 参数 | 类型 | 默认 | 约束 | 说明 |
|---|---|---|---|---|
| `limit` | number | `500` | 1–1000（超出自动夹取） | 分页条数；默认足够一次拉完画板 |
| `offset` | number | `0` | ≥0 | 偏移量 |
| `authorId` | number | — | 正整数 | 仅看某作者的卡片（侧边栏点头像筛选用，MVP 可不接） |

### 响应 `200`：`Paginated<Comment>`

```json
{
  "total": 158,
  "limit": 500,
  "offset": 0,
  "items": [
    {
      "id": 158,
      "content": "<p>点赞这次新上行的财务审批系统！</p>",
      "x": 1180.5,
      "y": 420.0,
      "rotation": -3.2,
      "color": "pink",
      "likeCount": 5,
      "likedByMe": false,
      "author": {
        "id": 12,
        "displayName": "赵欣",
        "avatarUrl": "https://cdn.example.com/a/12.jpg"
      },
      "createdAt": "2026-04-20 15:23:32",
      "updatedAt": "2026-04-20 15:23:32"
    }
  ]
}
```

> 排序：`created_at DESC, id DESC`（最新在上层）。

### 错误

| 状态码 | error |
|---|---|
| `400` | `authorId must be a positive integer` |

---

## 2. 获取单条

**`GET /comments/:id`**

公共接口，语义同列表单项（`likedByMe` 依赖调用者）。

### 响应 `200`：返回 `Comment`

### 错误

| 状态码 | error |
|---|---|
| `400` | `id must be a positive integer` |
| `404` | `Comment not found` |

---

## 3. 创建

**`POST /comments`** — 需登录

### 请求体（`CreateCommentPayload`）

```json
{
  "content": "<p>建议周会时长控制在 30 分钟内</p>",
  "x": 620.0,
  "y": 340.0,
  "color": "blue",
  "rotation": 2.5
}
```

### 响应 `201`：返回新建的 `Comment`

- `author` 字段后端自动填当前登录用户；请求体里**不允许**传 `author` / `userId` / `likeCount` / `likedByMe`（传了静默忽略）。
- 服务端在成功后广播 `comment.created`（详见实时文档）。

### 错误

| 状态码 | error |
|---|---|
| `400` | 见 [字段约束与错误消息](#字段约束与错误消息统一) |
| `401` | `missing or invalid token` / `token expired` |

---

## 4. 部分更新

**`PUT /comments/:id`** — 需登录，**仅作者本人**

> **PATCH 风格的 partial update**：请求体中出现哪些字段就改哪些，未出现的字段保留原值；成功后 `updatedAt` 刷新。前端「拖动卡片」场景只需 `PUT { x, y }`，「编辑内容」场景只需 `PUT { content }`。

### 请求体（`UpdateCommentPayload`，至少一个字段）

```json
{ "x": 720.3, "y": 412.0 }
```

### 响应 `200`：返回更新后的完整 `Comment`

### 错误

| 状态码 | error |
|---|---|
| `400` | `id must be a positive integer` |
| `400` | `no updatable fields provided` |
| `400` | 单字段校验（同创建） |
| `401` | `missing or invalid token` / `token expired` |
| `403` | `only the author can modify this comment` |
| `404` | `Comment not found` |

### 示例

```bash
# 拖动
curl -X PUT http://localhost:3000/comments/158 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"x":720.3,"y":412.0}'

# 改内容
curl -X PUT http://localhost:3000/comments/158 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"<p>修订后的内容</p>"}'
```

---

## 5. 删除

**`DELETE /comments/:id`** — 需登录，**仅作者本人**

### 响应 `204 No Content`（**无 body**）

- 级联删除该评论的所有 `comment_likes` 记录（由外键 `ON DELETE CASCADE` 处理）。
- 服务端广播 `comment.deleted`。

### 错误

| 状态码 | error |
|---|---|
| `400` | `id must be a positive integer` |
| `401` | `missing or invalid token` / `token expired` |
| `403` | `only the author can delete this comment` |
| `404` | `Comment not found` |

---

## 6. 点赞

**`POST /comments/:id/like`** — 需登录，**不能给自己点赞**

- **幂等**：重复点赞不报错，返回当前状态；后端用 `INSERT OR IGNORE INTO comment_likes` 即可。
- 广播 `comment.liked`（载荷含最新 `likeCount`）。

### 响应 `200`

返回一个精简的状态对象，避免前端再去拉整条评论：

```ts
interface LikeStateResponse {
  commentId: number;
  likeCount: number;
  likedByMe: true;  // POST 总是 true
}
```

```json
{ "commentId": 158, "likeCount": 6, "likedByMe": true }
```

### 错误

| 状态码 | error |
|---|---|
| `400` | `id must be a positive integer` |
| `401` | `missing or invalid token` / `token expired` |
| `403` | `cannot like your own comment` |
| `404` | `Comment not found` |

---

## 7. 取消点赞

**`DELETE /comments/:id/like`** — 需登录

- **幂等**：未点赞再取消也返回 `200`（不是 404）。
- 广播 `comment.liked`（载荷含最新 `likeCount`）。

### 响应 `200`：同 `LikeStateResponse`，`likedByMe: false`

```json
{ "commentId": 158, "likeCount": 5, "likedByMe": false }
```

### 错误

| 状态码 | error |
|---|---|
| `400` | `id must be a positive integer` |
| `401` | `missing or invalid token` / `token expired` |
| `403` | `cannot like your own comment` |
| `404` | `Comment not found` |

> 注意：取消点赞也禁止作者本人操作，行为与点赞对称（防止作者自己操作自己的 like 记录）。

---

## 前端封装参考（axios）

基于 [src/lib/api/client.ts](../src/lib/api/client.ts) 的 `http` 封装。

```ts
import { http, type Paginated } from "@/lib/api";
import type {
  Comment,
  CreateCommentPayload,
  UpdateCommentPayload,
} from "./types";

interface LikeStateResponse {
  commentId: number;
  likeCount: number;
  likedByMe: boolean;
}

export const commentsApi = {
  list: (params: { limit?: number; offset?: number; authorId?: number } = {}) =>
    http.get<Paginated<Comment>>("/comments", { params }),

  get: (id: number) => http.get<Comment>(`/comments/${id}`),

  create: (payload: CreateCommentPayload) =>
    http.post<Comment>("/comments", payload),

  update: (id: number, payload: UpdateCommentPayload) =>
    http.put<Comment>(`/comments/${id}`, payload),

  remove: (id: number) => http.delete<void>(`/comments/${id}`),

  like: (id: number) =>
    http.post<LikeStateResponse>(`/comments/${id}/like`, {}),

  unlike: (id: number) =>
    http.delete<LikeStateResponse>(`/comments/${id}/like`),
};
```

### TanStack Query 使用要点

- **初次进页面**：`useQuery(["comments"], commentsApi.list)` 拿全量画板。
- **拖拽**：用 `useMutation` + `onMutate` 做乐观更新，同时把 WebSocket 收到的同 `id` `comment.updated` 事件合并进缓存（以服务端为准）。为了抑制抖动，拖拽结束再发一次 `PUT`，**中途的 x/y 通过 WebSocket 帧直接广播**（见实时文档，不走 HTTP）。
- **点赞**：同样乐观更新 `likeCount / likedByMe`，失败回滚。

---

## 联调 checklist

- [ ] 未登录调 `GET /comments` 能拿到完整列表；`likedByMe` 全为 `false`。
- [ ] 未登录调写接口返回 `401`，错误消息为 `missing or invalid token`。
- [ ] 非作者调 `PUT` / `DELETE` 返回 `403 only the author can ...`。
- [ ] 作者本人调 `POST /comments/:id/like` 返回 `403 cannot like your own comment`。
- [ ] 重复点赞 / 重复取消点赞均返回 `200`（幂等）。
- [ ] `x` / `y` 越界（如 `x = 5000`）返回 `400`。
- [ ] `color` 传枚举外值（如 `"red"`）返回 `400`。
- [ ] 富文本提交 `<p onclick=alert(1)>x</p>`，返回的 `content` 应为 `<p>x</p>`（属性被 strip）。
- [ ] 富文本提交 `<script>alert(1)</script>`，返回的 `content` 应为空字符串或纯文本 → 触发「纯文本非空」校验 → `400`。
- [ ] 删除评论后，`comment_likes` 中对应行已一并清除。
- [ ] 所有时间字段为 `"YYYY-MM-DD HH:mm:ss"` UTC。
