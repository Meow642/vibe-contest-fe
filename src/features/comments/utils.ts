import { toScreen } from "@/features/board/coords";
import type { Comment } from "./types";

export function getCommentWallStyle(comment: Comment) {
  const point = toScreen(comment.x, comment.y, {
    height: 100,
    width: 100,
  });

  return {
    left: `${point.left}%`,
    top: `${point.top}%`,
    transform: `translate(-50%, -50%) rotate(${comment.rotation}deg)`,
  };
}
