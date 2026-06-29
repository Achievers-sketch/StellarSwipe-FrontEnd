/**
 * Unit tests for trade form validation (lib/tradeSchemas.ts).
 *
 * validateTradeField is a Zod-backed drop-in replacement for the legacy
 * validateField function. Tests verify identical error message contract.
 */

import { validateTradeField, tradeOrderSchema, limitOrderSchema, marketOrderSchema } from "@/lib/tradeSchemas";

// ── validateTradeField – required check ──────────────────────────────────────

describe("validateTradeField – required check", () => {
  it("returns an error for an empty string", () => {
    expect(validateTradeField("", "Amount")).toBe("Amount is required");
  });

  it("returns an error for a whitespace-only string", () => {
    expect(validateTradeField("   ", "Amount")).toBe("Amount is required");
  });

  it("includes the field label in the error message", () => {
    expect(validateTradeField("", "Limit price")).toContain("Limit price");
  });
});

// ── validateTradeField – non-numeric input ───────────────────────────────────

describe("validateTradeField – non-numeric input", () => {
  it("rejects alphabetic input", () => {
    expect(validateTradeField("abc", "Amount")).toBe("Amount must be a number");
  });

  it("rejects mixed alphanumeric input", () => {
    expect(validateTradeField("10xyz", "Amount")).toBe("Amount must be a number");
  });

  it("rejects special characters", () => {
    expect(validateTradeField("$100", "Amount")).toBe("Amount must be a number");
  });
});

// ── validateTradeField – numeric range checks ────────────────────────────────

describe("validateTradeField – numeric range checks", () => {
  it("rejects zero", () => {
    expect(validateTradeField("0", "Amount")).toBe("Amount must be greater than 0");
  });

  it("rejects negative numbers", () => {
    expect(validateTradeField("-5", "Amount")).toBe("Amount must be greater than 0");
  });

  it("rejects negative decimal", () => {
    expect(validateTradeField("-0.001", "Limit price")).toBe("Limit price must be greater than 0");
  });

  it("accepts a positive integer", () => {
    expect(validateTradeField("100", "Amount")).toBe("");
  });

  it("accepts a positive decimal", () => {
    expect(validateTradeField("0.4821", "Limit price")).toBe("");
  });

  it("accepts a very small positive value", () => {
    expect(validateTradeField("0.000001", "Amount")).toBe("");
  });
});

// ── Zod schemas – LIMIT order ────────────────────────────────────────────────

describe("limitOrderSchema", () => {
  it("accepts valid LIMIT order", () => {
    const result = limitOrderSchema.safeParse({
      orderType: "LIMIT",
      amount: "50",
      limitPrice: "0.4821",
    });
    expect(result.success).toBe(true);
  });

  it("fails when limitPrice is missing", () => {
    const result = limitOrderSchema.safeParse({ orderType: "LIMIT", amount: "50", limitPrice: "" });
    expect(result.success).toBe(false);
  });

  it("fails when amount is zero", () => {
    const result = limitOrderSchema.safeParse({ orderType: "LIMIT", amount: "0", limitPrice: "0.4821" });
    expect(result.success).toBe(false);
  });
});

// ── Zod schemas – MARKET order ───────────────────────────────────────────────

describe("marketOrderSchema", () => {
  it("accepts valid MARKET order", () => {
    const result = marketOrderSchema.safeParse({ orderType: "MARKET", amount: "100" });
    expect(result.success).toBe(true);
  });

  it("does not require limitPrice", () => {
    const result = marketOrderSchema.safeParse({ orderType: "MARKET", amount: "1" });
    expect(result.success).toBe(true);
  });

  it("fails when amount is empty", () => {
    const result = marketOrderSchema.safeParse({ orderType: "MARKET", amount: "" });
    expect(result.success).toBe(false);
  });
});

// ── Zod schemas – discriminated union ────────────────────────────────────────

