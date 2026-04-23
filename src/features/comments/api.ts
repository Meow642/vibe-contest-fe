import { http, type Paginated } from "@/lib/api";
import type {
  Comment,
  CreateCommentPayload,
  LikeStateResponse,
  ListCommentsParams,
  UpdateCommentPayload,
} from "./types";

export const commentsApi = {
  list: (params: ListCommentsParams = {}) =>
    http.get<Paginated<Comment>>("/comments", { params }),

  get: (id: number) => http.get<Comment>(`/comments/${id}`),

  create: (payload: CreateCommentPayload) =>
    http.post<Comment>("/comments", payload),

  update: (id: number, payload: UpdateCommentPayload) =>
    http.put<Comment>(`/comments/${id}`, payload),

  remove: (id: number) => http.delete<void>(`/comments/${id}`),

  like: (id: number) =>
    http.post<LikeStateResponse>(`/comments/${id}/like`, {}),

  unlike: (id: number) => http.delete<LikeStateResponse>(`/comments/${id}/like`),
};

export const commentsKeys = {
  all: ["comments"] as const,
  lists: () => ["comments", "list"] as const,
  list: (params: ListCommentsParams) => ["comments", "list", params] as const,
};
