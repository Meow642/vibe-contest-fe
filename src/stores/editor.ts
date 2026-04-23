import { create } from "zustand";
import { getDefaultCommentPosition } from "@/features/comments/constants";
import type { Comment } from "@/features/comments/types";

interface EditorPosition {
  x: number;
  y: number;
}

interface EditorState {
  close: () => void;
  commentId: number | null;
  initialContent: string;
  mode: "create" | "edit";
  open: boolean;
  openCreate: (position: EditorPosition) => void;
  openEdit: (comment: Comment) => void;
  position: EditorPosition;
}

const defaultPosition = getDefaultCommentPosition();

export const useEditorStore = create<EditorState>((set) => ({
  close: () =>
    set({
      commentId: null,
      initialContent: "",
      mode: "create",
      open: false,
      position: defaultPosition,
    }),
  commentId: null,
  initialContent: "",
  mode: "create",
  open: false,
  openCreate: (position) =>
    set({
      commentId: null,
      initialContent: "",
      mode: "create",
      open: true,
      position,
    }),
  openEdit: (comment) =>
    set({
      commentId: comment.id,
      initialContent: comment.content,
      mode: "edit",
      open: true,
      position: { x: comment.x, y: comment.y },
    }),
  position: defaultPosition,
}));
