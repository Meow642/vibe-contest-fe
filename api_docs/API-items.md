# Items API（测试接口）

> 一个通用的 CRUD 资源，用于前端联调验证：覆盖「增删改查 + 分页 + 过滤 + 模糊搜索 + 部分更新」。
>
> 通用约定（Base URL、错误格式、状态码等）见 [API.md](./API.md)，本文档只描述 Items 模块的独有部分。

---

## 资源模型

### 表结构（SQLite）

```sql
CREATE TABLE items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  content    TEXT    NOT NULL DEFAULT '',
  score      INTEGER NOT NULL DEFAULT 0,
  done       INTEGER NOT NULL DEFAULT 0,  -- 0/1 布尔
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

### 响应实体 `Item`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `number` (int) | 自增主键 |
| `title` | `string` | 标题，非空，POST 时会 `trim()` |
| `content` | `string` | 正文，允许空串，默认 `""` |
| `score` | `number` (int) | 整数分值，默认 `0`（可正可负） |
| `done` | `boolean` | 完成标记，默认 `false` |
| `createdAt` | `string` | UTC，格式 `"YYYY-MM-DD HH:mm:ss"` |
| `updatedAt` | `string` | 同上，PUT 成功时会刷新 |

### TypeScript 类型（前端直接复制）

```ts
export interface Item {
  id: number;
  title: string;
  content: string;
  score: number;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemPayload {
  title: string;     // 必填，非空
  content?: string;  // 默认 ""
  score?: number;    // 整数，默认 0
  done?: boolean;    // 默认 false
}

// PUT 是 partial：至少传 1 个字段；未传的字段保持原值
export type UpdateItemPayload = Partial<CreateItemPayload>;

export interface ItemListResponse {
  total: number;
  limit: number;
  offset: number;
  items: Item[];
}
```

---

## 1. 列表查询

**`GET /items`**

### Query 参数

| 参数 | 类型 | 默认 | 约束 | 说明 |
|---|---|---|---|---|
| `limit` | number | `20` | 1–100（超出自动夹取） | 分页条数 |
| `offset` | number | `0` | ≥0 | 偏移量 |
| `done` | `"true"` / `"false"` | — | 枚举 | 按完成状态过滤 |
| `q` | string | — | — | 在 `title` / `content` 上 `LIKE %q%` 模糊搜索 |

### 响应 `200`

```json
{
  "total": 2,
  "limit": 20,
  "offset": 0,
  "items": [
    {
      "id": 2,
      "title": "买咖啡",
      "content": "",
      "score": 0,
      "done": true,
      "createdAt": "2026-04-22 23:12:16",
      "updatedAt": "2026-04-22 23:12:16"
    },
    {
      "id": 1,
      "title": "写需求",
      "content": "梳理 MVP",
      "score": 3,
      "done": false,
      "createdAt": "2026-04-22 23:12:16",
      "updatedAt": "2026-04-22 23:12:16"
    }
  ]
}
```

> 排序：`created_at DESC, id DESC`（最新在前）。

### 错误

| 状态码 | error | 触发条件 |
|---|---|---|
| `400` | `done must be "true" or "false"` | `done` 传了其他值 |

### 示例

```bash
# 基础
curl http://localhost:3000/items

# 分页 + 过滤 + 搜索
curl "http://localhost:3000/items?limit=10&offset=0&done=false&q=咖啡"
```

---

## 2. 获取单条

**`GET /items/:id`**

### 路径参数

- `id` — 正整数

### 响应 `200`：返回 `Item`

### 错误

| 状态码 | error |
|---|---|
| `400` | `id must be a positive integer` |
| `404` | `Item not found` |

### 示例

```bash
curl http://localhost:3000/items/1
```

---

## 3. 创建

**`POST /items`**

### 请求体（`CreateItemPayload`）

```json
{
  "title": "写需求",
  "content": "梳理 MVP",
  "score": 3,
  "done": false
}
```

- `title` 必填，非空字符串（传入会被 `trim`）。
- 其他字段可省略，走默认值。

### 响应 `201`：返回新建的 `Item`（含 `id`、时间戳）

### 错误

| 状态码 | error | 触发条件 |
|---|---|---|
| `400` | `title is required and must be a non-empty string` | 未传 / 空串 / 非 string |
| `400` | `content must be a string` | 传了非 string |
| `400` | `score must be an integer` | 非整数（含小数、NaN） |
| `400` | `done must be a boolean` | 非 `true`/`false` |

### 示例

```bash
curl -X POST http://localhost:3000/items \
  -H "Content-Type: application/json" \
  -d '{"title":"写需求","content":"梳理 MVP","score":3}'
```

---

## 4. 部分更新

**`PUT /items/:id`**

> **语义是 PATCH 风格的 partial update**：请求体中出现哪些字段就改哪些，未出现的字段保留原值。成功后 `updatedAt` 会刷新。

### 路径参数

- `id` — 正整数

### 请求体（`UpdateItemPayload`，至少一个字段）

```json
{ "done": true, "score": 9 }
```

### 响应 `200`：返回更新后的完整 `Item`

### 错误

| 状态码 | error | 触发条件 |
|---|---|---|
| `400` | `id must be a positive integer` | 路径参数非法 |
| `400` | `no updatable fields provided` | body 为空 / 没有任何可识别字段 |
| `400` | 同「创建」 | 单字段类型错误 |
| `404` | `Item not found` | id 不存在 |

### 示例

```bash
# 标记完成
curl -X PUT http://localhost:3000/items/1 \
  -H "Content-Type: application/json" \
  -d '{"done":true}'

# 同时改多个字段
curl -X PUT http://localhost:3000/items/1 \
  -H "Content-Type: application/json" \
  -d '{"score":9,"content":"已完成"}'
```

---

## 5. 删除

**`DELETE /items/:id`**

### 路径参数

- `id` — 正整数

### 响应 `204 No Content`（**无 body**）

### 错误

| 状态码 | error |
|---|---|
| `400` | `id must be a positive integer` |
| `404` | `Item not found` |

### 示例

```bash
curl -X DELETE http://localhost:3000/items/5 -i
```

---

## 前端封装参考（axios）

基于 [API.md](./API.md) 里的 `api` 实例（已在响应拦截器里把 204 转为 `null`、把错误归一化）：

```ts
export const itemsApi = {
  list: (params: {
    limit?: number;
    offset?: number;
    done?: boolean;
    q?: string;
  } = {}) =>
    api.get<ItemListResponse>('/items', {
      params: {
        ...params,
        // axios 会把 boolean 序列化成 "true"/"false"，正合后端预期
      },
    }),

  get: (id: number) => api.get<Item>(`/items/${id}`),

  create: (payload: CreateItemPayload) =>
    api.post<Item>('/items', payload),

  update: (id: number, payload: UpdateItemPayload) =>
    api.put<Item>(`/items/${id}`, payload),

  remove: (id: number) => api.delete<void>(`/items/${id}`),
};
```

---

## 联调 checklist（前端自测项）

- [ ] `GET /items` 能拿到列表，字段名与文档一致（驼峰：`createdAt`、`updatedAt`）。
- [ ] 新建后列表首位应是刚建的那条（按 `createdAt DESC` 排序）。
- [ ] `PUT` 只传一个字段时，其他字段保持原值；`updatedAt` 变了。
- [ ] `DELETE` 返回 `204`，拦截器应吞掉空 body，不会在 `JSON.parse` 处报错。
- [ ] 故意传错参数（如 `score: "abc"`）时，UI 能展示 `error` 字段的消息。
- [ ] `q` 搜索支持中文（URL 编码后传）。
