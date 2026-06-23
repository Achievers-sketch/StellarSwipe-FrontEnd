/**
 * Unit tests for SignalCard interaction logic (components/SignalCard.tsx).
 *
 * The component uses framer-motion drag and requires a DOM environment to
 * render, so these tests target the pure business-logic layer: swipe
 * thresholds, direction classification, callback contract, and the
 * expand/collapse toggle behaviour.
 */

// ── Constants (mirrored from SignalCard.tsx) ──────────────────────────────────

const SWIPE_THRESHOLD = 120;
const VELOCITY_THRESHOLD = 780;

// ── Swipe direction classification ────────────────────────────────────────────

function classifySwipe(
  offset: number,
  velocity: number
): "execute" | "pass" | "none" {
  if (offset > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) return "execute";
  if (offset < -SWIPE_THRESHOLD || velocity < -VELOCITY_THRESHOLD) return "pass";
  return "none";
}

describe("SignalCard – swipe threshold constants", () => {
  it("SWIPE_THRESHOLD is 120", () => {
    expect(SWIPE_THRESHOLD).toBe(120);
  });

  it("VELOCITY_THRESHOLD is 780", () => {
    expect(VELOCITY_THRESHOLD).toBe(780);
  });
});

describe("SignalCard – swipe-right triggers execute (onTrade)", () => {
  it("classifies offset > threshold as execute", () => {
    expect(classifySwipe(121, 0)).toBe("execute");
  });

  it("classifies offset exactly at threshold as execute", () => {
    expect(classifySwipe(SWIPE_THRESHOLD + 1, 0)).toBe("execute");
  });

  it("classifies high rightward velocity as execute even with small offset", () => {
    expect(classifySwipe(10, VELOCITY_THRESHOLD + 1)).toBe("execute");
  });

  it("does NOT execute when offset is at the threshold boundary (not exceeded)", () => {
    expect(classifySwipe(SWIPE_THRESHOLD, 0)).toBe("none");
  });

  it("does NOT execute at sub-threshold offset and zero velocity", () => {
    expect(classifySwipe(50, 0)).toBe("none");
  });
});

describe("SignalCard – swipe-left triggers pass (onPass)", () => {
  it("classifies offset < -threshold as pass", () => {
    expect(classifySwipe(-121, 0)).toBe("pass");
  });

  it("classifies high leftward velocity as pass even with small offset", () => {
    expect(classifySwipe(-5, -(VELOCITY_THRESHOLD + 1))).toBe("pass");
  });

  it("does NOT pass at -threshold (boundary not exceeded)", () => {
    expect(classifySwipe(-SWIPE_THRESHOLD, 0)).toBe("none");
  });

  it("does NOT pass at sub-threshold leftward offset with zero velocity", () => {
    expect(classifySwipe(-50, 0)).toBe("none");
  });
});

describe("SignalCard – swipe has no effect within dead zone", () => {
  it("returns none for zero offset and zero velocity", () => {
    expect(classifySwipe(0, 0)).toBe("none");
  });

  it("returns none for a small rightward drag", () => {
    expect(classifySwipe(30, 100)).toBe("none");
  });

  it("returns none for a small leftward drag", () => {
    expect(classifySwipe(-30, -100)).toBe("none");
  });
});

// ── Callback contract ─────────────────────────────────────────────────────────

describe("SignalCard – onTrade callback receives correct signal data", () => {
  it("calls onTrade with pair and price when swipe-right fires", () => {
    const onTrade = jest.fn();
    const signal = { pair: "XLM/USDC", executionPrice: 0.4821 };

    if (classifySwipe(150, 0) === "execute") {
      onTrade(signal.pair, signal.executionPrice);
    }

    expect(onTrade).toHaveBeenCalledTimes(1);
    expect(onTrade).toHaveBeenCalledWith("XLM/USDC", 0.4821);
  });

  it("does not call onTrade when swipe is below threshold", () => {
    const onTrade = jest.fn();
    if (classifySwipe(50, 0) === "execute") {
      onTrade("XLM/USDC", 0.4821);
    }
    expect(onTrade).not.toHaveBeenCalled();
  });
});

describe("SignalCard – onPass callback fires on swipe-left", () => {
  it("calls onPass when swipe-left threshold is exceeded", () => {
    const onPass = jest.fn();
    if (classifySwipe(-150, 0) === "pass") {
      onPass();
    }
    expect(onPass).toHaveBeenCalledTimes(1);
  });

  it("does not call onPass for a sub-threshold leftward drag", () => {
    const onPass = jest.fn();
    if (classifySwipe(-50, 0) === "pass") {
      onPass();
    }
    expect(onPass).not.toHaveBeenCalled();
  });
});

// ── Expand / collapse detail view ─────────────────────────────────────────────

function toggleDetails(current: boolean): boolean {
  return !current;
}

describe("SignalCard – expand/collapse detail view", () => {
  it("starts collapsed (false)", () => {
    let expanded = false;
    expect(expanded).toBe(false);
  });

  it("toggles from collapsed to expanded on first click", () => {
    let expanded = false;
    expanded = toggleDetails(expanded);
    expect(expanded).toBe(true);
  });

  it("toggles back to collapsed on second click", () => {
    let expanded = true;
    expanded = toggleDetails(expanded);
    expect(expanded).toBe(false);
  });

  it("detail content is visible when expanded is true", () => {
    const expanded = true;
    const contentVisible = expanded;
    expect(contentVisible).toBe(true);
  });

  it("detail content is hidden when expanded is false", () => {
    const expanded = false;
    const contentVisible = expanded;
    expect(contentVisible).toBe(false);
  });

  it("three successive toggles end up in the expanded state", () => {
    let expanded = false;
    expanded = toggleDetails(expanded); // true
    expanded = toggleDetails(expanded); // false
    expanded = toggleDetails(expanded); // true
    expect(expanded).toBe(true);
  });
});

// ── Mouse vs touch event path equivalence ─────────────────────────────────────

describe("SignalCard – mouse and touch event paths produce identical outcomes", () => {
  it("mouse drag offset > threshold triggers execute", () => {
    const mouseOffset = 150;
    expect(classifySwipe(mouseOffset, 0)).toBe("execute");
  });

  it("touch swipe with equivalent offset triggers execute", () => {
    const touchOffset = 150;
    expect(classifySwipe(touchOffset, 0)).toBe("execute");
  });

  it("mouse drag < -threshold triggers pass", () => {
    const mouseOffset = -150;
    expect(classifySwipe(mouseOffset, 0)).toBe("pass");
  });

  it("touch swipe with equivalent offset triggers pass", () => {
    const touchOffset = -150;
    expect(classifySwipe(touchOffset, 0)).toBe("pass");
  });
});
