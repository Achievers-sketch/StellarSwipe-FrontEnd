"use client";

/**
 * DevPerfOverlay
 *
 * A lightweight performance-budget overlay that is ONLY rendered in
 * development builds (process.env.NODE_ENV !== "production").
 *
 * Metrics shown:
 *  - Frame / render time (via requestAnimationFrame delta)
 *  - API latency (last fetch duration, patched via PerformanceObserver)
 *  - React Query cache hit status (stale vs fresh)
 *
 * The overlay is unobtrusive: fixed to the bottom-right corner, semi-transparent,
 * and can be minimised with a single click.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerfMetrics {
  frameMs: number;
  apiLatencyMs: number | null;
  cacheHit: boolean | null;
}

const INITIAL_METRICS: PerfMetrics = {
  frameMs: 0,
  apiLatencyMs: null,
  cacheHit: null,
};

function useFrameTime() {
  const [frameMs, setFrameMs] = useState(0);
  const lastRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    function tick(now: number) {
      if (lastRef.current !== 0) {
        setFrameMs(Math.round(now - lastRef.current));
      }
      lastRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return frameMs;
}

function useApiLatency() {
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    if (typeof PerformanceObserver === "undefined") return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntriesByType("resource") as PerformanceResourceTiming[];
      const apiEntries = entries.filter(
        (e) => e.initiatorType === "fetch" && e.name.includes("/api/")
      );
      if (apiEntries.length > 0) {
        const last = apiEntries[apiEntries.length - 1];
        setLatency(Math.round(last.duration));
      }
    });

    try {
      observer.observe({ type: "resource", buffered: true });
    } catch {
      // PerformanceObserver not supported in this environment
    }

    return () => observer.disconnect();
  }, []);

  return latency;
}

function useCacheHitStatus() {
  const queryClient = useQueryClient();
  const [cacheHit, setCacheHit] = useState<boolean | null>(null);

  useEffect(() => {
    function check() {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      if (queries.length === 0) {
        setCacheHit(null);
        return;
      }
      // A query is a "cache hit" when it has data and is not currently fetching
      const hits = queries.filter((q) => q.state.data !== undefined && !q.state.fetchStatus);
      setCacheHit(hits.length > 0);
    }

    check();
    const unsubscribe = queryClient.getQueryCache().subscribe(check);
    return () => unsubscribe();
  }, [queryClient]);

  return cacheHit;
}

function MetricRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: "good" | "warn" | "bad" | "neutral";
}) {
  const statusColor =
    status === "good"
      ? "text-emerald-400"
      : status === "warn"
      ? "text-yellow-400"
      : status === "bad"
      ? "text-red-400"
      : "text-slate-300";

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className={cn("font-mono font-semibold tabular-nums", statusColor)}>{value}</span>
    </div>
  );
}

export function DevPerfOverlay() {
  // Hard-guard: never render in production
  if (process.env.NODE_ENV === "production") return null;

  return <DevPerfOverlayInner />;
}

function DevPerfOverlayInner() {
  const frameMs = useFrameTime();
  const apiLatency = useApiLatency();
  const cacheHit = useCacheHitStatus();
  const [minimised, setMinimised] = useState(false);

  const frameStatus =
    frameMs === 0
      ? "neutral"
      : frameMs <= 16
      ? "good"
      : frameMs <= 33
      ? "warn"
      : "bad";

  const latencyStatus =
    apiLatency === null
      ? "neutral"
      : apiLatency < 200
      ? "good"
      : apiLatency < 500
      ? "warn"
      : "bad";

  const cacheStatus =
    cacheHit === null ? "neutral" : cacheHit ? "good" : "warn";

  return (
    <div
      role="complementary"
      aria-label="Performance metrics overlay (dev mode only)"
      className={cn(
        "fixed bottom-4 right-4 z-[9999] select-none rounded-xl border border-white/10 bg-slate-950/90 text-[11px] shadow-2xl shadow-black/60 backdrop-blur-sm transition-all",
        minimised ? "w-auto" : "w-52"
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setMinimised((v) => !v)}
        aria-expanded={!minimised}
        aria-label={minimised ? "Expand performance overlay" : "Minimise performance overlay"}
        className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        <span className="flex items-center gap-1.5 font-semibold text-slate-300">
          <Activity size={11} className="text-sky-400" aria-hidden="true" />
          {!minimised && "Perf"}
          <span className="rounded bg-sky-500/20 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-400">
            DEV
          </span>
        </span>
        {minimised ? (
          <ChevronUp size={11} className="text-slate-500" aria-hidden="true" />
        ) : (
          <ChevronDown size={11} className="text-slate-500" aria-hidden="true" />
        )}
      </button>

      {/* Metrics */}
      {!minimised && (
        <div className="border-t border-white/10 px-3 py-2 space-y-1.5">
          <MetricRow
            label="Frame time"
            value={frameMs === 0 ? "—" : `${frameMs} ms`}
            status={frameStatus}
          />
          <MetricRow
            label="API latency"
            value={apiLatency === null ? "—" : `${apiLatency} ms`}
            status={latencyStatus}
          />
          <MetricRow
            label="Cache"
            value={cacheHit === null ? "—" : cacheHit ? "HIT" : "MISS"}
            status={cacheStatus}
          />
          <div className="pt-1 border-t border-white/5 text-[10px] text-slate-600">
            Hidden in production
          </div>
        </div>
      )}
    </div>
  );
}
