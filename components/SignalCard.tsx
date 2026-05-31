"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
  PanInfo,
} from "framer-motion";
import { TrendingUp, TrendingDown, Minus, X, Zap, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignalBadge } from "@/components/SignalBadge";
import { SignalTimestamp } from "@/components/SignalTimestamp";
import { TradeSkeleton } from "@/components/TradeSkeleton";
import { TradeModal } from "@/components/TradeModal";
import { SignalConflictNotice, type SignalConflictReason } from "@/components/SignalConflictNotice";
import { cn } from "@/lib/utils";
import { MiniChart } from "./chart/MiniChart";
import { PremiumSignalBadge } from "@/components/PremiumSignalBadge";
import { ProviderRatingBadge } from "@/components/ProviderRatingBadge";
import { useDemoModeStore } from "@/store/useDemoModeStore";
import analyticsService from "@/services/analytics";

interface ROIPoint {
  value: number;
}

interface SignalCardProps {
  loading?: boolean;
  pair?: string;
  executionPrice?: number;
  confidence?: number;
  projectedTarget?: number;
  roiHistory?: ROIPoint[];
  analysis?: string;
  signal?: "BUY" | "SELL";
  timestamp?: Date;
  providerStake?: number;
  providerReputation?: number;
  isPremium?: boolean;
  hasAccess?: boolean;
  requiredStake?: number;
  conflictReason?: SignalConflictReason;
  onTrade?: (pair: string, price: number) => void;
  onPass?: () => void;
}

const DEFAULT_ROI: ROIPoint[] = [
  { value: 0 },
  { value: 1.2 },
  { value: 0.8 },
  { value: 2.1 },
  { value: 1.9 },
  { value: 3.4 },
  { value: 2.8 },
  { value: 4.2 },
];

const SWIPE_THRESHOLD = 120;
const VELOCITY_THRESHOLD = 780;

