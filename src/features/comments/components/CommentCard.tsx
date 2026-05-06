import { memo } from "react";
import { HeartIcon } from "lucide-react";
import { COMMENT_COLOR_META } from "@/features/comments/constants";
import type { Comment } from "@/features/comments/types";
import AppAvatar from "@/components/AppAvatar";
import { cn } from "@/lib/utils";

interface CommentCardProps {
  canLike?: boolean;
  comment: Comment;
  isLikePending?: boolean;
  layout?: "wall" | "grid";
  noteClassName?: string;
  onDoubleClick?: () => void;
  onLikeClick?: () => void;
  tapeClassName?: string;
}

const TAPE_ROTATIONS = [-20, -10, 10, 20, -40] as const;
const TAPE_OFFSETS = [20, 35, 50, 65] as const;

function CommentCard({
  canLike = false,
  comment,
  isLikePending = false,
  layout = "wall",
  noteClassName,
  onDoubleClick,
  onLikeClick,
  tapeClassName,
}: CommentCardProps) {
  const colorMeta = COMMENT_COLOR_META[comment.color];
  const likeDisabled = !canLike || isLikePending || !onLikeClick;
  const tapeRotation = TAPE_ROTATIONS[comment.id % TAPE_ROTATIONS.length];
  const tapeOffset = TAPE_OFFSETS[comment.id % TAPE_OFFSETS.length];
  const resolvedNoteClass = noteClassName ?? colorMeta.noteClassName;
  const resolvedTapeClass = tapeClassName ?? colorMeta.tapeClassName;

  return (
    <article
      data-comment-card="true"
      className={cn(
        "relative flex w-[300px] flex-col items-center justify-center gap-4 rounded-[24px] p-6 shadow-[2px_2px_10px_rgba(0,0,0,0.1)] transition-colors",
        resolvedNoteClass,
        layout === "grid" ? "mx-auto" : "",
        onDoubleClick ? "cursor-pointer" : "",
      )}
      onDoubleClick={onDoubleClick}
    >
      <div
        className={cn(
          "absolute top-0 h-4 w-[60px] -translate-y-1/2",
          resolvedTapeClass,
        )}
        style={{
          left: `${tapeOffset}%`,
          transform: `translate(-50%, -50%) rotate(${tapeRotation}deg)`,
        }}
      />

      <div
        className={cn(
          "w-full text-[14px] font-medium leading-[22px] text-black",
          "[&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
          "[&_p]:mb-2 [&_p:last-child]:mb-0",
          "[&_s]:text-[#848691] [&_strong]:font-semibold",
          "[&_u]:underline [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
        )}
        dangerouslySetInnerHTML={{ __html: comment.content }}
      />

      <div className="flex w-full items-center gap-2">
        <AppAvatar
          avatarUrl={comment.author.avatarUrl}
          className="size-[30px] shrink-0"
          name={comment.author.displayName}
          size="sm"
          userId={comment.author.id}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-[6px] text-[12px] leading-[12px]">
          <p className="truncate text-[#000311]">
            {comment.author.displayName}
          </p>
          <p className="truncate text-[#848691]">{comment.createdAt}</p>
        </div>

        <button
          className={cn(
            "flex h-6 shrink-0 items-center justify-end gap-1 rounded-[36px] transition-transform",
            likeDisabled
              ? "cursor-default opacity-60"
              : "hover:scale-[1.05] active:scale-95",
          )}
          data-comment-action="true"
          disabled={likeDisabled}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onLikeClick?.();
          }}
        >
          <HeartIcon
            className={cn(
              "size-4 transition-all",
              comment.likedByMe
                ? "fill-[#ff266f] text-[#ff266f]"
                : "fill-transparent text-[#848691]",
            )}
          />
          {comment.likeCount > 0 ? (
            <span
              className={cn(
                "text-[16px] leading-4",
                comment.likedByMe ? "text-[#ff266f]" : "text-[#848691]",
              )}
            >
              {comment.likeCount}
            </span>
          ) : null}
        </button>
      </div>
    </article>
  );
}

export default memo(CommentCard);
