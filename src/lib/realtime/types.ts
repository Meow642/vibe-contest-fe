import type { Comment } from "@/features/comments/types";

export interface PresenceUser {
  avatarUrl: string;
  displayName: string;
  id: number;
}

export interface HelloData {
  heartbeatInterval: number;
  serverTime: string;
  sessionId: string;
  userId: number | null;
}

export interface PresenceSyncData {
  users: PresenceUser[];
}

export interface PresenceDeltaData {
  user: PresenceUser;
}

export interface CommentCreatedData {
  comment: Comment;
}

export interface CommentUpdatedData {
  comment: Comment;
}

export interface CommentDeletedData {
  id: number;
}

export interface CommentLikedData {
  actorId: number;
  commentId: number;
  likeCount: number;
  liked: boolean;
}

export interface CommentDraggingData {
  actorId: number;
  id: number;
  rotation?: number;
  x: number;
  y: number;
}

export interface RealtimeErrorData {
  code:
    | "bad_envelope"
    | "forbidden"
    | "invalid_payload"
    | "not_found"
    | "rate_limited"
    | "unknown_type";
  echo?: unknown;
  message: string;
}

export interface WsEnvelope<T extends string, D> {
  data: D;
  ts?: string;
  type: T;
}

export type RealtimeServerEvent =
  | WsEnvelope<"comment.created", CommentCreatedData>
  | WsEnvelope<"comment.deleted", CommentDeletedData>
  | WsEnvelope<"comment.dragging", CommentDraggingData>
  | WsEnvelope<"comment.liked", CommentLikedData>
  | WsEnvelope<"comment.updated", CommentUpdatedData>
  | WsEnvelope<"error", RealtimeErrorData>
  | WsEnvelope<"hello", HelloData>
  | WsEnvelope<"pong", Record<string, never>>
  | WsEnvelope<"presence.joined", PresenceDeltaData>
  | WsEnvelope<"presence.left", PresenceDeltaData>
  | WsEnvelope<"presence.sync", PresenceSyncData>;

export type RealtimeClientEvent =
  | WsEnvelope<
      "comment.drag",
      {
        id: number;
        rotation?: number;
        x: number;
        y: number;
      }
    >
  | WsEnvelope<"ping", Record<string, never>>;

export interface RealtimeStatusEvent {
  code?: number;
  kind: "close" | "open";
  reason?: string;
}
