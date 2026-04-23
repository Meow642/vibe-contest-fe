export type CommentColor =
  | "pink"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "orange";

export interface CommentAuthor {
  id: number;
  displayName: string;
  avatarUrl: string;
}

export interface Comment {
  id: number;
  content: string;
  x: number;
  y: number;
  rotation: number;
  color: CommentColor;
  likeCount: number;
  likedByMe: boolean;
  author: CommentAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentPayload {
  content: string;
  x: number;
  y: number;
  color: CommentColor;
  rotation?: number;
}

export interface UpdateCommentPayload {
  content?: string;
  x?: number;
  y?: number;
  rotation?: number;
  color?: CommentColor;
}

export interface ListCommentsParams {
  limit?: number;
  offset?: number;
  authorId?: number;
}

export interface LikeStateResponse {
  commentId: number;
  likeCount: number;
  likedByMe: boolean;
}
