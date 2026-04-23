import { useEffect } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { authToken } from "@/lib/api/auth-token";
import { authKeys } from "@/features/auth/api";
import AuthDialog, { type AuthMode } from "@/features/auth/components/AuthDialog";
import CommentComposerDialog from "@/features/comments/components/CommentComposerDialog";
import {
  DEFAULT_COMMENTS_QUERY,
  LOGICAL_CANVAS_HEIGHT,
  LOGICAL_CANVAS_WIDTH,
} from "@/features/comments/constants";
import {
  useCommentsQuery,
  useToggleCommentLikeMutation,
  useUpdateCommentMutation,
} from "@/features/comments/queries";
import type { Comment } from "@/features/comments/types";
import { useRealtimeConnection } from "@/lib/realtime/use-realtime";
import { useBoardModeStore } from "@/stores/board-mode";
import { useEditorStore } from "@/stores/editor";
import {
  useAuthMeQuery,
  useLogoutMutation,
} from "@/features/auth/queries";
import WallPreview from "@/features/wall/components/WallPreview";

interface WallPageProps {
  authMode?: AuthMode;
}

export default function WallPage({ authMode }: WallPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const meQuery = useAuthMeQuery();
  const commentsQuery = useCommentsQuery(DEFAULT_COMMENTS_QUERY);
  const logoutMutation = useLogoutMutation();
  const updateCommentMutation = useUpdateCommentMutation();
  const toggleLikeMutation = useToggleCommentLikeMutation();
  const selectedTool = useBoardModeStore((state) => state.mode);
  const setSelectedTool = useBoardModeStore((state) => state.setMode);
  const editorState = useEditorStore();

  const hasStoredToken = authToken.has();
  const currentUser = meQuery.data ?? null;
  const isAuthLoading = hasStoredToken && meQuery.isPending;
  const comments = commentsQuery.data?.items ?? [];
  const latestActivityAt = comments[0]?.updatedAt ?? comments[0]?.createdAt;

  useRealtimeConnection(currentUser?.id ?? null);

  useEffect(() => {
    if (!currentUser || !authMode) {
      return;
    }

    navigate("/", { replace: true });
  }, [authMode, currentUser, navigate]);

  useEffect(() => {
    if (!(meQuery.error instanceof ApiError) || meQuery.error.status !== 401) {
      return;
    }

    authToken.clear();
    queryClient.setQueryData(authKeys.me, null);

    if (authMode) {
      navigate("/", { replace: true });
    }
  }, [authMode, meQuery.error, navigate, queryClient]);

  function closeDialog(open: boolean) {
    if (!open) {
      navigate("/", { replace: true });
    }
  }

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        toast.success("已退出登录");
      },
    });
  }

  function mapPointerToCanvasPosition(event: ReactMouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / rect.width;
    const relativeY = (event.clientY - rect.top) / rect.height;

    return {
      x: Math.min(
        LOGICAL_CANVAS_WIDTH,
        Math.max(0, Number((relativeX * LOGICAL_CANVAS_WIDTH).toFixed(1))),
      ),
      y: Math.min(
        LOGICAL_CANVAS_HEIGHT,
        Math.max(0, Number((relativeY * LOGICAL_CANVAS_HEIGHT).toFixed(1))),
      ),
    };
  }

  function handleCanvasClick(event: ReactMouseEvent<HTMLElement>) {
    if (!currentUser || selectedTool !== "create") {
      return;
    }

    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (
      target.closest("[data-comment-card='true']") ||
      target.closest("[data-slot='button']") ||
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("textarea")
    ) {
      return;
    }

    editorState.openCreate(mapPointerToCanvasPosition(event));
  }

  async function handlePersistDrag(
    commentId: number,
    next: { x: number; y: number },
  ) {
    await updateCommentMutation.mutateAsync({
      id: commentId,
      payload: next,
    });
  }

  function handleEditIdea(comment: Comment) {
    if (currentUser?.id !== comment.author.id) {
      return;
    }

    editorState.openEdit(comment);
  }

  function handleToggleLike(comment: Comment) {
    if (!currentUser || currentUser.id === comment.author.id) {
      return;
    }

    toggleLikeMutation.mutate(comment);
  }

  return (
    <>
      <WallPreview
        activeLikeCommentId={toggleLikeMutation.isPending ? toggleLikeMutation.variables?.id ?? null : null}
        comments={comments}
        currentUser={currentUser}
        onEditIdea={handleEditIdea}
        onPersistDrag={handlePersistDrag}
        isCommentsLoading={commentsQuery.isLoading}
        isAuthLoading={isAuthLoading || logoutMutation.isPending}
        latestActivityAt={latestActivityAt}
        onCreateIdea={() => setSelectedTool("create")}
        onDragMode={() => setSelectedTool("drag")}
        onPointerMode={() => setSelectedTool("pointer")}
        onLogin={() => navigate("/login")}
        onLogout={handleLogout}
        onRegister={() => navigate("/register")}
        onToggleLike={handleToggleLike}
        selectedTool={selectedTool}
        onCanvasClick={handleCanvasClick}
      />

      {authMode ? (
        <AuthDialog
          key={authMode}
          mode={authMode}
          open={Boolean(authMode)}
          onOpenChange={closeDialog}
        />
      ) : null}

      {editorState.open ? (
        <CommentComposerDialog
          key={`${editorState.mode}-${editorState.commentId ?? "create"}-${editorState.position.x}-${editorState.position.y}`}
          commentId={editorState.commentId}
          defaultPosition={editorState.position}
          initialContent={editorState.initialContent}
          mode={editorState.mode}
          open={editorState.open}
          onOpenChange={(open) => {
            if (!open) {
              editorState.close();
            }
          }}
        />
      ) : null}
    </>
  );
}
