# Realtime API（WebSocket 实时协议）

> 画板的实时同步与在线用户 presence。前端与后端通过一条 WebSocket 长连接交换事件，所有写入 HTTP 接口都会被后端「影子」广播成对应事件。
>
> 通用约定（时间字段等）见 [API.md](./API.md)；鉴权 token 见 [API-auth.md](./API-auth.md)；评论数据模型见 [API-comments.md](./API-comments.md)。本文只描述实时通道独有部分。
>
> **字段命名一次定稿**：下文出现的所有事件 `type` 字符串、envelope 结构（`type` / `data`）、以及 `payload` 字段均为前后端契约，实现时不得随意重命名或增删。

---

## 连接

### URL

| 环境 | URL |
|---|---|
| 开发 | `ws://localhost:3000/ws` |
| 生产 | `wss://<host>/ws`（与 HTTP API 同主机，Vercel 侧已配 rewrite） |

### 鉴权

Token 通过 **query string** 携带（WebSocket 握手阶段浏览器不方便写自定义头）：

```
ws://localhost:3000/ws?token=<jwt>
```

- **不带 token**：视为匿名访客（spectator）。允许连接，可**只读**接收所有 `comment.*` 广播，用于「未登录也能看到实时更新」的场景；不会出现在 presence 列表里，也不能发送任何客户端消息。
- **带合法 token**：升级为登录用户，出现在 presence 列表，可发送客户端消息。
- **带非法/过期 token**：服务端直接关闭连接，close code `4401`。前端应据此清掉本地 token 并降级为匿名重连。

### 握手后首次消息

连接建立成功后，服务端**主动下发两条事件**，按顺序：

1. `hello` —— 当前会话元信息（含你自己的 userId、服务端时间、心跳参数）。
2. `presence.sync` —— 当前所有在线用户的快照（一次性全量）。

客户端**应在收到 `hello` 后再开始发送任何消息**。

### 心跳

- 服务端每 `30s` 发一次 WebSocket `ping` 控制帧。
- 客户端浏览器会自动回 `pong`，无需业务层处理。
- 超过 `60s` 没收到 `pong` → 服务端主动断开，close code `1001`。
- 作为兜底，客户端也可发 `{"type":"ping"}` 应用层帧，服务端回 `{"type":"pong"}`；适用于代理层吞 ping 帧的场景。

### Close Codes

| Code | 语义 | 客户端动作 |
|---|---|---|
| `1000` | 正常关闭 | 按需重连 |
| `1001` | 心跳超时 / 服务重启 | 重连 |
| `4400` | 客户端消息格式非法 | 不要无脑重连，修 bug |
| `4401` | Token 无效或过期 | 清 token，降级匿名重连 |
| `4403` | 越权操作（如拖别人的卡片） | 不断线；但这个 close code 出现时说明服务端选择断开 |
| `4429` | 速率超限（如 drag 流量过大） | 指数退避重连 |

---

## 消息 envelope

所有 WebSocket 文本帧都是合法 JSON，统一信封：

```ts
interface WsEnvelope<T extends string, D> {
  type: T;       // 事件名，全局唯一
  data: D;       // 载荷
  ts?: string;   // 服务端时间 "YYYY-MM-DD HH:mm:ss"，仅服务端 → 客户端会带
}
```

- **方向约定**：本文所有事件会注明是 `S→C`（服务端下发）还是 `C→S`（客户端上行）。
- **未知 `type`**：接收方（无论哪端）应**忽略而非报错**，以便向前兼容新增事件。
- **错误处理**：服务端发现客户端消息格式不合法 → 下发一条 `error` 事件，不立即断线；连续 `>5` 次非法 → close `4400`。

---

## 事件列表总览

| Type | 方向 | 用途 |
|---|---|---|
| `hello` | S→C | 会话初始化 |
| `presence.sync` | S→C | 在线用户全量快照 |
| `presence.joined` | S→C | 有用户上线 |
| `presence.left` | S→C | 有用户下线 |
| `comment.created` | S→C | 新卡片（由 `POST /comments` 触发） |
| `comment.updated` | S→C | 卡片内容/位置/颜色的**最终**状态（由 `PUT /comments/:id` 触发） |
| `comment.deleted` | S→C | 卡片被删（由 `DELETE /comments/:id` 触发） |
| `comment.liked` | S→C | 点赞数变化（由 `POST/DELETE /comments/:id/like` 触发） |
| `comment.dragging` | S→C | **拖动过程中的临时位置广播**（不持久化） |
| `comment.drag` | C→S | 作者上报拖动中的坐标帧 |
| `ping` / `pong` | 双向 | 应用层心跳（兜底） |
| `error` | S→C | 服务端告知客户端上一条消息非法 |

