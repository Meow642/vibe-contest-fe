# 前端开发补充说明

> 除了 [API.md](./API.md) / [API-auth.md](./API-auth.md) / [API-comments.md](./API-comments.md) / [API-realtime.md](./API-realtime.md) 之外，前端还需要知道的东西。读完这份就可以直接干活。
>
> 这份文档约束的是**前端内部契约**（坐标系、尺寸、交互、状态存储的选型）。后端不需要关心大多数内容，但画板坐标系和字段命名是前后端共享的硬约束。

---

## 1. 画板坐标系与视口映射（硬约束）

后端存的是**逻辑坐标**：`x ∈ [0, 4000]`，`y ∈ [0, 3000]`（宽高比 4:3）。前端职责是把用户视口映射到这个坐标系。

**映射规则（定稿）**：

- 画板容器使用 **contain 模式**：保留 4:3 比例，在可用空间内居中，两侧留白。
- 视口的画板实际尺寸 `viewW × viewH` 由 CSS 计算得出（见下文布局），不做 pan/zoom（MVP 不支持缩放平移，后续再扩展，坐标范围保留扩展空间）。
- 映射函数：

  ```ts
  // src/features/board/coords.ts
  export const LOGICAL_W = 4000;
  export const LOGICAL_H = 3000;

  export interface Viewport { width: number; height: number; }

  // 屏幕 (clientX 相对画板容器左上角) → 逻辑坐标
  export const toLogical = (clientX: number, clientY: number, vp: Viewport) => ({
    x: (clientX / vp.width) * LOGICAL_W,
    y: (clientY / vp.height) * LOGICAL_H,
  });

  // 逻辑坐标 → 屏幕像素
  export const toScreen = (x: number, y: number, vp: Viewport) => ({
    left: (x / LOGICAL_W) * vp.width,
    top:  (y / LOGICAL_H) * vp.height,
  });
  ```

- **卡片定位锚点是卡片中心**，不是左上角。即 `left = toScreen(x).left - cardW/2`。
- 创建卡片时，用户点击画板的坐标就是卡片的 `(x, y)`；拖动时 `(x, y)` 跟随指针。
- 点击若落在**已有卡片上**，视为打开/操作那张卡片，不创建新卡片。

> 为什么不用百分比存：百分比依赖客户端视口，多端观感会漂；逻辑坐标让「B 看到 A 的卡片在画板 1/3 处」这件事所有人一致。

---

## 2. 便签卡片视觉规格

| 项 | 值 |
|---|---|
| 卡片宽 | `180px`（屏幕像素，不随画板缩放） |
| 卡片最小高 | `140px`，内容多时自动撑开到 `max-height: 220px`，超出省略 |
| 卡片内边距 | `12px 14px` |
| 圆角 | `8px` |
| 阴影 | `0 4px 12px rgba(0,0,0,.08)` |
| 胶带装饰 | 顶部斜贴一条 40×14 的彩色小块（见 Figma）—— CSS `::before` 伪元素实现 |
| 作者头像 | `24px`，圆形，底部左 |
| 作者署名 | 头像右侧，`font-size: 12px`，色 `var(--muted-foreground)` |
| 时间 | 署名下方，`font-size: 11px`，色 `var(--muted-foreground)` |
| 点赞 icon | 底部右，`14px` 心形；未赞线框色 `var(--muted-foreground)`，已赞填充 `#ef4444` |
| 点赞数 | icon 右侧 `4px`，`font-size: 12px` |

> 卡片宽高**不**参与画板坐标计算 —— 就是屏幕像素，多设备一致。画板缩放只影响 `(x, y)` 的映射系数，卡片本身大小不变。

---

## 3. 颜色与旋转角的分配策略（前端职责）

后端只存前端给的值，所以规则定在前端：

- **`color`**：**创建时前端随机挑一个**，从 `["pink", "yellow", "green", "blue", "purple", "orange"]` 等概率。**作者之后不能改色**（编辑卡片只能改文字、位置）。在 UI 上不暴露选色器。
- **`rotation`**：**创建时前端从 `[-6, 6]` 均匀随机**（度），保留一位小数。拖动过程中不改旋转角。后续也不暴露给用户旋转交互。

```ts
// src/features/board/sticker-style.ts
const COLORS = ["pink","yellow","green","blue","purple","orange"] as const;
export const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];
export const randomRotation = () => Math.round((Math.random() * 12 - 6) * 10) / 10;
```

颜色 → Tailwind class 映射（在 `src/index.css` 的 `@theme` 里加 CSS 变量）：

```css
@theme inline {
  --sticker-pink:   #fbcfe8;
  --sticker-yellow: #fef3c7;
  --sticker-green:  #d1fae5;
  --sticker-blue:   #dbeafe;
  --sticker-purple: #e9d5ff;
  --sticker-orange: #fed7aa;
}
```

