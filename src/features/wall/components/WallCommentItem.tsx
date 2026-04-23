import { memo, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { toLogical } from "@/features/board/coords";
import CommentCard from "@/features/comments/components/CommentCard";
import type { Comment } from "@/features/comments/types";
import { getCommentWallStyle } from "@/features/comments/utils";
import { socket } from "@/lib/realtime/socket";
import type { BoardMode } from "@/stores/board-mode";
import { useDragStore } from "@/stores/drag";

interface WallCommentItemProps {
  activeLikeCommentId?: number | null;
  comment: Comment;
  currentUserId: number | null;
  layout?: "wall" | "grid";
  onEdit: (comment: Comment) => void;
  onPersistDrag: (commentId: number, next: { x: number; y: number }) => Promise<void>;
  onToggleLike: (comment: Comment) => void;
  selectedTool: BoardMode;
}

function WallCommentItem({
  activeLikeCommentId = null,
  comment,
  currentUserId,
  layout = "wall",
  onEdit,
  onPersistDrag,
  onToggleLike,
  selectedTool,
}: WallCommentItemProps) {
  const dragPosition = useDragStore((state) => state.positions[comment.id]);
  const clearPosition = useDragStore((state) => state.clear);
  const setPosition = useDragStore((state) => state.setPosition);

  const isOwn = currentUserId === comment.author.id;
  const activePointerIdRef = useRef<number | null>(null);
  const lastValidPositionRef = useRef<{ x: number; y: number }>({
    x: comment.x,
    y: comment.y,
  });
  const lastSentAtRef = useRef(0);

  const renderedComment = dragPosition
    ? {
        ...comment,
        rotation: dragPosition.rotation,
        x: dragPosition.x,
        y: dragPosition.y,
      }
    : comment;

  if (layout === "grid") {
    return (
      <CommentCard
        canLike={Boolean(currentUserId) && !isOwn}
        comment={renderedComment}
        isLikePending={activeLikeCommentId === comment.id}
        layout="grid"
        onDoubleClick={isOwn ? () => onEdit(comment) : undefined}
        onLikeClick={() => onToggleLike(comment)}
      />
    );
  }

  function getLogicalPosition(event: ReactPointerEvent<HTMLDivElement>) {
    const canvasSurface = event.currentTarget.closest("[data-canvas-surface='true']");

    if (!(canvasSurface instanceof HTMLElement)) {
      return null;
    }

    const rect = canvasSurface.getBoundingClientRect();

    return toLogical(event.clientX - rect.left, event.clientY - rect.top, {
      height: rect.height,
      width: rect.width,
    });
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      selectedTool !== "drag" ||
      !isOwn ||
      event.button !== 0 ||
      event.target instanceof HTMLElement &&
        event.target.closest("[data-comment-action='true']")
    ) {
      return;
    }

    const next = getLogicalPosition(event);

    if (!next) {
      return;
    }

    activePointerIdRef.current = event.pointerId;
    lastValidPositionRef.current = {
      x: next.x,
      y: next.y,
    };
    lastSentAtRef.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPosition(comment.id, {
      actorId: currentUserId ?? comment.author.id,
      rotation: comment.rotation,
      x: next.x,
      y: next.y,
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    const next = getLogicalPosition(event);

    if (!next) {
      return;
    }

    lastValidPositionRef.current = {
      x: next.x,
      y: next.y,
    };

    setPosition(comment.id, {
      actorId: currentUserId ?? comment.author.id,
      rotation: comment.rotation,
      x: next.x,
      y: next.y,
    });

    const now = performance.now();

    if (now - lastSentAtRef.current >= 1000 / 60) {
      socket.send("comment.drag", {
        id: comment.id,
        rotation: comment.rotation,
        x: next.x,
        y: next.y,
      });
      lastSentAtRef.current = now;
    }
  }

  async function handlePointerRelease(event: ReactPointerEvent<HTMLDivElement>) {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    activePointerIdRef.current = null;

    const next = getLogicalPosition(event) ?? lastValidPositionRef.current;

    lastValidPositionRef.current = next;

    setPosition(comment.id, {
      actorId: currentUserId ?? comment.author.id,
      rotation: comment.rotation,
      x: next.x,
      y: next.y,
    });

    try {
      await onPersistDrag(comment.id, next);
    } catch {
      setPosition(comment.id, {
        actorId: currentUserId ?? comment.author.id,
        rotation: comment.rotation,
        x: lastValidPositionRef.current.x,
        y: lastValidPositionRef.current.y,
      });
      clearPosition(comment.id);
    }
  }

  return (
    <div
      className="absolute touch-none"
      style={getCommentWallStyle(renderedComment)}
      onPointerCancel={handlePointerRelease}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerRelease}
    >
      <CommentCard
        canLike={Boolean(currentUserId) && !isOwn}
        comment={renderedComment}
        isLikePending={activeLikeCommentId === comment.id}
        onDoubleClick={isOwn ? () => onEdit(comment) : undefined}
        onLikeClick={() => onToggleLike(comment)}
      />
    </div>
  );
}

export default memo(WallCommentItem);
