"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/query-core";
import { Button } from "@/components/ui/button";
import { SignalEmptyState } from "@/components/SignalEmptyState";
import { SignalFeedFilters } from "@/components/SignalFeedFilters";
import { SignalSortControls } from "@/components/SignalSortControls";
import { SignalFilterBottomSheet } from "@/components/SignalFilterBottomSheet";
import { PricePrecisionToggle } from "@/components/PricePrecisionToggle";
import { ExpiredSignalBanner } from "@/components/ExpiredSignalBanner";
import { useSignalFilterStore } from "@/store/useSignalFilterStore";
import { useBookmarkStore } from "@/store/useBookmarkStore";
import type { Signal } from "@/lib/signals";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";

interface SignalResponse {
  items: Signal[];
  page: number;
  pageSize: number;
  nextPage: number | null;
  hasMore: boolean;
}

const PAGE_SIZE = 10;
// #98: 5-minute stale time so recently-viewed pages are served from cache
const STALE_TIME = 1000 * 60 * 5;

export function SignalFeed() {
  const feedRef = useRef<HTMLDivElement | null>(null);

  // #99: provider search state (persisted in filter store)
  const {
    direction,
    asset,
    provider,
    bookmarkedOnly,
    sortOrder,
    setProvider,
  } = useSignalFilterStore();
  const bookmarkedIds = useBookmarkStore((state) => state.bookmarks);
  const [providerSearch, setProviderSearch] = useState(provider);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Track whether the last auto-load attempt failed so we can show the manual fallback
  const [autoLoadFailed, setAutoLoadFailed] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    refetch,
  } = useInfiniteQuery<SignalResponse, Error, InfiniteData<SignalResponse, number>>({
    queryKey: ["signals"],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch(`/api/signals?page=${pageParam}&pageSize=${PAGE_SIZE}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Unable to load the signal feed.");
      return response.json() as Promise<SignalResponse>;
    },
    getNextPageParam: (lastPage: SignalResponse) => lastPage.nextPage,
    initialPageParam: 1,
    staleTime: STALE_TIME,
    placeholderData: (prev) => prev,
  });

  const allSignals = useMemo<Signal[]>(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );

  const availableProviders = useMemo(
    () => [...new Set(allSignals.map((s) => s.ticker))].sort(),
    [allSignals]
  );

  const availableAssets = useMemo(
    () => [...new Set(allSignals.map((s) => s.ticker))].sort(),
    [allSignals]
  );

  const filteredSignals = useMemo<Signal[]>(() => {
    let filtered = [...allSignals];
    const searchTerm = providerSearch.trim().toLowerCase();

    if (direction !== "ALL") {
      filtered = filtered.filter((s) => s.action === direction);
    }

    if (asset.trim()) {
      const query = asset.trim().toLowerCase();
      filtered = filtered.filter((s) => s.ticker.toLowerCase().includes(query));
    }

    if (provider.trim()) {
      const query = provider.trim().toLowerCase();
      filtered = filtered.filter((s) => s.ticker.toLowerCase().includes(query));
    }

    if (searchTerm) {
      filtered = filtered.filter((s) => s.ticker.toLowerCase().includes(searchTerm));
    }

    if (bookmarkedOnly) {
      filtered = filtered.filter((s) => bookmarkedIds.includes(s.id));
    }

    return filtered;
  }, [allSignals, direction, asset, provider, providerSearch, bookmarkedOnly, bookmarkedIds]);

  const signals = useMemo<Signal[]>(() => {
    const copy = [...filteredSignals];
    if (sortOrder === "latest") {
      copy.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } else if (sortOrder === "hot") {
      // Hot: highest confidence first (proxy for engagement/heat)
      copy.sort((a, b) => b.confidence - a.confidence);
    } else if (sortOrder === "relevant") {
      // Relevant: BUY/SELL before HOLD, then by confidence
      const actionWeight = (s: Signal) => (s.action === "HOLD" ? 0 : 1);
      copy.sort((a, b) => actionWeight(b) - actionWeight(a) || b.confidence - a.confidence);
    }
    return copy;
  }, [filteredSignals, sortOrder]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const syncStatus = useSyncStatus(isFetching);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      setAutoLoadFailed(false);
      fetchNextPage().catch(() => setAutoLoadFailed(true));
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Manual fallback: called from the button when auto-scroll failed
  const handleManualLoadMore = useCallback(() => {
    setAutoLoadFailed(false);
    fetchNextPage().catch(() => setAutoLoadFailed(true));
  }, [fetchNextPage]);

  useEffect(() => {
    const element = sentinelRef.current;
    // If auto-load previously failed, don't re-trigger via IntersectionObserver
    if (!element || !hasNextPage || isFetchingNextPage || autoLoadFailed) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: "240px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, loadMore, autoLoadFailed]);

  // #99: sync provider search to filter store
  const handleProviderSearch = useCallback((value: string) => {
    setProviderSearch(value);
    setProvider(value);
  }, [setProvider]);

  return (
    <section
      ref={feedRef}
      aria-label="Signal feed"
      className="rounded-3xl border border-white/10 bg-slate-950/80 p-4 shadow-xl shadow-slate-950/10 sm:p-6"
    >
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-400/90">Signal feed</p>
          <h2 className="text-xl font-semibold sm:text-2xl md:text-3xl">Live market signals</h2>
          <p className="max-w-2xl text-sm text-slate-400">
            Browse the latest actionable signals with seamless infinite scrolling.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* Sort controls — persistent across browsing */}
          <SignalSortControls />
          {/* Price precision toggle */}
          <PricePrecisionToggle />
          {/* #98: show consistent loading state */}
          <div className="text-right text-sm text-foreground-muted" aria-live="polite" aria-atomic="true">
            {isFetching && !allSignals.length
              ? "Loading signals..."
              : isFetching
              ? "Refreshing..."
              : "Scroll down to load more."}
          </div>
        </div>
      </div>

      {/* #99: Provider search input */}
      <div className="mb-4">
        <div className="relative flex items-center">
          <Search
            size={14}
            className="absolute left-3 text-slate-500 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={providerSearch}
            onChange={(e) => handleProviderSearch(e.target.value)}
            placeholder="Search provider / ticker…"
            aria-label="Search signals by provider or ticker"
            className="w-full rounded-full bg-white/5 border border-white/10 pl-8 pr-8 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-white/20 transition-colors"
          />
          {providerSearch && (
            <button
              onClick={() => handleProviderSearch("")}
              aria-label="Clear provider search"
              className="absolute right-3 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
        {/* #99: show matching provider count */}
        {providerSearch && (
          <p className="mt-1 text-[11px] text-slate-500" aria-live="polite">
            {signals.length} signal{signals.length !== 1 ? "s" : ""} matching &ldquo;{providerSearch}&rdquo;
          </p>
        )}
      </div>

      {/* Filters — desktop: inline panel; mobile: bottom sheet trigger */}
      <div className="mb-4">
        {/* Mobile filter trigger button */}
        <div className="flex items-center gap-2 sm:hidden mb-3">
          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            aria-label="Open signal filters"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-white/20 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <SlidersHorizontal size={13} aria-hidden="true" />
            Filters
            {(direction !== "ALL" || asset !== "" || provider !== "" || bookmarkedOnly || providerSearch.trim() !== "") && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">
                {[direction !== "ALL", asset !== "", provider !== "", bookmarkedOnly, providerSearch.trim() !== ""].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Desktop: inline filter panel */}
        <div className="hidden sm:block">
          <SignalFeedFilters availableAssets={availableAssets} availableProviders={availableProviders} />
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <SignalFilterBottomSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        availableProviders={availableProviders}
        availableMarkets={availableAssets}
      />

      <div className="space-y-4" role="feed" aria-busy={isLoading} aria-label="Signal list">
        {isError && (
          <div
            role="alert"
            className="rounded-3xl border border-accent-danger/20 bg-accent-danger/10 p-5 text-sm text-accent-danger"
          >
            {error?.message ?? "There was a problem loading the signal feed."}
          </div>
        )}

        {!isLoading && !isError && signals.length === 0 && (
          <SignalEmptyState
            variant={
              direction !== "ALL" ||
              asset.trim() !== "" ||
              provider.trim() !== "" ||
              bookmarkedOnly ||
              providerSearch.trim() !== ""
                ? "no-results"
                : "no-signals"
            }
            onRefresh={() => refetch()}
          />
        )}

        {/* #98: skeleton while loading — consistent loading state */}
        {isLoading ? (
          <div className="space-y-4" aria-label="Loading signals" aria-busy="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-3xl border border-white/10 bg-slate-900/80 p-4 sm:p-6"
                aria-hidden="true"
              >
                <div className="mb-4 h-6 w-3/5 rounded-xl bg-surface-high" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="h-5 rounded-xl bg-surface-high" />
                  <div className="h-5 rounded-xl bg-surface-high" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          signals.map((signal) => {
            const isExpired =
              !!signal.expiresAt && new Date(signal.expiresAt) < new Date();

            return (
              // #101: accessible article with descriptive aria-label
              <article
                key={signal.id}
                aria-label={`${signal.ticker} ${signal.action} signal, ${signal.confidence}% confidence${isExpired ? ", expired" : ""}`}
                className="rounded-3xl border border-white/10 bg-slate-950/90 p-4 shadow-sm shadow-slate-950/20 transition hover:-translate-y-0.5 sm:p-6"
              >
                {/* Expired banner — shown above content, clearly visible */}
                {isExpired && (
                  <div className="mb-3">
                    <ExpiredSignalBanner onRefresh={() => refetch()} />
                  </div>
                )}

                <div
                  className={isExpired ? "opacity-60 pointer-events-none select-none" : ""}
                  aria-hidden={isExpired}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-foreground-muted">
                        <time dateTime={signal.timestamp}>
                          {new Date(signal.timestamp).toLocaleString()}
                        </time>
                      </p>
                      <h3 className="mt-2 text-base font-semibold tracking-tight text-white sm:text-xl">
                        {signal.ticker} • {signal.action}
                      </h3>
                    </div>
                    {/* #101: confidence badge with aria-label */}
                    <div
                      className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-sky-300 sm:px-4 sm:py-2 sm:text-sm"
                      aria-label={`Confidence: ${signal.confidence} percent`}
                    >
                      Confidence {signal.confidence}%
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-foreground-muted">{signal.details}</p>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="mt-6 flex flex-col items-center gap-4">
        <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />

        {isFetchingNextPage && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground-muted"
          >
            Loading more signals...
          </div>
        )}

        {!hasNextPage && signals.length > 0 && (
          <p className="text-center text-sm text-foreground-subtle" aria-live="polite">
            You&apos;ve reached the end of the feed.
          </p>
        )}

        {/* Fallback button: shown when auto-scroll failed OR as a manual preference */}
        {hasNextPage && (autoLoadFailed || !isFetchingNextPage) && (
          <div className="flex flex-col items-center gap-2">
            {autoLoadFailed && (
              <p className="text-xs text-amber-400" role="alert" aria-live="assertive">
                Auto-load failed. Load more manually.
              </p>
            )}
            <Button
              variant="outline"
              onClick={handleManualLoadMore}
              disabled={isFetchingNextPage}
              aria-label={isFetchingNextPage ? "Loading more signals" : "Load more signals"}
            >
              {isFetchingNextPage ? "Loading more..." : "Load more signals"}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
