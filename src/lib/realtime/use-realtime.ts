import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/features/auth/api";
import { commentsKeys } from "@/features/comments/api";
import { useDragStore } from "@/stores/drag";
import { usePresenceStore } from "@/stores/presence";
import { applyRealtimeEvent } from "./bindings";
import { socket } from "./socket";

export function useRealtimeConnection(currentUserId: number | null) {
  const queryClient = useQueryClient();
  const seenHelloRef = useRef(false);

  useEffect(() => {
    socket.acquire();

    const unsubscribeEvent = socket.on((event) => {
      if (event.type === "hello") {
        useDragStore.getState().clearAll();

        if (seenHelloRef.current) {
          queryClient.invalidateQueries({ queryKey: commentsKeys.all });
        } else {
          seenHelloRef.current = true;
        }
      }

      applyRealtimeEvent(queryClient, event);
    });

    const unsubscribeStatus = socket.onStatus((status) => {
      if (status.kind === "close" && status.code === 4401) {
        queryClient.setQueryData(authKeys.me, null);
      }

      if (status.kind === "close" && status.code === 1000) {
        usePresenceStore.getState().reset();
      }
    });

    return () => {
      unsubscribeEvent();
      unsubscribeStatus();
      socket.release();
    };
  }, [queryClient]);

  useEffect(() => {
    socket.ensureConnected();
  }, [currentUserId]);
}
