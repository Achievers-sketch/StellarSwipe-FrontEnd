"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { Signal } from "@/lib/api";

interface Props {
  signal: Signal;
  expanded: boolean;
  onToggle: () => void;
}

export function SignalCard({ signal, expanded, onToggle }: Props) {
  return (
    <li className="rounded-xl border text-sm overflow-hidden">
      {/* Collapsed row */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex justify-between items-center hover:bg-muted/40 transition-colors"
      >
        <span className="font-medium">{signal.asset}</span>
        <span className={signal.action === "BUY" ? "text-green-500" : "text-red-500"}>
          {signal.action}
        </span>
        <span className="text-muted-foreground">{signal.confidence}%</span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 flex flex-col gap-3 border-t pt-3">
              {signal.rationale && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Rationale</p>
                  <p className="text-sm">{signal.rationale}</p>
                </div>
              )}

              {signal.stats && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Stats</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Entry</span>
                    <span>{signal.stats.entryPrice}</span>
                    <span className="text-muted-foreground">Target</span>
                    <span className="text-green-500">{signal.stats.targetPrice}</span>
                    <span className="text-muted-foreground">Stop Loss</span>
                    <span className="text-red-500">{signal.stats.stopLoss}</span>
                    <span className="text-muted-foreground">R/R</span>
                    <span>{signal.stats.riskReward}</span>
                  </div>
                </div>
              )}

              {signal.providerNotes && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Provider Notes</p>
                  <p className="text-sm text-muted-foreground">{signal.providerNotes}</p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {new Date(signal.timestamp).toLocaleString()}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