卡片渲染时通过 `data-color` 选变量，避免写死 6 份 class。

---

## 4. 头像默认值

注册不传 `avatarUrl` → 后端存空串。前端拿到空串时**不要发空 `<img>`**，渲染规则：

```tsx
// src/components/Avatar.tsx
// 空串 → 用 displayName 首字符 + 背景色（按 userId hash 出 6 色之一）
const BG = ["#f87171","#fbbf24","#34d399","#60a5fa","#a78bfa","#f472b6"];
const pickBg = (id: number) => BG[id % BG.length];
```

侧边栏在线用户头像、卡片署名头像统一用这个组件，**不要各写各的**。

---

## 5. 编辑与工具条交互（定稿）

### 画板底部工具条（对应 Figma 三个圆形按钮）

**重要**：工具条只有**两个互斥模式**（指针 / 拖动），`➕` 是**一次性动作**不是模式。点赞是**卡片级交互**，任何模式下都可用，不归工具条管。

| 按钮 | 类型 | 交互 |
|---|---|---|
| `➕` | 一次性动作 | 点击立即弹出「发表新想法」富文本弹窗；提交后卡片落在**画板视口中心 + 随机小偏移**（±200 逻辑坐标），避免新卡片互相堆叠 |
| `▷` | **pointer 模式**（默认） | 可点击卡片心形图标点赞/取消点赞；无法拖动任何卡片 |
| `👆` | **drag 模式** | 可拖动**本人**卡片；拖动别人的卡片无反应；此模式下仍可点击心形点赞 |

**互斥**：`▷` / `👆` 两个模式按钮同时只有一个激活。默认 = `pointer`。`➕` 是独立按钮，不参与互斥。

**未登录时**：`➕` 和 `👆` 禁用；`▷` 可选中但**心形点赞按钮也一并禁用**（未登录不能点赞）。画板本身仍可阅读。

### 每张卡片上的点赞交互

- 每张卡片右下角有心形图标 + 点赞数，**始终显示**（含未登录态，只是点击无效）。
- **登录态 + 非本人卡片**：心形可点击 —— `likedByMe=false` 时点击 → `POST /comments/:id/like`；`likedByMe=true` 时点击 → `DELETE /comments/:id/like`。乐观更新见第 10 节。
- **本人卡片**：心形**仅显示不响应点击**（光标不变手型，hover 不高亮），后端会 `403 cannot like your own comment`，但前端不应放行请求。
- **未登录**：心形灰度显示，点击可以弹一次「登录后才能点赞」的 toast，但**不要**自动打开登录 modal（打断感太强）。

### 编辑现有卡片

- 双击自己的卡片 → 进入编辑弹窗（复用「发表新想法」组件，`initialContent` 预填）。
- 编辑提交调 `PUT /comments/:id { content }`。
- 双击别人的卡片 → 无反应。

### 富文本弹窗

- 标题：新建时「发表新想法」，编辑时「编辑想法」。
- 工具条：B / I / U / S / 无序列表 / 有序列表（对应后端白名单）。
- 提交按钮：新建「马上发表」，编辑「保存修改」。
- ESC 关闭弹窗放弃未提交内容；点击遮罩不关闭（防误触）。

---

## 6. 富文本编辑器选型

**用 Tiptap**（`@tiptap/react` + `@tiptap/starter-kit`）。理由：

- StarterKit 自带的扩展（`Bold / Italic / Strike / BulletList / OrderedList`）正好覆盖白名单。
- `editor.getHTML()` 输出的就是白名单标签，不需要额外转换。
- 禁用 `Heading / CodeBlock / Blockquote / Link` 等扩展，让输出保持在后端白名单内。

显式配置示例：

```ts
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
      code: false,
    }),
    Underline,
  ],
  content: initialContent ?? "",
});
```

**不要**给 editor 注入自定义 HTML 扩展，一切能输出白名单外标签的扩展都关掉。提交前在客户端也跑一遍纯文本长度校验（1–2000 字），省一次请求。

---

## 7. 在线用户列表

左侧栏最多显示 **10 个头像**，超出折叠成「`+N`」chip（点击展开一个 Popover 显示全部）。顺序与 `presence.sync` 一致（后端按 `displayName` 升序）。

在线指示点（右下角绿色小圆）永远显示 —— 列表里的都是在线用户，不需要离线态。

**当前用户自己也显示在列表里**，排序规则不变（靠名字而非"我在最上"）。

---

## 8. 登录 / 注册流程

Figma 给了两个弹窗：登录、注册，均挂在画板上层（画板背景仍可见，带半透明遮罩）。

**路由结构建议**（只开两个路由）：

