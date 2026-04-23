import { create } from "zustand";

export interface DragPosition {
  actorId: number;
  rotation: number;
  x: number;
  y: number;
}

interface DragState {
  clear: (id: number) => void;
  clearAll: () => void;
  positions: Record<number, DragPosition>;
  setPosition: (id: number, position: DragPosition) => void;
}

export const useDragStore = create<DragState>((set) => ({
  clear: (id) =>
    set((state) => {
      const next = { ...state.positions };
      delete next[id];
      return { positions: next };
    }),
  clearAll: () => set({ positions: {} }),
  positions: {},
  setPosition: (id, position) =>
    set((state) => ({
      positions: {
        ...state.positions,
        [id]: position,
      },
    })),
}));
