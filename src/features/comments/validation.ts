import { COMMENT_COLORS, LOGICAL_CANVAS_HEIGHT, LOGICAL_CANVAS_WIDTH } from "./constants";
import type { CommentColor } from "./types";

const CONTENT_ERROR = "content is required and must be 1-2000 chars (plain text)";
const COLOR_ERROR = `color must be one of: ${COMMENT_COLORS.join(", ")}`;

function stripHtmlToText(html: string) {
  if (typeof window !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent?.replace(/\u00a0/g, " ").trim() ?? "";
  }

  return html.replace(/<[^>]*>/g, "").replace(/\u00a0/g, " ").trim();
}

export function validateCommentContent(html: string) {
  const plainText = stripHtmlToText(html);

  if (!plainText || plainText.length > 2000 || html.length > 5000) {
    return CONTENT_ERROR;
  }

  return undefined;
}

export function validateCommentX(x: number) {
  if (!Number.isFinite(x) || x < 0 || x > LOGICAL_CANVAS_WIDTH) {
    return `x must be a number in [0, ${LOGICAL_CANVAS_WIDTH}]`;
  }

  return undefined;
}

export function validateCommentY(y: number) {
  if (!Number.isFinite(y) || y < 0 || y > LOGICAL_CANVAS_HEIGHT) {
    return `y must be a number in [0, ${LOGICAL_CANVAS_HEIGHT}]`;
  }

  return undefined;
}

export function validateCommentRotation(rotation: number) {
  if (!Number.isFinite(rotation) || rotation < -30 || rotation > 30) {
    return "rotation must be a number in [-30, 30]";
  }

  return undefined;
}

export function validateCommentColor(color: CommentColor) {
  if (!COMMENT_COLORS.includes(color)) {
    return COLOR_ERROR;
  }

  return undefined;
}

export function mapCommentApiError(message: string) {
  if (message === CONTENT_ERROR) {
    return { content: "内容不能为空，且纯文本长度需在 1-2000 字之间" };
  }

  if (message === COLOR_ERROR) {
    return { form: "便签颜色无效，请重新选择" };
  }

  if (message.startsWith("x must be")) {
    return { form: "便签横向位置无效，请重新打开弹框后再试" };
  }

  if (message.startsWith("y must be")) {
    return { form: "便签纵向位置无效，请重新打开弹框后再试" };
  }

  if (message.startsWith("rotation must be")) {
    return { form: "便签角度无效，请重新打开弹框后再试" };
  }

  return { form: message };
}
