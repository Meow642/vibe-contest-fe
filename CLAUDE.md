# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在本仓库中工作时提供指引。

## 命令

- `npm run dev` — 启动 Vite 开发服务器（HMR）。
- `npm run build` — 先类型检查（`tsc -b`）再产出生产包。交付前必须通过，TS 步骤不可跳过。
- `npm run lint` — 全仓跑 ESLint。
- `npm run preview` — 本地预览生产包。

暂未配置测试运行器。

## 语言

始终使用中文回复用户。

## 技术栈

Vibe Contest 前端：**Vite 8 + React 19 + TypeScript + React Router v7 + Tailwind CSS v4 + shadcn/ui + TanStack Query + Axios + zustand**，对接独立的 Express 后端（见 [api_docs/API.md](api_docs/API.md)）。

## 架构

- **入口**：[src/main.tsx](src/main.tsx) 在全局 `QueryClientProvider` + `TooltipProvider` 内挂载 `<App />`，并渲染全局 `<Toaster />`（sonner）。新增全局 Provider（主题、路由等）放这里，不要塞进 `App`。
- **路径别名**：`@/*` → `src/*`，在 [vite.config.ts](vite.config.ts) 和 [tsconfig.app.json](tsconfig.app.json) 都配了。**一律用 `@/…`，不要相对路径。**
- **样式**：Tailwind CSS v4，通过 `@tailwindcss/vite` 接入（**没有 `tailwind.config.js`**，配置写在 CSS 里）。全局 token、`shadcn/tailwind.css` 引入、`dark` 自定义 variant、`@theme inline` CSS 变量绑定都集中在 [src/index.css](src/index.css)。新增设计 token 请扩展那个 `@theme` 块，**不要**另建 Tailwind 配置文件。
- **UI 组件**：shadcn 组件位于 [src/components/ui](src/components/ui/)，配置见 [components.json](components.json)（`style: radix-nova`、`baseColor: neutral`、图标库 `lucide`）。**shadcn/ui 的所有组件已经装好**，直接 `import` 使用即可，不需要再跑 shadcn CLI 添加。
- **基础 Primitive**：同时装了 `radix-ui` 和 `@base-ui/react`，现有 UI 基于 Radix，扩展时保持一致。变体样式用 `class-variance-authority` + [src/lib/utils.ts](src/lib/utils.ts) 里的 `cn()`。
- **路由**：用 `react-router` v7 的 **`createBrowserRouter`**，**不要**使用 React Router 的 Data APIs（`loader` / `action` / `useLoaderData` 等）。数据拉取统一交给 TanStack Query。`App.tsx` 目前还是空壳。
- **客户端状态**：`zustand`（server state 归 TanStack Query，client state 才用 zustand）。

## 数据层（API 调用）

**所有请求一律走 TanStack Query + axios**，并使用统一封装的拦截器。API 层集中在 [src/lib/api/](src/lib/api/)：

- [src/lib/api/client.ts](src/lib/api/client.ts) —
  - `api`：axios 实例（`baseURL` 来自 `VITE_API_BASE`，默认 `http://localhost:3000`；10s 超时；默认 `Content-Type: application/json`）。
  - 响应拦截器统一归一化错误为 `ApiError`；401/403/500/网络错误有默认 toast/占位处理。
  - `http.{get,post,put,patch,delete}` —— 在 axios 之上的薄封装，自动解包 `res.data`，并把 `204 No Content` 转成 `null`。**业务层优先用 `http.*` 而不是直接 `api.*`**。
- [src/lib/api/types.ts](src/lib/api/types.ts) — `Paginated<T>`（`{ total, limit, offset, items }`）、`ApiErrorBody`（`{ error: string }`）、`ApiError` 类（含 `status` / `raw`，业务层可 `instanceof` 判别）。
- [src/lib/api/query-client.ts](src/lib/api/query-client.ts) — 全局 `queryClient`：`staleTime 30s`、关 `refetchOnWindowFocus`、4xx 不重试、mutation 不重试。
- [src/lib/api/time.ts](src/lib/api/time.ts) — `parseServerTime(s)`：把后端 `YYYY-MM-DD HH:mm:ss`（UTC、空格分隔，**非 ISO 8601**）转成 `Date`。
- [src/lib/api/index.ts](src/lib/api/index.ts) — 桶导出，业务层统一 `from "@/lib/api"`。

后端约定（详见 [api_docs/API.md](api_docs/API.md)）：
- 所有错误响应结构一致：`{ error: string }`。
- 列表接口统一返回 `Paginated<T>`。
- `DELETE` 成功返回 `204`，无 body（`http.delete` 已处理，返回 `null`）。

### 使用示例

```ts
import { useQuery, useMutation } from "@tanstack/react-query";
import { http, queryClient, type Paginated, ApiError } from "@/lib/api";

// 列表查询
const { data } = useQuery({
  queryKey: ["items", { limit: 20, offset: 0 }],
  queryFn: () =>
    http.get<Paginated<Item>>("/items", { params: { limit: 20, offset: 0 } }),
});

// 创建
const createItem = useMutation({
  mutationFn: (payload: { title: string }) => http.post<Item>("/items", payload),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
});

// 删除（204 → null）
await http.delete(`/items/${id}`);

// 业务层定制错误处理
try {
  await http.post("/items", payload);
} catch (e) {
  if (e instanceof ApiError && e.status === 400) {
    // 字段校验错误，e.message 已是后端返回的人类可读信息
  }
}
```

> 拦截器已处理通用错误 toast，业务层**不要**再对 401/403/500/网络错误重复弹提示，只处理业务相关分支（比如 400/404）。

## TypeScript 注意

`tsconfig.app.json` 开启了 `verbatimModuleSyntax`、`noUnusedLocals`、`noUnusedParameters`、`erasableSyntaxOnly`。实际含义：

- 仅用于类型的 import 必须写 `import type { … }`。
- 不要留未使用的变量或参数 —— 会直接让 build 失败，不只是 lint 警告。
- 避免会产出运行时代码的 TS 特性（`enum`、参数属性、`namespace`）；优先用 `as const` 对象或普通 class。
