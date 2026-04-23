import type { MouseEvent as ReactMouseEvent } from "react";
import {
  ChevronDownIcon,
  PlusCircleIcon,
  CircleUserRoundIcon,
  GripIcon,
  LogOutIcon,
  MousePointer2Icon,
  SparklesIcon,
} from "lucide-react";
import homeLogo from "@/assets/home.png";
import type { Comment } from "@/features/comments/types";
import type { User } from "@/features/auth/types";
import { LOGICAL_CANVAS_HEIGHT, LOGICAL_CANVAS_WIDTH } from "@/features/comments/constants";
import AppAvatar from "@/components/AppAvatar";
import WallCommentItem from "@/features/wall/components/WallCommentItem";
import type { BoardMode } from "@/stores/board-mode";
import { usePresenceStore } from "@/stores/presence";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface WallPreviewProps {
  activeLikeCommentId?: number | null;
  comments: Comment[];
  isCommentsLoading: boolean;
  currentUser: User | null;
  isAuthLoading: boolean;
  latestActivityAt?: string;
  onEditIdea: (comment: Comment) => void;
  onPersistDrag: (commentId: number, next: { x: number; y: number }) => Promise<void>;
  onCanvasClick: (event: ReactMouseEvent<HTMLElement>) => void;
  onCreateIdea: () => void;
  onToggleLike: (comment: Comment) => void;
  onPointerMode: () => void;
  onDragMode: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onLogout: () => void;
  selectedTool: BoardMode;
}

