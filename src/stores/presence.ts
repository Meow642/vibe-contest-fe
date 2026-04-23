import { create } from "zustand";
import type { PresenceUser } from "@/lib/realtime/types";

interface PresenceState {
  users: PresenceUser[];
  joined: (user: PresenceUser) => void;
  left: (userId: number) => void;
  reset: () => void;
  sync: (users: PresenceUser[]) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  users: [],
  joined: (user) =>
    set((state) => {
      const next = new Map(state.users.map((item) => [item.id, item]));
      next.set(user.id, user);
      return {
        users: Array.from(next.values()).sort((a, b) =>
          a.displayName.localeCompare(b.displayName, "zh-CN"),
        ),
      };
    }),
  left: (userId) =>
    set((state) => ({
      users: state.users.filter((user) => user.id !== userId),
    })),
  reset: () => set({ users: [] }),
  sync: (users) =>
    set({
      users: [...users].sort((a, b) =>
        a.displayName.localeCompare(b.displayName, "zh-CN"),
      ),
    }),
}));
