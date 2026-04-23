import { memo, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { clampLogicalPosition, toLogical } from "@/features/board/coords";
import CommentCard from "@/features/comments/components/CommentCard";
import type { Comment } from "@/features/comments/types";
import { getCommentWallStyle } from "@/features/comments/utils";
import { socket } from "@/lib/realtime/socket";
import { cn } from "@/lib/utils";
import type { BoardMode } from "@/stores/board-mode";
import { useDragStore } from "@/stores/drag";

interface WallCommentItemProps {
  activeLikeCommentId?: number | null;
  comment: Comment;
  currentUserId: number | null;
  layout?: "wall" | "grid";
  noteClassName?: string;
  onEdit: (comment: Comment) => void;
  onPersistDrag: (commentId: number, next: { x: number; y: number }) => Promise<void>;
  onToggleLike: (comment: Comment) => void;
  selectedTool: BoardMode;
  tapeClassName?: string;
}

function WallCommentItem({
  activeLikeCommentId = null,
  comment,
  currentUserId,
  layout = "wall",
  noteClassName,
  onEdit,
  onPersistDrag,
  onToggleLike,
  selectedTool,
  tapeClassName,
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
  const pointerOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
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
        noteClassName={noteClassName}
        tapeClassName={tapeClassName}
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

    const pointer = getLogicalPosition(event);

    if (!pointer) {
      return;
    }

    activePointerIdRef.current = event.pointerId;
    pointerOffsetRef.current = {
      dx: comment.x - pointer.x,
      dy: comment.y - pointer.y,
    };
    lastValidPositionRef.current = {
      x: comment.x,
      y: comment.y,
    };
    lastSentAtRef.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    const pointer = getLogicalPosition(event);

    if (!pointer) {
      return;
    }

    const next = clampLogicalPosition({
      x: pointer.x + pointerOffsetRef.current.dx,
      y: pointer.y + pointerOffsetRef.current.dy,
    });

    lastValidPositionRef.current = next;

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

    const pointer = getLogicalPosition(event);
    const next = pointer
      ? clampLogicalPosition({
          x: pointer.x + pointerOffsetRef.current.dx,
          y: pointer.y + pointerOffsetRef.current.dy,
        })
      : lastValidPositionRef.current;

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

  const isDragMode = selectedTool === "drag";

  return (
    <div
      className={cn(
        "absolute touch-none",
        isDragMode && "[&_*]:pointer-events-none [&_*]:select-none",
      )}
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
        noteClassName={noteClassName}
        tapeClassName={tapeClassName}
        onDoubleClick={isOwn ? () => onEdit(comment) : undefined}
        onLikeClick={() => onToggleLike(comment)}
      />
    </div>
  );
}

export default memo(WallCommentItem);
