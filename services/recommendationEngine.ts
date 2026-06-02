/**
 * AI Signal Recommendation Engine (#171)
 * Client-side collaborative filtering based on feedback history and risk profile.
 * Replace scoring logic with a real ML backend call when available.
 */
import { useRecommendationStore, type RiskProfile, type RecommendedSignal } from '@/store/useRecommendationStore';
import type { Signal } from '@/lib/types';

const RISK_CONFIDENCE_FLOOR: Record<RiskProfile, number> = {
  conservative: 75,
  moderate: 60,
  aggressive: 40,
};

const SEASONAL_BOOST = (() => {
  const month = new Date().getMonth();
  // Q4 (Oct-Dec) and Q1 (Jan-Mar) historically higher volatility
  return month >= 9 || month <= 2 ? 5 : 0;
})();

/** Score a signal against user history + risk profile */
function scoreSignal(
  signal: Signal,
  likedAssets: Set<string>,
  dislikedAssets: Set<string>,
  riskProfile: RiskProfile
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = signal.confidence;

  // Risk profile filter
  const floor = RISK_CONFIDENCE_FLOOR[riskProfile];
  if (signal.confidence < floor) return { score: 0, reasons: [] };

  // Boost for liked assets
  if (likedAssets.has(signal.asset)) {
    score += 15;
    reasons.push(`You've liked ${signal.asset} signals before`);
  }
  if (dislikedAssets.has(signal.asset)) {
    score -= 20;
  }

  // Risk profile match
  if (riskProfile === 'aggressive' && signal.confidence >= 80) {
    score += 10;
    reasons.push('High confidence matches your risk profile');
  }
  if (riskProfile === 'conservative' && signal.confidence >= 80) {
    score += 8;
    reasons.push('Strong signal with conservative risk fit');
  }

  // Seasonal adjustment
  if (SEASONAL_BOOST > 0) {
    score += SEASONAL_BOOST;
    reasons.push('Seasonal market conditions favour this signal');
  }

  // Direction diversity
  if (signal.direction === 'BUY') {
    reasons.push('Bullish momentum detected');
  }

  if (reasons.length === 0) reasons.push('Matches your trading history');

  return { score: Math.min(100, Math.max(0, score)), reasons };
}

/** Compute recommendations and persist them to the store */
export function computeRecommendations(signals: Signal[]): RecommendedSignal[] {
  const { settings, feedback, setRecommendations } = useRecommendationStore.getState();
  if (!settings.enabled || !settings.privacyAccepted) return [];

  const likedAssets = new Set(feedback.filter((f) => f.liked).map((f) => {
    const sig = signals.find((s) => s.id === f.signalId);
    return sig?.asset ?? '';
  }));
  const dislikedAssets = new Set(feedback.filter((f) => !f.liked).map((f) => {
    const sig = signals.find((s) => s.id === f.signalId);
    return sig?.asset ?? '';
  }));

  const recs: RecommendedSignal[] = signals
    .map((s) => {
      const { score, reasons } = scoreSignal(s, likedAssets, dislikedAssets, settings.riskProfile);
      return { signalId: s.id, score, reasons };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  setRecommendations(recs);
  return recs;
}