```
/            → 画板主页（未登录/已登录共用）
/*           → 兜底 404 → redirect /
```

登录/注册不用独立路由，用 modal state 管理：

```ts
// src/stores/auth-ui.ts (zustand)
interface AuthUIState {
  modal: "none" | "login" | "register";
  open: (m: "login" | "register") => void;
  close: () => void;
}
```

顶部右上角两个按钮「注册 / 登录」触发对应 modal。

### 自动登录（对应 Figma「自动登录」复选框）

- 复选框控制的是**是否在本地保存 token**，不是服务端记住我。
- 勾选 → 存 `localStorage`。不勾选 → 存 `sessionStorage`（关浏览器即失效）。
- 两处 key 相同：`vc.token`。读取时先查 `localStorage`，没有再查 `sessionStorage`。

### App 启动顺序

1. 读 token → 无 token：直接渲染画板（匿名态）+ 建立匿名 WS 连接。
2. 有 token：
   - 先调 `GET /auth/me`；
   - `200` → 存用户信息到 zustand，然后建立带 token 的 WS；
   - `401` → 清 token，降级为匿名态。

**不要在 `/auth/me` 返回前 block 画板渲染** —— 画板数据是公共的，先拉 `GET /comments` 渲染出来，`/auth/me` 独立跑；两者都好了再显示工具条。

---

## 9. 状态存储分工

| 状态 | 归属 | 备注 |
|---|---|---|
| 评论列表 | TanStack Query `["comments"]` | 由 HTTP 初始拉取 + WS 事件合并 |
| 当前用户 | TanStack Query `["auth", "me"]` | 登录/登出时显式 setQueryData |
| 在线用户 | zustand `usePresenceStore` | 由 WS `presence.*` 维护 |
| 拖动中的临时位置 | zustand `useDragStore` | 由 WS `comment.dragging` 维护，**不要**写进 query cache |
| 工具条模式 | zustand `useBoardModeStore` | `"pointer" \| "drag"`，默认 `"pointer"` |
| 登录/注册 modal 开关 | zustand `useAuthUIStore` | |
| 富文本编辑 modal | zustand `useEditorStore` | `{ open: boolean, editingId: number \| null }` |

**原则**：server state 归 Query，其他 client-only 的瞬时状态归 zustand。不要把 presence 塞进 TanStack Query（它没有对应的 HTTP 查询）。

---

## 10. 乐观更新与冲突处理

### 创建卡片

不做乐观更新。`POST` 返回 `201` 后由 WS `comment.created` 统一推入缓存（服务端会广播给发起者自己）。

> 为什么：新建卡片的 `id` 由服务端分配，乐观插入需要临时 id → 收到 WS 后再替换，复杂度不值。

### 拖动

- 拖动过程中**本地直接改 DOM transform**（不走 query cache，也不走 WS dragging store，本人拖自己的卡片属于自己的 UI state）。
- 每 16ms（≈60Hz）通过 `socket.send("comment.drag", ...)` 发给服务端（节流）。
- `pointerup` 时调 `PUT /comments/:id { x, y }` 持久化。
- `PUT` 成功 → WS 会广播 `comment.updated` → query cache 被更新 → 本地 transform 卸载，交给 cache 渲染。
- **中途 `PUT` 失败**：toast 报错，把卡片位置回滚到拖动前的 `(x, y)`（需要在 `pointerdown` 时快照）。

### 点赞

做乐观更新。点击瞬间改 cache 里的 `likedByMe` 和 `likeCount`，失败回滚。后端 WS 广播到时以服务端为准覆盖。

### 编辑内容

不做乐观更新。弹窗关闭后等 `PUT` 返回，`comment.updated` 广播到时 cache 自动刷。

---

## 11. 错误 UI 约定

- 全局错误 toast 由 axios 拦截器统一弹（见 `src/lib/api/client.ts`），业务层**不重复弹** `401/403/500/网络错误`。
- 业务需要自定义提示的只有：
  - 登录失败 `401 invalid username or password` → 在登录框内红字「账号密码错误」（对应 Figma）。
  - 注册冲突 `409 username already exists` → 在注册框内红字「该账号已存在」。
  - 富文本空内容 `400 content is required...` → 编辑器下方红字。

这三处用 `try/catch (e) { if (e instanceof ApiError) ... }`，**不要**让拦截器的全局 toast 也弹一次；需要在错误归一化时加个 `e.handled = true` 标记或用独立的错误路径。简单做法：登录/注册接口调用前临时关拦截器的 toast（给 `http.post` 加 `{ silent: true }` 选项）。

---

## 12. Toast 组件

项目已装 `sonner`，全局 `<Toaster />` 在 `src/main.tsx` 挂了。