export default function WallPreview({
  activeLikeCommentId = null,
  comments,
  isCommentsLoading,
  currentUser,
  isAuthLoading,
  latestActivityAt,
  onEditIdea,
  onPersistDrag,
  onCanvasClick,
  onCreateIdea,
  onToggleLike,
  onDragMode,
  onLogin,
  onRegister,
  onLogout,
  onPointerMode,
  selectedTool,
}: WallPreviewProps) {
  const isAuthenticated = Boolean(currentUser);
  const hasComments = comments.length > 0;
  const presenceUsers = usePresenceStore((state) => state.users);
  const sidebarUsers = presenceUsers.slice(0, 10);
  const overflowUsers = presenceUsers.slice(10);

  return (
    <div className="relative h-screen overflow-hidden bg-[#fcfaf7] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),rgba(252,250,247,0.78)_38%,rgba(250,246,240,0.95)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(#efe6d9_1.2px,transparent_1.2px)] bg-[size:16px_16px] opacity-65" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.6),transparent_12%,transparent_88%,rgba(255,255,255,0.4))]" />

      <div className="relative flex h-screen">
        <aside className="hidden w-[4.8rem] shrink-0 border-r border-slate-200/70 bg-white/65 backdrop-blur-lg lg:flex lg:flex-col">
          <div className="flex h-20 items-center justify-center border-b border-slate-200/60">
            <img alt="Talon" src={homeLogo}   width={30} height={30} />
          </div>

          <div className="flex flex-1 flex-col items-center gap-4 py-5">
            {sidebarUsers.map((user) => (
              <div key={user.id} className="relative">
                <AppAvatar
                  avatarUrl={user.avatarUrl}
                  className="size-11 ring-2 ring-white/90 shadow-sm"
                  name={user.displayName}
                  online
                  size="lg"
                  userId={user.id}
                />
              </div>
            ))}

            {overflowUsers.length > 0 ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex size-11 items-center justify-center rounded-full border border-white/80 bg-white/85 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-white">
                    +{overflowUsers.length}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="center" className="w-64">
                  <p className="text-sm font-medium text-slate-900">更多在线用户</p>
                  <div className="space-y-2">
                    {overflowUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 rounded-xl px-2 py-1.5"
                      >
                        <AppAvatar
                          avatarUrl={user.avatarUrl}
                          name={user.displayName}
                          online
                          userId={user.id}
                        />
                        <span className="text-sm text-slate-700">{user.displayName}</span>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            ) : null}
          </div>

          <div className="flex items-center justify-center border-t border-slate-200/60 py-4">
            {currentUser ? (
              <AppAvatar
                avatarUrl={currentUser.avatarUrl}
                className="size-11 ring-2 ring-white/90 shadow-sm"
                name={currentUser.displayName}
                size="lg"
                userId={currentUser.id}
              />
            ) : (
              <div className="flex size-11 items-center justify-center rounded-full bg-slate-200/70 text-slate-400">
                <CircleUserRoundIcon className="size-5" />
              </div>
            )}
          </div>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="shrink-0 flex items-start justify-between gap-3 px-4 pb-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 shadow-[0_12px_24px_rgba(15,23,42,0.14)]">
                <img alt="Talon" className="size-6 object-contain" src={homeLogo} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">实时评论墙</p>
                <p className="text-xs text-slate-500">分支机构统一吐槽园子</p>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <p className="hidden text-xs text-slate-400 sm:block">
                {latestActivityAt ? `${latestActivityAt} 已更新` : "等待首条建议"}
              </p>

              {isAuthenticated ? (
                <>
                  {currentUser ? (
                    <div className="hidden items-center gap-3 rounded-full border border-white/80 bg-white/85 px-3 py-2 shadow-sm backdrop-blur-sm sm:flex">
                      <AppAvatar
                        avatarUrl={currentUser.avatarUrl}
                        className="size-9 ring-1 ring-slate-200"
                        name={currentUser.displayName}
                        userId={currentUser.id}
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {currentUser.displayName}
                        </p>
                        <p className="text-xs text-slate-500">@{currentUser.username}</p>
                      </div>
                    </div>
                  ) : null}

                  <Button
                    className="rounded-2xl border-white/80 bg-white/85 px-4 text-slate-700 shadow-sm hover:bg-white"
                    disabled={isAuthLoading}
                    size="lg"
                    variant="outline"
                    onClick={onLogout}
                  >
                    <LogOutIcon className="size-4" />
                    退出
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    className="rounded-2xl border-white/80 bg-white/85 px-4 shadow-sm hover:bg-white"
                    size="lg"
                    variant="outline"
                    onClick={onRegister}
                  >
                    注册
                  </Button>
                  <Button
                    className="rounded-2xl bg-slate-950 px-4 text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)] hover:bg-slate-800"
                    size="lg"
                    onClick={onLogin}
                  >
                    登录
                  </Button>
                </>
              )}
            </div>
          </header>

          <div
            className={
              selectedTool === "create"
                ? "relative min-h-0 flex-1 cursor-copy px-4 pb-36 sm:px-6 lg:px-8"
                : selectedTool === "drag"
                  ? "relative min-h-0 flex-1 cursor-grab px-4 pb-36 sm:px-6 lg:px-8"
                  : "relative min-h-0 flex-1 cursor-default px-4 pb-36 sm:px-6 lg:px-8"
            }
            onClick={onCanvasClick}
          >
            <div className="absolute inset-x-0 top-0 hidden justify-center lg:flex">
              <div className="rounded-full bg-white/55 px-5 py-2 text-center text-[0.95rem] text-slate-500 backdrop-blur-sm">
                共反馈{" "}
                <span className="text-[2rem] font-semibold text-slate-700">{comments.length}</span>{" "}
                条建议
              </div>
            </div>

            {hasComments ? (
              <>
                <div
                  className="mt-6 max-h-full overflow-hidden grid gap-5 md:grid-cols-2 xl:hidden"
                  data-canvas-surface="true"
                >
                  {comments.map((comment) => (
                    <WallCommentItem
                      activeLikeCommentId={activeLikeCommentId}
                      key={comment.id}
                      comment={comment}
                      currentUserId={currentUser?.id ?? null}
                      layout="grid"
                      onEdit={onEditIdea}
                      onPersistDrag={onPersistDrag}
                      onToggleLike={onToggleLike}
                      selectedTool={selectedTool}
                    />
                  ))}
                </div>

                <div
                  className="relative mx-auto mt-14 hidden h-[calc(100%-3.5rem)] max-h-full aspect-[4/3] w-full max-w-[1220px] xl:block"
                  data-canvas-surface="true"
                >
                  {comments.map((comment) => (
                    <WallCommentItem
                      activeLikeCommentId={activeLikeCommentId}
                      key={comment.id}
                      comment={comment}
                      currentUserId={currentUser?.id ?? null}
                      onEdit={onEditIdea}
                      onPersistDrag={onPersistDrag}
                      onToggleLike={onToggleLike}
                      selectedTool={selectedTool}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="mx-auto mt-14 flex h-[calc(100%-3.5rem)] max-h-full min-h-[18rem] max-w-[1220px] items-center justify-center rounded-[36px] border border-dashed border-slate-200/90 bg-white/35 px-6 text-center backdrop-blur-sm">
                <div className="max-w-md space-y-3">
                  <p className="text-xl font-semibold text-slate-700">
                    {isCommentsLoading ? "正在加载评论墙..." : "评论墙还没有内容"}
                  </p>
                  <p className="text-sm leading-7 text-slate-500">
                    {isAuthenticated
                      ? `点击下方工具条的新增按钮，发布第一张贴纸。逻辑画布尺寸为 ${LOGICAL_CANVAS_WIDTH} × ${LOGICAL_CANVAS_HEIGHT}。`
                      : "登录后可发表、拖动和编辑自己的贴纸；未登录状态下仍可浏览所有公开内容。"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-7 flex flex-col items-center gap-3">
              <div className="rounded-full bg-white/70 px-3 py-1 text-sm text-slate-500 backdrop-blur-sm">
                发起建议
              </div>

              <div className="pointer-events-auto flex items-center gap-1 rounded-[1.35rem] border border-white/80 bg-white/90 p-2 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur-md">
                <Button
                  className="rounded-xl"
                  size="icon"
                  variant={selectedTool === "create" ? "default" : "ghost"}
                  onClick={onCreateIdea}
                >
                  <PlusCircleIcon className="size-4" />
                </Button>
                <Button
                  className="rounded-xl"
                  size="icon"
                  variant={selectedTool === "pointer" ? "default" : "ghost"}
                  onClick={onPointerMode}
                >
                  <MousePointer2Icon className="size-4" />
                </Button>
                <Button
                  className="rounded-xl"
                  size="icon"
                  variant={selectedTool === "drag" ? "default" : "ghost"}
                  onClick={onDragMode}
                >
                  <GripIcon className="size-4" />
                </Button>
              </div>
              <div className="rounded-full bg-white/70 px-3 py-1 text-xs text-slate-500 backdrop-blur-sm">
                {selectedTool === "create"
                  ? "新增模式：点击空白处新建评论"
                  : selectedTool === "drag"
                    ? "拖动模式：仅可拖动自己的卡片"
                    : "指针模式：用于查看与点击操作"}
              </div>
            </div>
          ) : (
            <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/80 bg-white/78 px-4 py-2 text-sm text-slate-500 shadow-sm backdrop-blur-sm">
              <SparklesIcon className="size-4 text-amber-500" />
              登录后可发表评论、点赞与拖动自己的贴纸
            </div>
          )}

          {!isAuthenticated && isAuthLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/45 backdrop-blur-[2px]">
              <div className="rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm text-slate-600 shadow-sm">
                正在恢复登录状态...
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {isAuthenticated && presenceUsers.length > 0 ? (
        <div className="absolute left-20 top-6 hidden items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs text-slate-500 backdrop-blur-sm lg:flex">
          <span>{presenceUsers.length} 人在线</span>
          <ChevronDownIcon className="size-3" />
        </div>
      ) : null}
    </div>
  );
}