export function SignalCard({
  loading = false,
  pair = "XLM/USDC",
  executionPrice = 0.4821,
  confidence = 87,
  projectedTarget = 0.5310,
  roiHistory = DEFAULT_ROI,
  analysis = "Momentum building after a strong volume breakout above the 50-day MA. RSI at 62 with room to run.",
  signal = "BUY",
  timestamp = new Date(Date.now() - 5 * 60 * 1000),
  providerStake,
  providerReputation,
  isPremium = false,
  hasAccess = true,
  requiredStake = 1000,
  conflictReason,
  onTrade,
  onPass,
}: SignalCardProps) {
  const [dismissed, setDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { isDemoMode } = useDemoModeStore();
  const executingRef = useRef(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-18, 18]);

  const tradeOpacity = useTransform(x, [30, SWIPE_THRESHOLD], [0, 1]);
  const passOpacity = useTransform(x, [-30, -SWIPE_THRESHOLD], [0, 1]);

  if (loading) return <TradeSkeleton />;

  const roi = (((projectedTarget - executionPrice) / executionPrice) * 100).toFixed(2);
  const isPositive = parseFloat(roi) >= 0;
  const DirectionIcon = signal === "BUY" ? TrendingUp : signal === "SELL" ? TrendingDown : Minus;

  function handlePass() {
    setDismissed(true);
    analyticsService.track("swipe_action", {
      direction: "pass",
      signal_id: pair,
    });
    onPass?.();
  }

  function handleExecuteTrade() {
    if (executingRef.current) return;
    executingRef.current = true;
    analyticsService.track("swipe_action", {
      direction: "trade",
      signal_id: pair,
    });
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    executingRef.current = false;
  }

  function handleModalConfirm() {
    setModalOpen(false);
    executingRef.current = false;
    onTrade?.(pair, executionPrice);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      if (e.key === "ArrowLeft") handlePass();
      else handleExecuteTrade();
    }
  }

  function handleCopyLink() {
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}?signal=${pair}&price=${executionPrice}&target=${projectedTarget}&signal_type=${signal}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedFeedback(true);
    setShowShareMenu(false);
  }

  function handleShare() {
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}?signal=${pair}&price=${executionPrice}&target=${projectedTarget}&signal_type=${signal}`;
    const shareText = `Check out this ${signal} signal for ${pair} on StellarSwipe: ${shareUrl}`;

    if (navigator.share) {
      navigator.share({
        title: "StellarSwipe Signal",
        text: shareText,
        url: shareUrl,
      }).catch((err) => {
        if (err.name !== "AbortError") console.error("Share failed:", err);
      });
    } else {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      window.open(twitterUrl, "_blank", "width=550,height=420");
    }
    setShowShareMenu(false);
  }

  useEffect(() => {
    if (!copiedFeedback) return;
    const timer = window.setTimeout(() => setCopiedFeedback(false), 2000);
    return () => clearTimeout(timer);
  }, [copiedFeedback]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    }

    if (showShareMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showShareMenu]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;
    const fastSwipe = Math.abs(velocityX) > VELOCITY_THRESHOLD && Math.abs(offsetX) > 40;

    if (
      offsetX > SWIPE_THRESHOLD ||
      (offsetX > SWIPE_THRESHOLD * 0.4 && velocityX > VELOCITY_THRESHOLD) ||
      (fastSwipe && velocityX > 0)
    ) {
      handleExecuteTrade();
    } else if (
      offsetX < -SWIPE_THRESHOLD ||
      (offsetX < -SWIPE_THRESHOLD * 0.4 && velocityX < -VELOCITY_THRESHOLD) ||
      (fastSwipe && velocityX < 0)
    ) {
      handlePass();
    }
    setIsDragging(false);
  }

  function handleDragStart() {
    setIsDragging(true);
  }

  return (
    <li className="rounded-xl border text-sm overflow-hidden">
      {/* Collapsed row */}
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`signal-details-${signal.id}`}
        aria-label={`${signal.asset} ${signal.action} ${signal.confidence}% confidence — ${expanded ? "collapse" : "expand"} details`}
        className="w-full p-4 flex justify-between items-center hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="font-medium">{signal.asset}</span>
        <span className={signal.action === "BUY" ? "text-green-600" : "text-red-600"}>
          {signal.action}
        </span>
        <span className="text-muted-foreground">{signal.confidence}%</span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground"
          aria-hidden="true"
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          className="relative w-full select-none"
          style={{ x, rotate, touchAction: "pan-y" }}
          drag="x"
          dragSnapToOrigin
          dragMomentum={false}
          dragDirectionLock
          dragElastic={0.08}
          dragConstraints={{ left: 0, right: 0 }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          exit={{ x: 0, opacity: 0, scale: 0.85, transition: { duration: 0.25 } }}
          whileTap={{ cursor: "grabbing" }}
        >
          <motion.div
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-start rounded-2xl border-2 border-green-500 bg-green-500/10 pl-6"
            style={{ opacity: tradeOpacity }}
            aria-hidden="true"
          >
            <span className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-bold text-white shadow">
              <Check size={15} /> TRADE
            </span>
          </motion.div>

          <motion.div
            key="details"
            id={`signal-details-${signal.id}`}
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
                    <span className="text-green-600">{signal.stats.targetPrice}</span>
                    <span className="text-muted-foreground">Stop Loss</span>
                    <span className="text-red-600">{signal.stats.stopLoss}</span>
                    <span className="text-muted-foreground">R/R</span>
                    <span>{signal.stats.riskReward}</span>
                  </div>
                </div>
              )}
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-end rounded-2xl border-2 border-red-500 bg-red-500/10 pr-6"
            style={{ opacity: passOpacity }}
            aria-hidden="true"
          >
            <span className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-bold text-white shadow">
              <X size={15} /> PASS
            </span>
          </motion.div>

          <article
            className={cn(
              "w-full rounded-2xl border bg-card p-4 shadow-sm flex flex-col gap-3 sm:p-5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 focus-within:ring-offset-background",
              isDragging ? "ring-2 ring-blue-500/20" : ""
            )}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            role="article"
            aria-label={`${signal} signal for ${pair} at ${executionPrice} with ${confidence}% confidence`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-base sm:text-lg">{pair}</span>
                {isPremium && (
                  <PremiumSignalBadge hasAccess={hasAccess} requiredStake={requiredStake} />
                )}
                {/* Provider rating — compact on mobile, full on sm+ */}
                <span className="sm:hidden">
                  <ProviderRatingBadge
                    trustScore={providerReputation}
                    winRate={providerReputation}
                    compact
                  />
                </span>
                <span className="hidden sm:inline-flex">
                  <ProviderRatingBadge
                    trustScore={providerReputation}
                    winRate={providerReputation}
                    totalSignals={providerStake ? Math.round(providerStake / 100) : undefined}
                  />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative" ref={shareMenuRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowShareMenu((value) => !value)}
                    aria-label={`Share ${pair} signal`}
                    aria-expanded={showShareMenu}
                    className="h-8 w-8 p-0"
                  >
                    <Share2 size={16} />
                  </Button>
                  {showShareMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-card border rounded-lg shadow-lg z-20 min-w-[150px] p-1">
                      <button
                        onClick={handleCopyLink}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded flex items-center gap-2"
                        aria-label="Copy link to clipboard"
                      >
                        {copiedFeedback ? <Check size={14} className="text-green-600" /> : "🔗"}
                        {copiedFeedback ? "Copied!" : "Copy Link"}
                      </button>
                      <button
                        onClick={handleShare}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded flex items-center gap-2"
                        aria-label="Share via Web Share or Twitter"
                      >
                        📤 Share
                      </button>
                    </div>
                  )}
                </div>
                <SignalBadge signal={signal} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Execution Price</p>
                <p className="font-mono font-semibold">${executionPrice.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Confidence</p>
                <p className="font-semibold">{confidence}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Target</p>
                <p className="font-mono font-semibold">${projectedTarget.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">ROI</p>
                <p className={cn("font-semibold", isPositive ? "text-green-600" : "text-red-600")}>{isPositive ? "+" : ""}{roi}%</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DirectionIcon
                size={16}
                className={cn(
                  signal === "BUY" ? "text-green-600" : signal === "SELL" ? "text-red-600" : "text-gray-500"
                )}
              />
              <MiniChart data={roiHistory.map((p) => p.value)} className="flex-1" />
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">{analysis}</p>

            {isPremium && !hasAccess && (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5 text-sm">
                <p className="font-medium text-yellow-400">Premium signal locked</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Stake at least {requiredStake.toLocaleString()} XLM to unlock full analysis and trade execution.
                </p>
              </div>
            )}

            {conflictReason && (
              <SignalConflictNotice
                reason={conflictReason}
                onRefresh={onPass}
                onChooseAnother={onPass}
              />
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <SignalTimestamp updatedAt={timestamp} />
              <p className="text-xs text-muted-foreground">Swipe or use ← → keys</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePass}
                className="flex-1"
                aria-label={`Pass on ${signal} signal for ${pair}`}
              >
                <X size={16} className="mr-1" />
                Pass
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteTrade}
                disabled={modalOpen || (isPremium && !hasAccess) || !!conflictReason}
                className="flex-1 active:scale-95"
                aria-label={`Execute trade: ${signal} signal for ${pair} at ${executionPrice}${isDemoMode ? " (demo)" : ""}${isPremium && !hasAccess ? " (locked — stake required)" : ""}${conflictReason ? " (unavailable — signal conflict)" : ""}`}
              >
                <Zap size={16} className="mr-1" />
                {isDemoMode ? "Demo Trade" : "Execute Trade"}
              </Button>
            </div>
          </article>

          <TradeModal
            open={modalOpen}
            onClose={handleModalClose}
            onConfirm={handleModalConfirm}
            marketPrice={executionPrice}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
