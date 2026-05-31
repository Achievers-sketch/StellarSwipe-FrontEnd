import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FilterDirection = "ALL" | "BUY" | "SELL";
export type FeedSortOrder = "latest" | "hot" | "relevant";

interface SignalFilterState {
  direction: FilterDirection;
  asset: string;
  provider: string;
  bookmarkedOnly: boolean;
  sortOrder: FeedSortOrder;
  setDirection: (d: FilterDirection) => void;
  setAsset: (a: string) => void;
  setProvider: (p: string) => void;
  setBookmarkedOnly: (selected: boolean) => void;
  setSortOrder: (o: FeedSortOrder) => void;
  reset: () => void;
}

export const useSignalFilterStore = create<SignalFilterState>()(
  persist(
    (set) => ({
      direction: "ALL",
      asset: "",
      provider: "",
      bookmarkedOnly: false,
      sortOrder: "latest",
      setDirection: (direction) => set({ direction }),
      setAsset: (asset) => set({ asset }),
      setProvider: (provider) => set({ provider }),
      setBookmarkedOnly: (selected) => set({ bookmarkedOnly: selected }),
      setSortOrder: (sortOrder) => set({ sortOrder }),
      reset: () =>
        set({
          direction: "ALL",
          asset: "",
          provider: "",
          bookmarkedOnly: false,
          sortOrder: "latest",
        }),
    }),
    { name: "signal-filter-store" }
  )
);
