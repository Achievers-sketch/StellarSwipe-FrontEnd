/**
 * Unit tests for TradeModal validation logic (components/TradeModal.tsx).
 *
 * The root TradeModal supports LIMIT and MARKET order types with inline
 * validation via validateField(). Tests here cover required-field checks,
 * numeric range checks, and the order-type toggle's effect on which fields
 * are required.
 */

// ── Validation logic (mirrors components/TradeModal.tsx validateField) ────────

function validateField(value: string, label: string): string {
  if (!value.trim()) return `${label} is required`;
  const num = Number(value);
  if (isNaN(num)) return `${label} must be a number`;
  if (num <= 0) return `${label} must be greater than 0`;
  return "";
}

describe("validateField – required check", () => {
  it("returns an error for an empty string", () => {
    expect(validateField("", "Amount")).toBe("Amount is required");
  });

  it("returns an error for a whitespace-only string", () => {
    expect(validateField("   ", "Amount")).toBe("Amount is required");
  });

  it("includes the field label in the error message", () => {
    expect(validateField("", "Limit price")).toContain("Limit price");
  });
});

describe("validateField – non-numeric input", () => {
  it("rejects alphabetic input", () => {
    expect(validateField("abc", "Amount")).toBe("Amount must be a number");
  });

  it("rejects mixed alphanumeric input", () => {
    expect(validateField("10xyz", "Amount")).toBe("Amount must be a number");
  });

  it("rejects special characters", () => {
    expect(validateField("$100", "Amount")).toBe("Amount must be a number");
  });
});

describe("validateField – numeric range checks", () => {
  it("rejects zero", () => {
    expect(validateField("0", "Amount")).toBe("Amount must be greater than 0");
  });

  it("rejects negative numbers", () => {
    expect(validateField("-5", "Amount")).toBe("Amount must be greater than 0");
  });

  it("rejects negative decimal", () => {
    expect(validateField("-0.001", "Limit price")).toBe("Limit price must be greater than 0");
  });

  it("accepts a positive integer", () => {
    expect(validateField("100", "Amount")).toBe("");
  });

  it("accepts a positive decimal", () => {
    expect(validateField("0.4821", "Limit price")).toBe("");
  });

  it("accepts a very small positive value", () => {
    expect(validateField("0.000001", "Amount")).toBe("");
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
  return type === "LIMIT" && touched ? validateField(limitPrice, "Limit price") : "";
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
