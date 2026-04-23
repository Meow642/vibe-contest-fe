import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authKeys } from "@/features/auth/api";
import {
  prependCommentToCache,
  removeCommentFromCache,
  replaceCommentInCache,
  updateCommentLikeState,
} from "@/features/comments/cache";
import { useDragStore } from "@/stores/drag";
import { usePresenceStore } from "@/stores/presence";
import type { RealtimeServerEvent } from "./types";

export function applyRealtimeEvent(
  queryClient: QueryClient,
  event: RealtimeServerEvent,
) {
  switch (event.type) {
    case "presence.sync":
      usePresenceStore.getState().sync(event.data.users);
      return;

    case "presence.joined":
      usePresenceStore.getState().joined(event.data.user);
      return;

    case "presence.left":
      usePresenceStore.getState().left(event.data.user.id);
      return;

    case "comment.created":
      prependCommentToCache(queryClient, event.data.comment);
      return;

    case "comment.updated": {
      const dragState = useDragStore.getState();
      if (!dragState.activeSelf[event.data.comment.id]) {
        dragState.clear(event.data.comment.id);
      }
      replaceCommentInCache(queryClient, event.data.comment);
      return;
    }

    case "comment.deleted":
      useDragStore.getState().clear(event.data.id);
      removeCommentFromCache(queryClient, event.data.id);
      return;

    case "comment.liked": {
      const me = queryClient.getQueryData<{ id: number } | null>(authKeys.me);

      updateCommentLikeState(queryClient, {
        commentId: event.data.commentId,
        likeCount: event.data.likeCount,
        likedByMe: me?.id === event.data.actorId ? event.data.liked : undefined,
      });
      return;
    }

    case "comment.dragging": {
      const me = queryClient.getQueryData<{ id: number } | null>(authKeys.me);

      if (me?.id === event.data.actorId) {
        return;
      }

      useDragStore.getState().setPosition(event.data.id, {
        actorId: event.data.actorId,
        rotation: event.data.rotation ?? 0,
        x: event.data.x,
        y: event.data.y,
      });
      return;
    }

    case "error":
      if (
        event.data.code === "rate_limited" ||
        event.data.code === "invalid_payload"
      ) {
        return;
      }

      toast.error(event.data.message);
      return;

    default:
      return;
  }
}
