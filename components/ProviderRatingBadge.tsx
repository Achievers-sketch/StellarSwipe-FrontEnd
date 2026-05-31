"use client";

import { useState } from "react";
import { Star, ShieldCheck, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProviderRatingBadgeProps {
  /** Trust/reputation score 0–100 */
  trustScore?: number;
  /** Win rate percentage 0–100 */
  winRate?: number;
  /** Provider display name */
  providerName?: string;
  /** Total signals published */
  totalSignals?: number;
  /** Compact mode for mobile / tight layouts */
  compact?: boolean;
  className?: string;
}

/**
 * Derives a 1–5 star rating from a 0–100 trust score.
 */
function scoreToStars(score: number): number {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  return 1;
}

/**
 * Returns a colour class and label based on the trust score tier.
 */
function scoreTier(score: number): { color: string; label: string } {
  if (score >= 90) return { color: "text-emerald-400", label: "Highly Trusted" };
  if (score >= 75) return { color: "text-sky-400", label: "Trusted" };
  if (score >= 60) return { color: "text-yellow-400", label: "Moderate" };
  if (score >= 40) return { color: "text-orange-400", label: "Caution" };
  return { color: "text-red-400", label: "Low Trust" };
}

export function ProviderRatingBadge({
  trustScore,
  winRate,
  providerName,
  totalSignals,
  compact = false,
  className,
}: ProviderRatingBadgeProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  // Nothing to show if no rating data is available
  if (trustScore === undefined && winRate === undefined) return null;

  const score = trustScore ?? winRate ?? 0;
  const stars = scoreToStars(score);
  const { color, label } = scoreTier(score);

  const tooltipId = `provider-rating-tooltip-${providerName ?? "unknown"}`;

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      {/* ── Compact pill (mobile / card header) ── */}
      {compact ? (
        <button
          type="button"
          aria-describedby={tooltipId}
          aria-label={`Provider rating: ${label}, ${stars} out of 5 stars`}
          className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          onMouseEnter={() => setTooltipOpen(true)}
          onMouseLeave={() => setTooltipOpen(false)}
          onFocus={() => setTooltipOpen(true)}
          onBlur={() => setTooltipOpen(false)}
        >
          <ShieldCheck size={11} className={color} aria-hidden="true" />
          <span className={color}>{stars}★</span>
        </button>
      ) : (
        /* ── Full badge (desktop / provider profile) ── */
        <button
          type="button"
          aria-describedby={tooltipId}
          aria-label={`Provider rating: ${label}, ${stars} out of 5 stars${winRate !== undefined ? `, ${winRate}% win rate` : ""}`}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          onMouseEnter={() => setTooltipOpen(true)}
          onMouseLeave={() => setTooltipOpen(false)}
          onFocus={() => setTooltipOpen(true)}
          onBlur={() => setTooltipOpen(false)}
        >
          <ShieldCheck size={13} className={color} aria-hidden="true" />
          <span className={color}>{label}</span>
          {/* Star row */}
          <span className="flex items-center gap-0.5" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={10}
                className={i < stars ? "fill-yellow-400 text-yellow-400" : "text-white/20"}
              />
            ))}
          </span>
          {winRate !== undefined && (
            <>
              <span className="text-white/20">·</span>
              <TrendingUp size={11} className="text-emerald-400" aria-hidden="true" />
              <span className="text-emerald-400">{winRate}%</span>
            </>
          )}
          <Info size={11} className="text-white/30" aria-hidden="true" />
        </button>
      )}

      {/* ── Tooltip ── */}
      {tooltipOpen && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-52 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-900 p-3 text-xs shadow-xl shadow-black/40"
        >
          <p className="mb-1 font-semibold text-white">
            {providerName ? `${providerName} · ` : ""}Provider Rating
          </p>
          <div className="space-y-1 text-slate-400">
            <div className="flex items-center justify-between">
              <span>Trust score</span>
              <span className={cn("font-medium", color)}>{score}/100</span>
            </div>
            {winRate !== undefined && (
              <div className="flex items-center justify-between">
                <span>Win rate</span>
                <span className="font-medium text-emerald-400">{winRate}%</span>
              </div>
            )}
            {totalSignals !== undefined && (
              <div className="flex items-center justify-between">
                <span>Total signals</span>
                <span className="font-medium text-white">{totalSignals.toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Stars</span>
              <span className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={10}
                    className={i < stars ? "fill-yellow-400 text-yellow-400" : "text-white/20"}
                  />
                ))}
              </span>
            </div>
          </div>
          {/* Tooltip arrow */}
          <div
            className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