---

## S→C 事件

### `hello`

握手成功后第一条消息。

```ts
interface HelloData {
  sessionId: string;        // 本次连接的唯一 id（UUID），便于日志排查
  userId: number | null;    // 登录用户 id；匿名为 null
  serverTime: string;       // UTC "YYYY-MM-DD HH:mm:ss"，用于客户端时钟校准
  heartbeatInterval: number; // 秒，当前固定 30
}
```

```json
{
  "type": "hello",
  "data": {
    "sessionId": "3f9c...",
    "userId": 12,
    "serverTime": "2026-04-23 15:23:32",
    "heartbeatInterval": 30
  },
  "ts": "2026-04-23 15:23:32"
}
```

---

### `presence.sync`

当前在线用户快照，握手后 `hello` 之后立刻下发；**之后不会主动重发**，增量走 `presence.joined` / `presence.left`。断线重连时会重新下发一次。

```ts
interface PresenceUser {
  id: number;
  displayName: string;
  avatarUrl: string;
  // 一个用户多标签页算一个在线；这里不回传连接数
}

interface PresenceSyncData {
  users: PresenceUser[];  // 按 displayName 升序
}
```

> **匿名连接（无 token）不出现在列表中**，也收不到其他人对他的 presence 事件 —— 但他本人仍会收到 `presence.*`（用于未登录时左侧栏若想展示在线总数）。匿名用户自己的上线/下线**不广播**给任何人。

---

### `presence.joined` / `presence.left`

```ts
interface PresenceDeltaData {
  user: PresenceUser;
}
```

**幂等原则**：
- 同一用户多标签页打开，**只在第一个连接建立时**广播 `joined`；
- **最后一个连接断开时**才广播 `left`；
- 客户端处理时仍应做 `Map<id, user>` 去重兜底。

---

### `comment.created`

```ts
interface CommentCreatedData {
  comment: Comment;   // 见 API-comments.md 的完整 Comment
}
```

- `likedByMe` 字段按**每个接收者**各自计算；服务端向 N 个客户端广播时会生成 N 份带不同 `likedByMe` 的 payload，或者广播 `likedByMe: false`（因为刚创建没人点过赞，所有接收者都应是 false）—— MVP 选后者简化实现。

---

### `comment.updated`

由 `PUT /comments/:id` 成功后触发。

```ts
interface CommentUpdatedData {
  comment: Comment;  // 更新后的完整状态
}
```

> 注意与 `comment.dragging` 的区别：**`updated` 是已持久化的最终状态，`dragging` 是拖动过程中的临时帧，不入库**。客户端对这两种事件应分别处理：
> - 收到 `dragging`：只更新 UI 上卡片的 `transform`，不写入 TanStack Query 缓存。
> - 收到 `updated`：写入缓存 + 覆盖 UI。

---

### `comment.deleted`

```ts
interface CommentDeletedData {
  id: number;
}
```

客户端收到后：从列表缓存移除，同时清理可能残留的 `dragging` 中间态。

---

### `comment.liked`

```ts
interface CommentLikedData {
  commentId: number;
  likeCount: number;
  actorId: number;      // 操作者 userId
  liked: boolean;       // true = 点赞；false = 取消点赞
}
```

- **接收者本人是 `actorId`** 时：把自己缓存里对应 `comment.likedByMe` 更新为 `liked`。
- **不是 actor** 时：只更新 `likeCount`，不改 `likedByMe`。

> 服务端不单独为每个接收者算 `likedByMe`，由客户端依据 `actorId` 判断，省一次 per-socket 序列化。

---

### `comment.dragging`

**拖动过程中的广播**。由 `comment.drag`（C→S）驱动，服务端校验后原样转发给**除发送者以外**的所有客户端。

```ts
interface CommentDraggingData {
  id: number;           // 被拖的卡片
  x: number;
  y: number;
  rotation?: number;    // 可选，允许拖动时顺便改
  actorId: number;      // 谁在拖，用于前端显示「XXX 正在移动」之类
}
```

