import { create } from "zustand";

export type BoardMode = "create" | "pointer" | "drag";

interface BoardModeState {
  mode: BoardMode;
  setMode: (mode: BoardMode) => void;
}

export const useBoardModeStore = create<BoardModeState>((set) => ({
  mode: "drag",
  setMode: (mode) => set({ mode }),
}));
