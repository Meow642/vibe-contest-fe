import { create } from "zustand";

export interface DragPosition {
  actorId: number;
  rotation: number;
  x: number;
  y: number;
}

interface DragState {
  activeSelf: Record<number, true>;
  clear: (id: number) => void;
  clearAll: () => void;
  clearSelfActive: (id: number) => void;
  positions: Record<number, DragPosition>;
  setPosition: (id: number, position: DragPosition) => void;
  setSelfActive: (id: number) => void;
}

export const useDragStore = create<DragState>((set) => ({
  activeSelf: {},
  clear: (id) =>
    set((state) => {
      if (!(id in state.positions)) {
        return state;
      }
      const next = { ...state.positions };
      delete next[id];
      return { positions: next };
    }),
  clearAll: () => set({ activeSelf: {}, positions: {} }),
  clearSelfActive: (id) =>
    set((state) => {
      if (!state.activeSelf[id]) {
        return state;
      }
      const next = { ...state.activeSelf };
      delete next[id];
      return { activeSelf: next };
    }),
  positions: {},
  setPosition: (id, position) =>
    set((state) => ({
      positions: {
        ...state.positions,
        [id]: position,
      },
    })),
  setSelfActive: (id) =>
    set((state) =>
      state.activeSelf[id]
        ? state
        : { activeSelf: { ...state.activeSelf, [id]: true } },
    ),
}));
