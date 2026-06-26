"use client";

import { useCallback } from "react";
import { toast } from "@/lib/toast";
import { useBookmarkStore } from "@/store/useBookmarkStore";

function showUndoToast({
  title,
  description,
  undoLabel = "Undo",
  onUndo,
}: {
  title: string;
  description: string;
  undoLabel?: string;
  onUndo: () => void;
}) {
  let toastId = "";

  toastId = toast.info(title, {
    description,
    duration: 4500,
    action: {
      label: undoLabel,
      onClick: onUndo,
    },
  });

  return toastId;
}

export function useBookmarkActions() {
  const addBookmark = useBookmarkStore((state) => state.addBookmark);
  const restoreBookmark = useBookmarkStore((state) => state.addBookmark);
  const removeBookmark = useBookmarkStore((state) => state.removeBookmark);
  const toggleBookmark = useBookmarkStore((state) => state.toggleBookmark);
  const hasBookmark = useBookmarkStore((state) => state.hasBookmark);

  const bookmark = useCallback(
    (id: string) => {
      addBookmark(id);
      toast.success("Bookmarked", {
        description: "Saved to your bookmark list.",
        duration: 2500,
      });
    },
    [addBookmark]
  );

  const unbookmark = useCallback(
    (id: string, label: string) => {
      removeBookmark(id);
      const toastId = showUndoToast({
        title: "Bookmark removed",
        description: `${label} was removed from your saved signals.`,
        onUndo: () => restoreBookmark(id),
      });

      return toastId;
    },
    [removeBookmark, restoreBookmark]
  );

  const toggleBookmarkWithUndo = useCallback(
    (id: string, label: string) => {
      if (hasBookmark(id)) {
        return unbookmark(id, label);
      }
      bookmark(id);
      return null;
    },
    [bookmark, hasBookmark, unbookmark]
  );

  return {
    addBookmark: bookmark,
    removeBookmark: unbookmark,
    toggleBookmark: (id: string, label: string) => toggleBookmarkWithUndo(id, label),
    hasBookmark,
    directToggleBookmark: toggleBookmark,
  };
}