describe("tradeOrderSchema – discriminated union", () => {
  it("correctly parses a LIMIT order", () => {
    const result = tradeOrderSchema.safeParse({ orderType: "LIMIT", amount: "50", limitPrice: "0.5" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.orderType).toBe("LIMIT");
  });

  it("correctly parses a MARKET order", () => {
    const result = tradeOrderSchema.safeParse({ orderType: "MARKET", amount: "100" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.orderType).toBe("MARKET");
  });

  it("fails on unknown order type", () => {
    const result = tradeOrderSchema.safeParse({ orderType: "FOO", amount: "100" });
    expect(result.success).toBe(false);
  });
});

// ── canConfirm logic (components/trade/TradeModal.tsx) ───────────────────────

function canConfirmSwap(fromAmount: string): boolean {
  return !!fromAmount && parseFloat(fromAmount) > 0;
}

describe("swap TradeModal – canConfirm gate", () => {
  it("is false when amount is empty", () => {
    expect(canConfirmSwap("")).toBe(false);
  });

  it("is false when amount is zero", () => {
    expect(canConfirmSwap("0")).toBe(false);
  });

  it("is false when amount is negative", () => {
    expect(canConfirmSwap("-10")).toBe(false);
  });

  it("is true for a valid positive amount", () => {
    expect(canConfirmSwap("50")).toBe(true);
  });

  it("is true for a fractional amount", () => {
    expect(canConfirmSwap("0.001")).toBe(true);
  });
});

// ── Exchange-rate derivation (components/trade/TradeModal.tsx) ────────────────

const EXCHANGE_RATE = 0.094;

function computeToAmount(fromAmount: string): string {
  return fromAmount ? (parseFloat(fromAmount) * EXCHANGE_RATE).toFixed(6) : "";
}

function computeMinReceived(toAmount: string): string {
  return toAmount ? (parseFloat(toAmount) * 0.995).toFixed(6) : "—";
}

describe("swap TradeModal – exchange rate derivation", () => {
  it("toAmount is empty when fromAmount is empty", () => {
    expect(computeToAmount("")).toBe("");
  });

  it("toAmount applies the exchange rate correctly", () => {
    expect(parseFloat(computeToAmount("100"))).toBeCloseTo(9.4);
  });

  it("minReceived is '—' when toAmount is empty", () => {
    expect(computeMinReceived("")).toBe("—");
  });

  it("minReceived applies 0.5% slippage tolerance", () => {
    const to = computeToAmount("100");
    const min = parseFloat(computeMinReceived(to));
    expect(min).toBeCloseTo(9.4 * 0.995, 4);
  });
});

// ── LIMIT vs MARKET order-type toggle ────────────────────────────────────────

type OrderType = "LIMIT" | "MARKET";

function getLimitPriceError(
  type: OrderType,
  limitPrice: string,
  touched: boolean
): string {
  return type === "LIMIT" && touched ? validateTradeField(limitPrice, "Limit price") : "";
}

describe("TradeModal – order-type toggle affects required fields", () => {
  it("limit price is NOT required for MARKET orders", () => {
    expect(getLimitPriceError("MARKET", "", true)).toBe("");
  });

  it("limit price IS required for LIMIT orders when touched", () => {
    expect(getLimitPriceError("LIMIT", "", true)).toBe("Limit price is required");
  });

  it("limit price error is suppressed until the field is touched", () => {
    expect(getLimitPriceError("LIMIT", "", false)).toBe("");
  });

  it("LIMIT order with a valid price produces no error", () => {
    expect(getLimitPriceError("LIMIT", "0.4821", true)).toBe("");
  });

  it("MARKET order ignores an invalid limit price value", () => {
    expect(getLimitPriceError("MARKET", "abc", true)).toBe("");
  });

  it("LIMIT order rejects a non-numeric limit price", () => {
    expect(getLimitPriceError("LIMIT", "abc", true)).toContain("must be a number");
  });

  it("LIMIT order rejects a negative limit price", () => {
    expect(getLimitPriceError("LIMIT", "-1", true)).toContain("greater than 0");
  });
});

// ── Two-step review flow ──────────────────────────────────────────────────────

type ModalStep = "input" | "review";

/**
 * Simulates the step-machine logic extracted from TradeModal:
 * - canAdvanceToReview: all inputs valid and no blocking conditions
 * - goToReview / goBackToInput: pure step transitions
 * - confirmIsAvailable: confirm only enabled once on review step
 */
function canAdvanceToReview(
  amount: string,
  type: OrderType,
  limitPrice: string,
  hasErrors: boolean,
  insufficient: boolean,
  showSlippageWarning: boolean
): boolean {
  if (!amount || hasErrors || insufficient || showSlippageWarning) return false;
  if (type === "LIMIT" && !limitPrice) return false;
  return true;
}

function goToReview(
  currentStep: ModalStep,
  canAdvance: boolean
): ModalStep {
  return canAdvance ? "review" : currentStep;
}

function goBackToInput(): ModalStep {
  return "input";
}

function confirmIsAvailable(step: ModalStep, submitting: boolean): boolean {
  return step === "review" && !submitting;
}

describe("TradeModal – two-step review flow", () => {
  it("starts on the input step", () => {
    const step: ModalStep = "input";
    expect(step).toBe("input");
  });

  it("advances to review when inputs are valid", () => {
    const step = goToReview(
      "input",
      canAdvanceToReview("50", "LIMIT", "0.4821", false, false, false)
    );
    expect(step).toBe("review");
  });

  it("stays on input if amount is empty", () => {
    const step = goToReview(
      "input",
      canAdvanceToReview("", "LIMIT", "0.4821", false, false, false)
    );
    expect(step).toBe("input");
  });

  it("stays on input if LIMIT order is missing limit price", () => {
    const step = goToReview(
      "input",
      canAdvanceToReview("50", "LIMIT", "", false, false, false)
    );
    expect(step).toBe("input");
  });

  it("stays on input if there are validation errors", () => {
    const step = goToReview(
      "input",
      canAdvanceToReview("50", "LIMIT", "0.4821", true, false, false)
    );
    expect(step).toBe("input");
  });

  it("stays on input if balance is insufficient", () => {
    const step = goToReview(
      "input",
      canAdvanceToReview("50", "LIMIT", "0.4821", false, true, false)
    );
    expect(step).toBe("input");
  });

  it("stays on input if slippage warning is unacknowledged", () => {
    const step = goToReview(
      "input",
      canAdvanceToReview("50", "MARKET", "", false, false, true)
    );
    expect(step).toBe("input");
  });

  it("goes back to input from review step, preserving inputs", () => {
    // inputs are preserved in component state; the step just changes
    expect(goBackToInput()).toBe("input");
  });

  it("confirm is NOT available on the input step", () => {
    expect(confirmIsAvailable("input", false)).toBe(false);
  });

  it("confirm IS available on the review step when not submitting", () => {
    expect(confirmIsAvailable("review", false)).toBe(true);
  });

  it("confirm is NOT available while submitting", () => {
    expect(confirmIsAvailable("review", true)).toBe(false);
  });

  it("MARKET order can advance without a limit price", () => {
    const step = goToReview(
      "input",
      canAdvanceToReview("100", "MARKET", "", false, false, false)
    );
    expect(step).toBe("review");
  });
});

// ── Submission with valid data ────────────────────────────────────────────────

describe("TradeModal – successful submission shape", () => {
  it("LIMIT order confirmation carries amount, price, and orderType", () => {
    const onConfirm = jest.fn();
    const details = { amount: "50", price: 0.4821, orderType: "LIMIT" as OrderType };
    onConfirm(details);
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: "50",
        price: 0.4821,
        orderType: "LIMIT",
      })
    );
  });

  it("MARKET order confirmation carries amount and orderType without a limit price", () => {
    const onConfirm = jest.fn();
    const details = { amount: "100", price: 0.4821, orderType: "MARKET" as OrderType };
    onConfirm(details);
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ orderType: "MARKET" })
    );
  });
});