- 成功绿 toast：`toast.success("登录成功")`
- 失败红 toast：`toast.error(message)`
- **位置**：右上角（对应 Figma 登录/登出成功提示）。配置一次在 `main.tsx` 里 `<Toaster position="top-right" richColors />`。

---

## 13. 组件目录结构建议

```
src/
  components/
    ui/              # shadcn 原子组件，已就位
    Avatar.tsx       # 头像（空串回退首字母色块）
  features/
    auth/
      LoginModal.tsx
      RegisterModal.tsx
      useAuth.ts        # me / login / register / logout 的 hooks
    board/
      Board.tsx         # 画板容器 + 坐标映射
      Sticker.tsx       # 单张卡片
      StickerEditor.tsx # 富文本弹窗（新建 & 编辑复用）
      Toolbar.tsx       # 底部三按钮
      coords.ts
      sticker-style.ts
      drag-controller.ts
    presence/
      Sidebar.tsx       # 左侧在线用户栏
  stores/
    auth-ui.ts
    presence.ts
    drag.ts
    board-mode.ts
    editor.ts
  lib/
    api/               # 已就位
    realtime/
      socket.ts        # 文档里给的 RealtimeSocket
      bindings.ts      # WS 事件 → TanStack Query / zustand 的映射
    auth-token.ts
  routes/
    index.tsx          # /
  App.tsx
  main.tsx
```

路径一律 `@/...`，不用相对路径（CLAUDE.md 硬性要求）。

---

## 14. 开发自检清单

**登录闭环**
- [ ] 注册 → 自动登录 → 看到工具条和左侧在线栏（有自己）。
- [ ] 刷新页面 → 仍在登录态（「自动登录」勾选场景）。
- [ ] 登出 → 工具条消失，侧边栏消失，画板仍可读。

**画板闭环**
- [ ] 点击空白处 → 弹编辑器 → 提交 → 卡片出现在点击位置附近（居中锚点）。
- [ ] A 新建，B 不刷新就能看到。
- [ ] A 拖动自己的卡片，B 端实时跟随；A 松手后 B 端位置与 A 完全一致。
- [ ] A 点赞 B 的卡，数字同步；A 不能给自己点赞（UI 直接不响应）。
- [ ] A 编辑自己的卡 → B 端内容同步。
- [ ] A 删除自己的卡 → B 端卡片消失。
- [ ] 断网 2 秒 → 重连后画板状态与服务端一致（可能因重拉导致短暂闪烁，可接受）。

**未登录闭环**
- [ ] 不登录能看到完整画板内容（只读）。
- [ ] 不登录看到的卡片上，点赞数正确；`likedByMe` 恒 false。
- [ ] 别人新建/拖动/删除卡片，未登录访客也能实时看到。
- [ ] 工具条 disabled，点击登录按钮跳登录 modal。

**视觉还原**
- [ ] 卡片 6 色随机、旋转角 [-6, 6]° 随机，与 Figma 观感一致。
- [ ] 头像圆形，在线绿点位置正确。
- [ ] 工具条选中态有高亮（蓝色圆）。
- [ ] 顶部右上角「2026-04-20 15:23:32 已保存/已更新」状态跟随画板变更时刷新文案。

---

## 15. 常见坑（写在前面省得踩）

1. **WS 在 React 严格模式下会连两次** —— `useEffect` 清理里一定要 `ws.close()`，否则开发模式下会出现 presence 抖动。生产模式没这问题。
2. **`http.delete` 返回 `null`** —— TanStack Query 的 `mutationFn` 不要写 `: Promise<void>` 去约束，改成 `: Promise<null>` 或不写返回类型。
3. **`VITE_API_BASE` 环境变量要分开配** —— 开发 `http://localhost:3000`，生产走相对路径（Vercel rewrite）。直接读 `import.meta.env.VITE_API_BASE` 即可。WS URL 派生自同一个 base，替换 `http` → `ws`。
4. **拖动时不要频繁 re-render 整个画板** —— 每张 `Sticker` 组件用 `React.memo`，拖动中改 `style.transform`（绕过 React），或用 `framer-motion` 的 `motion.div` 走 GPU 合成。
5. **TanStack Query 的 `staleTime: 30s`** 意味着回到画板 tab 不会重拉评论。若需要主动刷新，显式 `invalidateQueries`。
6. **`verbatimModuleSyntax`** —— 只导入类型时必须写 `import type { User } from ...`，否则 build 炸。
7. **sonner 的 `richColors` 模式**下，`toast.error` 才是红色；不开的话默认是中性色。
8. **富文本编辑器初始 focus** —— Tiptap 的 `autofocus: true` 在 dialog 里会与 Radix 的焦点管理打架，用 `onOpenAutoFocus={e => e.preventDefault()}` 后手动 `editor.commands.focus()`。
