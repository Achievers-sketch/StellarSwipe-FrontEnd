"use client";

import { Flame, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { FeedSortOrder, useSignalFilterStore } from "@/store/useSignalFilterStore";

interface SortOption {
  value: FeedSortOrder;
  label: string;
  icon: React.ElementType;
  description: string;
}

const SORT_OPTIONS: SortOption[] = [
  {
    value: "latest",
    label: "Latest",
    icon: Clock,
    description: "Most recently published signals",
  },
  {
    value: "hot",
    label: "Hot",
    icon: Flame,
    description: "Signals with the highest recent engagement",
  },
  {
    value: "relevant",
    label: "Relevant",
    icon: Sparkles,
    description: "Signals best matching your filters",
  },
];

interface SignalSortControlsProps {
  className?: string;
}

export function SignalSortControls({ className }: SignalSortControlsProps) {
  const { sortOrder, setSortOrder } = useSignalFilterStore();

  return (
    <div
      role="group"
      aria-label="Sort signals"
      className={cn("flex items-center gap-1", className)}
    >
      {SORT_OPTIONS.map(({ value, label, icon: Icon, description }) => {
        const isActive = sortOrder === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setSortOrder(value)}
            aria-pressed={isActive}
            title={description}
            aria-label={`Sort by ${label}: ${description}`}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
              isActive
                ? value === "hot"
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                  : value === "relevant"
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                  : "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                : "bg-white/5 text-slate-400 border border-white/10 hover:border-white/20 hover:text-slate-300"
            )}
          >
            <Icon
              size={12}
              aria-hidden="true"
              className={cn(
                isActive
                  ? value === "hot"
                    ? "text-orange-400"
                    : value === "relevant"
                    ? "text-purple-400"
                    : "text-sky-400"
                  : "text-slate-500"
              )}
            />
            <span className="hidden sm:inline">{label}</span>
            {/* Mobile: icon only, label via aria-label */}
            <span className="sm:hidden">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
