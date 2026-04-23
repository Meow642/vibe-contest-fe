# AGENTS.md

本文件为任意 AI 编码代理（Claude、Codex、Cursor、Copilot 等）在本仓库工作时提供指引。所有代理在修改代码前**必须**先阅读本文。

## 命令

- `npm run dev` — 启动 Vite 开发服务器（HMR）。
- `npm run build` — 先类型检查（`tsc -b`）再产出生产包。**交付前必须通过**，TS 步骤不可跳过。
- `npm run lint` — 全仓跑 ESLint。
- `npm run preview` — 本地预览生产包。

暂未配置测试运行器。

## 技术栈

Vibe Contest 前端：**Vite 8 + React 19 + TypeScript + React Router v7 + Tailwind CSS v4 + shadcn/ui + TanStack Query + Axios + zustand**，对接独立的 Express 后端（见 [api_docs/API.md](api_docs/API.md)）。

## 硬性规则

在本项目中工作时，下列规则**不可违反**：

1. **路径别名**：一律用 `@/…`（`@/*` → `src/*`），**不要**写相对路径 `../../…`。
2. **路由**：用 `react-router` v7 的 `createBrowserRouter`，**禁用** Data APIs（`loader` / `action` / `useLoaderData` / `useActionData` 等）。数据拉取全部交给 TanStack Query。
3. **请求**：所有 HTTP 请求一律走 **TanStack Query + axios**，并通过 [src/lib/api/](src/lib/api/) 中的封装发起。**不要**直接 `import axios from "axios"`，也**不要**用 `fetch`。
4. **shadcn/ui**：所有组件已预装在 [src/components/ui/](src/components/ui/)，直接 `import` 使用，**不要**再跑 shadcn CLI 添加；**不要**重复造轮子写相同语义的组件。
5. **Tailwind v4**：没有 `tailwind.config.js`，配置写在 [src/index.css](src/index.css) 的 `@theme` 块里。新增设计 token 请扩展那个 `@theme`，**不要**另建配置文件。
6. **TypeScript 严格约束**：遵守下文「TypeScript 注意」一节的规则，否则 `npm run build` 会失败。
7. **文档/注释**：除非用户明确要求，**不要**主动创建 README 或文档文件，也不要写解释「做了什么」的废注释（代码自述）。

## 架构

- **入口**：[src/main.tsx](src/main.tsx) 在全局 `QueryClientProvider` + `TooltipProvider` 内挂载 `<App />`，并渲染全局 `<Toaster />`（sonner）。新增全局 Provider（主题、路由等）放这里，**不要**塞进 `App`。
- **样式**：Tailwind CSS v4 通过 `@tailwindcss/vite` 接入。全局 token、`shadcn/tailwind.css` 引入、`dark` 自定义 variant、`@theme inline` CSS 变量绑定都集中在 [src/index.css](src/index.css)。
- **UI 组件**：shadcn 组件位于 [src/components/ui/](src/components/ui/)，配置见 [components.json](components.json)（`style: radix-nova`、`baseColor: neutral`、图标库 `lucide`）。
- **基础 Primitive**：同时装了 `radix-ui` 和 `@base-ui/react`；**现有 UI 基于 Radix**，扩展时保持一致。变体样式用 `class-variance-authority` + [src/lib/utils.ts](src/lib/utils.ts) 里的 `cn()`。
- **客户端状态**：`zustand`（server state 归 TanStack Query，**只有 client state 才用 zustand**）。

## 数据层（API 调用）

API 封装集中在 [src/lib/api/](src/lib/api/)，业务层统一 `from "@/lib/api"`：

| 文件 | 作用 |
|---|---|
| [client.ts](src/lib/api/client.ts) | `api`（axios 实例，含请求/响应拦截器）+ `http.{get,post,put,patch,delete}` 薄封装：自动解包 `res.data`，`204` → `null` |
| [types.ts](src/lib/api/types.ts) | `Paginated<T>`、`ApiErrorBody`、`ApiError` 类 |
| [query-client.ts](src/lib/api/query-client.ts) | 全局 `queryClient`：`staleTime 30s`、关 `refetchOnWindowFocus`、4xx 不重试、mutation 不重试 |
| [time.ts](src/lib/api/time.ts) | `parseServerTime` 处理后端 `YYYY-MM-DD HH:mm:ss`（UTC 空格分隔、非 ISO 8601） |
| [index.ts](src/lib/api/index.ts) | 桶导出 |

**业务层优先用 `http.*` 而不是裸 `api.*`**（`http.*` 的返回值是 `T`，不用再 `.data`）。

后端约定（详见 [api_docs/API.md](api_docs/API.md)）：

- 开发环境 `baseURL`：`http://localhost:3000`（可通过 `VITE_API_BASE` 覆盖）。
- 错误响应统一结构：`{ error: string }`，拦截器会包成 `ApiError`（含 `status` / `message` / `raw`）抛出。
- 列表接口统一返回 `Paginated<T>`：`{ total, limit, offset, items }`。
- `DELETE` 成功 `204`，无 body（`http.delete` 已处理为 `null`）。
- 时间字段是 UTC 空格格式，不是 ISO 8601 —— 前端展示请用 `parseServerTime`。

### 拦截器的默认行为

响应拦截器对以下错误已做全局处理，**业务层不要重复弹 toast**：

- `401 Unauthorized` — 预留跳转登录（当前占位）
- `403 Forbidden` — 全局 toast "没有权限执行该操作"
- `500 Internal Server Error` — 全局 toast "服务器开小差了"
- 无响应（网络错误、超时、CORS）— 全局 toast 显示错误消息

业务层只处理**业务相关**的分支，比如 `400`（字段校验）、`404`（资源不存在）。

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

### 推荐的模块组织

随业务增长，建议按领域拆分：

```
src/
  features/
    items/
      api.ts        # http.* 调用 + queryKey 常量
      queries.ts    # useXxxQuery / useXxxMutation 自定义 hook
      types.ts      # 领域类型
      components/
```

UI 组件只消费自定义 hook，**不要**在组件里直接写 `http.get`。

## TypeScript 注意

`tsconfig.app.json` 开启了 `verbatimModuleSyntax`、`noUnusedLocals`、`noUnusedParameters`、`erasableSyntaxOnly`。实际含义：

- 仅用于类型的 import 必须写 `import type { … }`。
- 不要留未使用的变量或参数 —— 会直接让 build 失败，不只是 lint 警告。
- 避免会产出运行时代码的 TS 特性（`enum`、参数属性、`namespace`）；优先用 `as const` 对象或普通 class。

## 代理工作流建议

1. 动手前先跑 `git status` 看当前改动，必要时读 [CLAUDE.md](CLAUDE.md) 或本文。
2. 改完一批后跑 `npm run build` + `npm run lint` 自检；**两者都必须通过**才算完成。
3. 不要主动创建 commit，除非用户明确要求。
4. 不要擅自改动 [vite.config.ts](vite.config.ts)、[tsconfig*.json](.)、[components.json](components.json)、[eslint.config.js](eslint.config.js) 等构建/工具配置，除非任务就是为此。
5. 新增依赖前先确认 [package.json](package.json) 里是否已有（`radix-ui` / `@base-ui/react` / `date-fns` / `sonner` / `cmdk` 等很多都装过了）。
