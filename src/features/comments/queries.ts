import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Paginated } from "@/lib/api";
import { commentsApi, commentsKeys } from "./api";
import { updateCommentLikeState } from "./cache";
import type {
  Comment,
  CreateCommentPayload,
  ListCommentsParams,
  UpdateCommentPayload,
} from "./types";

export function useCommentsQuery(params: ListCommentsParams) {
  return useQuery({
    queryKey: commentsKeys.list(params),
    queryFn: () => commentsApi.list(params),
  });
}

export function useCreateCommentMutation() {
  return useMutation({
    mutationFn: (payload: CreateCommentPayload) => commentsApi.create(payload),
  });
}

export function useUpdateCommentMutation() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCommentPayload }) =>
      commentsApi.update(id, payload),
  });
}

export function useToggleCommentLikeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (comment: Comment) =>
      comment.likedByMe ? commentsApi.unlike(comment.id) : commentsApi.like(comment.id),
    onError: (
      _error,
      _comment,
      context: { snapshots: Array<[readonly unknown[], Paginated<Comment> | undefined]> } | undefined,
    ) => {
      context?.snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onMutate: async (comment) => {
      const snapshots = queryClient.getQueriesData<Paginated<Comment>>({
        queryKey: commentsKeys.all,
      });

      updateCommentLikeState(queryClient, {
        commentId: comment.id,
        likeCount: comment.likedByMe
          ? Math.max(0, comment.likeCount - 1)
          : comment.likeCount + 1,
        likedByMe: !comment.likedByMe,
      });

      return { snapshots };
    },
    onSuccess: (result, comment) => {
      updateCommentLikeState(queryClient, {
        commentId: comment.id,
        likeCount: result.likeCount,
        likedByMe: result.likedByMe,
      });
    },
  });
}
