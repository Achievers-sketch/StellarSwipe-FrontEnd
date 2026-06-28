import { Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROTOCOL_MIN_STAKE_XLM, LOW_STAKE_WARNING_MARGIN } from "@/lib/stellar";

interface StakeBadgeProps {
  stake?: number;
  reputation?: number;
  /** Provider's actual staked amount in XLM, used to detect low-stake proximity */
  providerStakeXlm?: number;
  /** Protocol minimum stake in XLM; defaults to PROTOCOL_MIN_STAKE_XLM */
  minStakeXlm?: number;
  /** Fraction above the minimum within which the warning badge is shown; defaults to LOW_STAKE_WARNING_MARGIN */
  warningMargin?: number;
  className?: string;
}

export function StakeBadge({
  stake = 0,
  reputation = 0,
  providerStakeXlm,
  minStakeXlm = PROTOCOL_MIN_STAKE_XLM,
  warningMargin = LOW_STAKE_WARNING_MARGIN,
  className,
}: StakeBadgeProps) {
  if (!stake && !reputation) return null;

  const isLowStake =
    providerStakeXlm !== undefined &&
    providerStakeXlm <= minStakeXlm * (1 + warningMargin);

  const getTierColor = (score: number) => {
    if (score >= 80) return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20 forced-colors:text-[Highlight] forced-colors:bg-[Canvas] forced-colors:border-[Highlight]";
    if (score >= 60) return "text-blue-500 bg-blue-500/10 border-blue-500/20 forced-colors:text-[LinkText] forced-colors:bg-[Canvas] forced-colors:border-[LinkText]";
    return "text-gray-400 bg-gray-500/10 border-gray-500/20 forced-colors:text-[GrayText] forced-colors:bg-[Canvas] forced-colors:border-[GrayText]";
  };

  const getTierLabel = (score: number) => {
    if (score >= 80) return "Gold";
    if (score >= 60) return "Silver";
    return "Bronze";
  };

  const displayScore = reputation || stake;
  const tierColor = getTierColor(displayScore);
  const tierLabel = getTierLabel(displayScore);

  if (isLowStake) {
    const warningTooltip =
      `Low stake warning: this provider has ${providerStakeXlm?.toLocaleString()} XLM staked, ` +
      `within ${Math.round(warningMargin * 100)}% of the ${minStakeXlm.toLocaleString()} XLM protocol minimum. ` +
      `Providers that fall below the minimum may be delisted, which could affect signal reliability.`;

    return (
      <div
        role="status"
        aria-label={warningTooltip}
        title={warningTooltip}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border forced-color-adjust-none",
          "text-amber-500 bg-amber-500/10 border-amber-500/30 forced-colors:text-[Mark] forced-colors:bg-[Canvas] forced-colors:border-[Mark]",
          className
        )}
      >
        <AlertTriangle size={12} aria-hidden="true" />
        <span>Low Stake</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border forced-color-adjust-none",
        tierColor,
        className
      )}
      title={`Provider reputation: ${reputation}%, Staked: $${stake?.toLocaleString()}`}
    >
      <Shield size={12} />
      <span>{tierLabel}</span>
    </div>
  );
}
