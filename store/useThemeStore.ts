"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  _hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Default to "dark"; the blocking inline script in layout.tsx overrides
      // this at paint time based on the persisted value or system preference.
      theme: "dark",
      _hasHydrated: false,
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
      setTheme: (theme) => set({ theme }),
      toggle: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
    }),
    {
      name: "stellar-theme",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/** Returns `true` once localStorage has been read and state is stable. */
export const useThemeHydrated = () => useThemeStore((s) => s._hasHydrated);
