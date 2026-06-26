import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BookmarkState {
  bookmarks: string[];
  hasBookmark: (id: string) => boolean;
  addBookmark: (id: string) => void;
  removeBookmark: (id: string) => void;
  toggleBookmark: (id: string) => void;
  setBookmarks: (ids: string[]) => void;
  clearBookmarks: () => void;
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      hasBookmark: (id: string) => get().bookmarks.includes(id),
      addBookmark: (id: string) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(id)
            ? state.bookmarks
            : [...state.bookmarks, id],
        })),
      removeBookmark: (id: string) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((bookmark) => bookmark !== id),
        })),
      toggleBookmark: (id: string) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(id)
            ? state.bookmarks.filter((bookmark) => bookmark !== id)
            : [...state.bookmarks, id],
        })),
      setBookmarks: (ids: string[]) => set({ bookmarks: [...new Set(ids)] }),
      clearBookmarks: () => set({ bookmarks: [] }),
    }),
    { name: "signal-bookmarks" }
  )
);
