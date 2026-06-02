"use client";

import { useEffect } from "react";
import { ThumbsUp, ThumbsDown, Sparkles } from "lucide-react";
import { useRecommendationStore } from "@/store/useRecommendationStore";
import { computeRecommendations } from "@/services/recommendationEngine";
import type { Signal } from "@/lib/types";

interface SignalRecommendationsProps {
  signals: Signal[];
  onSelectSignal?: (signal: Signal) => void;
}

/**
 * Personalised signal suggestions in the feed header (#171)
 */
export function SignalRecommendations({ signals, onSelectSignal }: SignalRecommendationsProps) {
  const { settings, recommendations, feedback, addFeedback, setRecommendations } = useRecommendationStore();

  useEffect(() => {
    if (settings.enabled && settings.privacyAccepted && signals.length > 0) {
      computeRecommendations(signals);
    } else {
      setRecommendations([]);
    }
  }, [signals, settings.enabled, settings.privacyAccepted, settings.riskProfile]);

  if (!settings.enabled || !settings.privacyAccepted || recommendations.length === 0) return null;

  return (
    <section aria-label="Recommended signals" className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles size={14} className="text-blue-500" />
        <span>Recommended for You</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {recommendations.map((rec) => {
          const signal = signals.find((s) => s.id === rec.signalId);
          if (!signal) return null;
          const userFeedback = feedback.find((f) => f.signalId === rec.signalId);

          return (
            <div
              key={rec.signalId}
              className="shrink-0 rounded-xl border bg-card p-3 w-52 space-y-1.5 cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => onSelectSignal?.(signal)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onSelectSignal?.(signal)}
              aria-label={`Recommended: ${signal.asset} ${signal.direction}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{signal.asset}</span>
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    signal.direction === "BUY" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                  }`}
                >
                  {signal.direction}
                </span>
              </div>

              <div className="text-xs text-muted-foreground">
                Score: <span className="font-medium text-foreground">{rec.score}</span>
              </div>

              {/* Reasons */}
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {rec.reasons.slice(0, 2).map((r, i) => (
                  <li key={i} className="flex gap-1">
                    <span>•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>

              {/* Feedback */}
              <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => addFeedback(rec.signalId, true)}
                  aria-label="Like recommendation"
                  className={`p-1 rounded hover:bg-green-500/20 transition-colors ${userFeedback?.liked === true ? "text-green-500" : "text-muted-foreground"}`}
                >
                  <ThumbsUp size={12} />
                </button>
                <button
                  onClick={() => addFeedback(rec.signalId, false)}
                  aria-label="Dislike recommendation"
                  className={`p-1 rounded hover:bg-red-500/20 transition-colors ${userFeedback?.liked === false ? "text-red-500" : "text-muted-foreground"}`}
                >
                  <ThumbsDown size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