**不入库、不触发 `updated`**。拖动结束时客户端必须再发一个 HTTP `PUT /comments/:id` 持久化最终位置，服务端据此广播 `comment.updated`。

---

### `error`

```ts
interface ErrorData {
  code: string;     // 机器可读，见下
  message: string;  // 人类可读
  echo?: unknown;   // 原始消息（可选，便于调试）
}
```

| `code` | 触发条件 |
|---|---|
| `bad_envelope` | 非 JSON / 缺 `type` / `data` |
| `unknown_type` | 服务端故意下发（极少）或忽略（一般情况） |
| `forbidden` | 越权操作（如拖别人的卡） |
| `not_found` | 引用的资源（如 commentId）不存在 |
| `rate_limited` | 当前帧被限流，已丢弃 |
| `invalid_payload` | 字段类型 / 范围非法 |

---

## C→S 事件

### `comment.drag`

作者在拖动自己的卡片时，以高频上报中间坐标（建议 30–60 Hz，超出会被限流）。

```ts
interface CommentDragData {
  id: number;
  x: number;          // 画板坐标，范围同 Comment
  y: number;
  rotation?: number;
}
```

**服务端校验**：
- 必须已登录；匿名发 → `error { code: "forbidden" }`。
- `id` 必须存在且 `author.id === userId`，否则 `error { code: "forbidden" }`。
- `x/y/rotation` 范围校验同 HTTP 接口；非法 → `error { code: "invalid_payload" }`。
- **限流**：单连接 `> 120 帧/秒` 触发 `rate_limited`，超出部分丢弃。连续 3 秒超限 → close `4429`。

**广播**：原样转发为 `comment.dragging`，**不发给发送者本人**。

> 为什么不让客户端直接 `PUT /comments/:id` 做拖动？—— HTTP 来回延迟 + 每帧写库会把 SQLite 打满。拖动走 WS 只广播、不落盘；拖完再一次 PUT 持久化。

---

### `ping` / `pong`（应用层心跳，可选）

```json
// C→S
{ "type": "ping", "data": {} }

// S→C
{ "type": "pong", "data": {} }
```

只有在部署环境会吞掉 WS ping 帧（某些 HTTP/2 代理）时才需要。默认由浏览器的 WS ping/pong 控制帧处理。

---

## HTTP 写入 → WS 广播 对照表

所有来自 HTTP 的写操作都应由**后端在事务提交后**触发一次对应广播：

| HTTP | 成功条件 | 触发事件 | 广播范围 |
|---|---|---|---|
| `POST /comments` | `201` | `comment.created` | 全体（含匿名） |
| `PUT /comments/:id` | `200` | `comment.updated` | 全体 |
| `DELETE /comments/:id` | `204` | `comment.deleted` | 全体 |
| `POST /comments/:id/like` | `200` | `comment.liked` (liked=true) | 全体 |
| `DELETE /comments/:id/like` | `200` | `comment.liked` (liked=false) | 全体 |
| `POST /auth/login` / 新 WS 连接 | — | `presence.joined` | 全体 |
| WS 断开（最后一个连接） | — | `presence.left` | 全体 |

> **原子性要求**：事务提交失败时**禁止**广播；广播失败（网络抖动）不影响 HTTP 响应。两者是 best-effort 最终一致。

---

## 前端封装参考

### 连接管理

```ts
// src/lib/realtime/socket.ts
import { authToken } from "@/lib/api/auth-token";

type Handler = (evt: { type: string; data: any; ts?: string }) => void;

export class RealtimeSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<Handler>();
  private backoff = 1000;

  connect() {
    const base = (import.meta.env.VITE_API_BASE ?? "http://localhost:3000")
      .replace(/^http/, "ws");
    const token = authToken.get();
    const url = token ? `${base}/ws?token=${encodeURIComponent(token)}` : `${base}/ws`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => { this.backoff = 1000; };
    this.ws.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data);
        this.listeners.forEach((h) => h(evt));
      } catch {}
    };
    this.ws.onclose = (e) => {
      if (e.code === 4401) authToken.clear();       // 过期 token
      if (e.code === 4400) return;                   // 格式 bug，不重连
      setTimeout(() => this.connect(), this.backoff);
      this.backoff = Math.min(this.backoff * 2, 30_000);
    };
  }

  send<T>(type: string, data: T) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  on(h: Handler) { this.listeners.add(h); return () => this.listeners.delete(h); }
}

export const socket = new RealtimeSocket();
```

