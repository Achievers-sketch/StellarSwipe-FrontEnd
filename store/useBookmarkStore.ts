import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BookmarkState {
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  clearBookmarks: () => void;
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set) => ({
      bookmarks: [],
      toggleBookmark: (id: string) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(id)
            ? state.bookmarks.filter((bookmark) => bookmark !== id)
            : [...state.bookmarks, id],
        })),
      clearBookmarks: () => set({ bookmarks: [] }),
    }),
    { name: "signal-bookmarks" }
  )
);