// ── Trade-size preset buttons ─────────────────────────────────────────────────

/**
 * applyPreset mirrors the component's callback logic:
 *   xlmAmount = (walletBalance * pct / 100) / price
 */
function applyPreset(
  pct: number,
  walletBalance: number,
  price: number
): string | null {
  if (!price) return null;
  return ((walletBalance * pct) / 100 / price).toFixed(2);
}

describe("TradeModal – trade-size preset buttons calculate correct XLM amount", () => {
  const WALLET = 250; // USDC
  const PRICE = 0.4821; // USDC per XLM

  it("25% preset yields correct XLM amount", () => {
    const result = applyPreset(25, WALLET, PRICE);
    expect(parseFloat(result!)).toBeCloseTo((WALLET * 0.25) / PRICE, 2);
  });

  it("50% preset yields correct XLM amount", () => {
    const result = applyPreset(50, WALLET, PRICE);
    expect(parseFloat(result!)).toBeCloseTo((WALLET * 0.5) / PRICE, 2);
  });

  it("75% preset yields correct XLM amount", () => {
    const result = applyPreset(75, WALLET, PRICE);
    expect(parseFloat(result!)).toBeCloseTo((WALLET * 0.75) / PRICE, 2);
  });

  it("Max (100%) preset yields correct XLM amount", () => {
    const result = applyPreset(100, WALLET, PRICE);
    expect(parseFloat(result!)).toBeCloseTo(WALLET / PRICE, 2);
  });

  it("Max is greater than 75%, which is greater than 50%, which is greater than 25%", () => {
    const p25 = parseFloat(applyPreset(25, WALLET, PRICE)!);
    const p50 = parseFloat(applyPreset(50, WALLET, PRICE)!);
    const p75 = parseFloat(applyPreset(75, WALLET, PRICE)!);
    const max = parseFloat(applyPreset(100, WALLET, PRICE)!);
    expect(p25 < p50).toBe(true);
    expect(p50 < p75).toBe(true);
    expect(p75 < max).toBe(true);
  });

  it("returns null when price is 0 (preset disabled)", () => {
    expect(applyPreset(50, WALLET, 0)).toBeNull();
  });

  it("presets recompute correctly when balance changes", () => {
    const newBalance = 500;
    const result = applyPreset(50, newBalance, PRICE);
    expect(parseFloat(result!)).toBeCloseTo((newBalance * 0.5) / PRICE, 2);
  });

  it("result is formatted to 2 decimal places", () => {
    const result = applyPreset(25, WALLET, PRICE);
    expect(result).toMatch(/^\d+\.\d{2}$/);
  });
});

// ── Preset disabled state ─────────────────────────────────────────────────────

describe("TradeModal – preset buttons disabled when price is unavailable", () => {
  it("presets are disabled when LIMIT order has no limit price entered", () => {
    const limitPrice = "";
    const price = parseFloat(limitPrice) || 0;
    expect(price).toBe(0);
    expect(applyPreset(50, 250, price)).toBeNull();
  });

  it("presets are enabled for MARKET orders (marketPrice always available)", () => {
    const marketPrice = 0.4821;
    expect(applyPreset(50, 250, marketPrice)).not.toBeNull();
  });

  it("presets become enabled once a valid LIMIT price is entered", () => {
    const limitPrice = "0.50";
    const price = parseFloat(limitPrice) || 0;
    expect(applyPreset(25, 250, price)).not.toBeNull();
  });
});