### 与 TanStack Query 融合（示例）

```ts
socket.on((evt) => {
  switch (evt.type) {
    case "comment.created":
      queryClient.setQueryData<Paginated<Comment>>(["comments"], (prev) =>
        prev ? { ...prev, total: prev.total + 1, items: [evt.data.comment, ...prev.items] } : prev,
      );
      break;

    case "comment.updated":
      queryClient.setQueryData<Paginated<Comment>>(["comments"], (prev) =>
        prev ? { ...prev, items: prev.items.map((c) => c.id === evt.data.comment.id ? evt.data.comment : c) } : prev,
      );
      break;

    case "comment.deleted":
      queryClient.setQueryData<Paginated<Comment>>(["comments"], (prev) =>
        prev ? { ...prev, total: prev.total - 1, items: prev.items.filter((c) => c.id !== evt.data.id) } : prev,
      );
      break;

    case "comment.liked": {
      const { commentId, likeCount, actorId, liked } = evt.data;
      const me = queryClient.getQueryData<User>(["auth", "me"]);
      queryClient.setQueryData<Paginated<Comment>>(["comments"], (prev) =>
        prev ? {
          ...prev,
          items: prev.items.map((c) =>
            c.id === commentId
              ? { ...c, likeCount, likedByMe: me?.id === actorId ? liked : c.likedByMe }
              : c,
          ),
        } : prev,
      );
      break;
    }

    case "comment.dragging":
      // 写到一个独立的 zustand store，让渲染层叠在卡片上，不污染 react-query 缓存
      useDragStore.getState().apply(evt.data);
      break;

    case "presence.sync":
    case "presence.joined":
    case "presence.left":
      usePresenceStore.getState().apply(evt);
      break;
  }
});
```

### 拖动节流

```ts
// 拖动中，节流到 ~60Hz 发送
const throttled = throttle((id: number, x: number, y: number) => {
  socket.send("comment.drag", { id, x, y });
}, 1000 / 60);

onPointerMove(({ id, x, y }) => throttled(id, x, y));

// 拖动结束
onPointerUp(({ id, x, y }) => {
  commentsApi.update(id, { x, y }); // 落盘 → 后端广播 comment.updated
});
```

### 断线后的一致性策略

重连 `onopen` 时：
1. 服务端会再发 `hello` + `presence.sync`，客户端据此重建 presence。
2. 客户端**主动** `queryClient.invalidateQueries({ queryKey: ["comments"] })` 重拉全量列表，覆盖掉断线期间可能丢失的 `comment.*` 事件 —— MVP 用粗粒度对账，避免基于事件 id 做增量同步的复杂实现。

---

## 联调 checklist

- [ ] 带合法 token 连接后 200ms 内收到 `hello` + `presence.sync`。
- [ ] 不带 token 连接成功，收到 `hello`（`userId: null`），能收到 `comment.*` 广播。
- [ ] 带过期 token 连接 → close `4401`；客户端清 token 后匿名重连成功。
- [ ] A 在一个浏览器登录，B 在另一个登录：B 登录瞬间 A 收到 `presence.joined`；B 关闭浏览器瞬间 A 收到 `presence.left`。
- [ ] B 开三个标签页再全部关闭，A 只收到一次 `joined` 和一次 `left`。
- [ ] B 新建卡片 → A 收到 `comment.created` 且 `likedByMe = false`。
- [ ] B 拖动自己的卡片 → A 屏幕上看到实时位置；B 松手后 A 收到 `comment.updated`（最终位置与拖动帧一致）。
- [ ] B 尝试 WS 上报拖动 A 的卡 → 收到 `error { code: "forbidden" }`，A 端无变化。
- [ ] A 点赞 B 的卡 → A 自己的 `likedByMe` 变 `true`，`likeCount` +1；其他观察者只看到 `likeCount` +1。
- [ ] A 给自己的卡发 `comment.drag` 发 200 帧/秒 → 触发 `rate_limited`，部分帧被丢弃但连接不断。
- [ ] 断线重连后 presence 和 comments 都恢复正确，没有残留幽灵用户或幽灵拖动。
