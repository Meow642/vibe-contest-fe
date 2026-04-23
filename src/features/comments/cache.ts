import type { QueryClient } from "@tanstack/react-query";
import type { Paginated } from "@/lib/api";
import { commentsKeys } from "./api";
import type { Comment } from "./types";

type CommentsPage = Paginated<Comment>;

type CommentsUpdater = (page: CommentsPage) => CommentsPage;

export function updateCommentsCache(
  queryClient: QueryClient,
  updater: CommentsUpdater,
) {
  queryClient.setQueriesData<CommentsPage>(
    { queryKey: commentsKeys.all },
    (prev) => (prev ? updater(prev) : prev),
  );
}

export function prependCommentToCache(
  queryClient: QueryClient,
  comment: Comment,
) {
  updateCommentsCache(queryClient, (page) => {
    const exists = page.items.some((item) => item.id === comment.id);

    return {
      ...page,
      items: exists
        ? page.items.map((item) => (item.id === comment.id ? comment : item))
        : [comment, ...page.items],
      total: exists ? page.total : page.total + 1,
    };
  });
}

export function replaceCommentInCache(
  queryClient: QueryClient,
  comment: Comment,
) {
  updateCommentsCache(queryClient, (page) => ({
    ...page,
    items: page.items.map((item) => (item.id === comment.id ? comment : item)),
  }));
}

export function removeCommentFromCache(
  queryClient: QueryClient,
  commentId: number,
) {
  updateCommentsCache(queryClient, (page) => {
    const nextItems = page.items.filter((item) => item.id !== commentId);

    return {
      ...page,
      items: nextItems,
      total: nextItems.length === page.items.length ? page.total : Math.max(0, page.total - 1),
    };
  });
}

export function updateCommentLikeState(
  queryClient: QueryClient,
  options: {
    commentId: number;
    likeCount: number;
    likedByMe?: boolean;
  },
) {
  updateCommentsCache(queryClient, (page) => ({
    ...page,
    items: page.items.map((item) =>
      item.id === options.commentId
        ? {
            ...item,
            likeCount: options.likeCount,
            likedByMe: options.likedByMe ?? item.likedByMe,
          }
        : item,
    ),
  }));
}
