"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Default to "dark"; the blocking inline script in layout.tsx overrides
      // this at paint time based on the persisted value or system preference.
      theme: "dark",
      setTheme: (theme) => {
        set({ theme });
        // Keep the <html> class in sync immediately for instant visual feedback
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
      },
      toggle: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        set({ theme: next });
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(next);
      },
    }),
    {
      name: "stellar-theme",
    }
  )
);
