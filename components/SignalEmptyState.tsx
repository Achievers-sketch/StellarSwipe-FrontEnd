"use client";

import { motion } from "framer-motion";
import { BookOpen, RadioTower, RefreshCw, SearchX, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type EmptyStateVariant = "no-signals" | "no-results";

interface SignalEmptyStateProps {
  /** Controls which copy and icon are shown.
   *  - "no-signals"  — initial load / no signals published yet (default)
   *  - "no-results"  — active filters returned zero matches
   */
  variant?: EmptyStateVariant;
  onRefresh: () => void;
}

const VARIANTS: Record<
  EmptyStateVariant,
  {
    Icon: React.ElementType;
    heading: string;
    body: string;
    ariaLabel: string;
  }
> = {
  "no-signals": {
    Icon: RadioTower,
    heading: "No signals available right now",
    body: "New signals appear as providers publish them. Follow providers to get notified first.",
    ariaLabel: "No signals available",
  },
  "no-results": {
    Icon: SearchX,
    heading: "No signals match your filters",
    body: "Try adjusting or clearing your filters to see more signals.",
    ariaLabel: "No signals match the current filters",
  },
};

export function SignalEmptyState({
  variant = "no-signals",
  onRefresh,
}: SignalEmptyStateProps) {
  const { Icon, heading, body, ariaLabel } = VARIANTS[variant];

  return (
    <motion.div
      role="status"
      aria-label={ariaLabel}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-white/10 bg-slate-900/60 px-6 py-16 text-center"
    >
      {/* Icon */}
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-slate-800/80"
        aria-hidden="true"
      >
        <Icon className="h-8 w-8 text-sky-400/70" />
      </div>

      {/* Copy */}
      <div className="max-w-xs">
        <p className="text-base font-semibold text-white">{heading}</p>
        <p className="mt-1.5 text-sm text-foreground-muted">{body}</p>
      </div>

      {/* CTAs */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="sm" variant="outline" onClick={onRefresh} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          {variant === "no-results" ? "Clear & Refresh" : "Refresh"}
        </Button>

        {variant === "no-signals" && (
          <Button size="sm" asChild className="gap-2">
            <Link href="/providers">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              Follow Providers
            </Link>
          </Button>
        )}

        <Button size="sm" variant="outline" asChild className="gap-2">
          <a
            href="https://docs.stellarswipe.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Browse Docs
          </a>
        </Button>
      </div>
    </motion.div>
  );
}
