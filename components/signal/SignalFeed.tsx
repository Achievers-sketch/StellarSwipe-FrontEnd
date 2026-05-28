"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/query-core";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SignalEmptyState } from "@/components/SignalEmptyState";
import { SignalFeedFilters } from "@/components/SignalFeedFilters";
import { useSignalFilterStore } from "@/store/useSignalFilterStore";
import type { Signal } from "@/lib/signals";
import { Search, X } from "lucide-react";

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
  const pathname = usePathname();
  // #98: persist scroll position across navigation
  const scrollPosRef = useRef<number>(0);
  const feedRef = useRef<HTMLDivElement | null>(null);

  // #99: provider search state (persisted in filter store)
  const { direction, asset, provider, setProvider } = useSignalFilterStore();
  const [providerSearch, setProviderSearch] = useState(provider);

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
    // #98: cache pages for 5 minutes to avoid re-fetching recently viewed content
    staleTime: STALE_TIME,
    // #98: keep previous data while fetching next page for smooth loading
    placeholderData: (prev) => prev,
  });

  const allSignals = useMemo<Signal[]>(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );

  // #99: derive unique provider names from loaded signals
  // Since Signal type has no provider field, we use ticker as a proxy for provider grouping
  const availableProviders = useMemo(
    () => [...new Set(allSignals.map((s) => s.ticker))].sort(),
    [allSignals]
  );

  // #99: filter signals by provider search (matches ticker as provider identifier)
  const signals = useMemo<Signal[]>(() => {
    if (!providerSearch.trim()) return allSignals;
    const q = providerSearch.trim().toLowerCase();
    return allSignals.filter((s) => s.ticker.toLowerCase().includes(q));
  }, [allSignals, providerSearch]);

  // #98: save scroll position before leaving
  useEffect(() => {
    const saved = sessionStorage.getItem(`scroll:${pathname}`);
    if (saved) window.scrollTo(0, parseInt(saved, 10));

    return () => {
      sessionStorage.setItem(`scroll:${pathname}`, String(window.scrollY));
    };
  }, [pathname]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: "240px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, loadMore]);

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
        {/* #98: show consistent loading state */}
        <div className="text-right text-sm text-foreground-muted" aria-live="polite" aria-atomic="true">
          {isFetching && !allSignals.length
            ? "Loading signals..."
            : isFetching
            ? "Refreshing..."
            : "Scroll down to load more."}
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

      {/* Filters */}
      <div className="mb-4">
        <SignalFeedFilters availableProviders={availableProviders} />
      </div>

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
          <SignalEmptyState onRefresh={() => refetch()} />
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
          signals.map((signal) => (
            // #101: accessible article with descriptive aria-label
            <article
              key={signal.id}
              aria-label={`${signal.ticker} ${signal.action} signal, ${signal.confidence}% confidence`}
              className="rounded-3xl border border-white/10 bg-slate-950/90 p-4 shadow-sm shadow-slate-950/20 transition hover:-translate-y-0.5 sm:p-6"
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
            </article>
          ))
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

        {hasNextPage && (
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isFetchingNextPage}
            aria-label={isFetchingNextPage ? "Loading more signals" : "Load more signals"}
          >
            {isFetchingNextPage ? "Loading more..." : "Load more signals"}
          </Button>
        )}
      </div>
    </section>
  );
}
