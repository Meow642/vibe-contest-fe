import type { CommentColor } from "./types";

export const LOGICAL_CANVAS_WIDTH = 4000;
export const LOGICAL_CANVAS_HEIGHT = 3000;

export const DEFAULT_COMMENTS_QUERY = {
  limit: 500,
  offset: 0,
} as const;

export const COMMENT_COLORS = [
  "pink",
  "yellow",
  "green",
  "blue",
  "purple",
  "orange",
] as const satisfies readonly CommentColor[];

export const COMMENT_COLOR_META: Record<
  CommentColor,
  {
    label: string;
    noteClassName: string;
    tapeClassName: string;
    dotClassName: string;
  }
> = {
  pink: {
    label: "樱粉",
    noteClassName: "bg-[#ffdfe6]",
    tapeClassName: "bg-[#ffe387]",
    dotClassName: "bg-[#ffc9d4]",
  },
  yellow: {
    label: "奶黄",
    noteClassName: "bg-[#fff7d4]",
    tapeClassName: "bg-[#9ed0ff]",
    dotClassName: "bg-[#fff1b8]",
  },
  green: {
    label: "薄荷",
    noteClassName: "bg-[#e1fce4]",
    tapeClassName: "bg-[#9ed0ff]",
    dotClassName: "bg-[#32c95a]",
  },
  blue: {
    label: "湖蓝",
    noteClassName: "bg-[#cce8ff]",
    tapeClassName: "bg-[#feadff]",
    dotClassName: "bg-[#69b1ff]",
  },
  purple: {
    label: "淡紫",
    noteClassName: "bg-[#ebe0ff]",
    tapeClassName: "bg-[#ffc88c]",
    dotClassName: "bg-[#c3abff]",
  },
  orange: {
    label: "杏橙",
    noteClassName: "bg-[#ffebd4]",
    tapeClassName: "bg-[#a8f7ef]",
    dotClassName: "bg-[#ffc88c]",
  },
};

export function pickRandomCommentColor() {
  const index = Math.floor(Math.random() * COMMENT_COLORS.length);
  return COMMENT_COLORS[index];
}

export function getDefaultCommentPosition() {
  return {
    x: LOGICAL_CANVAS_WIDTH / 2,
    y: LOGICAL_CANVAS_HEIGHT / 2 - 220,
  };
}

export function pickRandomCommentRotation() {
  return Number(((Math.random() - 0.5) * 12).toFixed(1));
}
