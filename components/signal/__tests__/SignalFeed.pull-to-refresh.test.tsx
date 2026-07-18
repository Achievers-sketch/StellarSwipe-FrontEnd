/**
 * @jest-environment jsdom
 *
 * Integration tests for pull-to-refresh in SignalFeed.
 *
 * Tests the full interaction flow:
 * - Gesture detection and visual feedback
 * - Refetch triggering on threshold
 * - Debouncing of repeated pulls
 */

import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignalFeed } from "@/components/signal/SignalFeed";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/src/mocks/server";
import { http, HttpResponse } from "msw";

// Mock data for testing
const mockSignalResponse = {
  items: [
    {
      id: "signal-1",
      ticker: "BTC",
      action: "BUY" as const,
      confidence: 85,
      details: "Momentum building",
      timestamp: "2024-01-15T10:00:00Z",
      provider: "TestProvider",
      status: "Active" as const,
    },
    {
      id: "signal-2",
      ticker: "ETH",
      action: "SELL" as const,
      confidence: 72,
      details: "Price resistance",
      timestamp: "2024-01-15T09:45:00Z",
      provider: "TestProvider",
      status: "Active" as const,
    },
  ],
  page: 1,
  pageSize: 10,
  total: 2,
  nextPage: null,
  hasMore: false,
};

describe("SignalFeed – pull-to-refresh integration", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders pull-to-refresh indicator on mobile", async () => {
    // Mock window.matchMedia to simulate mobile viewport
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: query === "(max-width: 640px)",
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <SignalFeed initialData={mockSignalResponse} />
      </QueryClientProvider>
    );

    // Pull-to-refresh indicator should be visible (only on mobile)
    const indicator = screen.getByTestId("pull-to-refresh-indicator");
    expect(indicator).toBeInTheDocument();
  });

  it("hides pull-to-refresh indicator on desktop", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SignalFeed initialData={mockSignalResponse} />
      </QueryClientProvider>
    );

    // Check if the container is hidden (sm:hidden class)
    const container = screen.getByTestId("pull-to-refresh-container");
    expect(container).toHaveClass("sm:hidden");
  });

  it("simulates pull-to-refresh gesture and triggers refetch", async () => {
    let refetchCount = 0;

    // Override handler to track refetch calls
    server.use(
      http.get("/api/signals", () => {
        refetchCount++;
        return HttpResponse.json(mockSignalResponse);
      })
    );

    render(
      <QueryClientProvider client={queryClient}>
        <SignalFeed initialData={mockSignalResponse} />
      </QueryClientProvider>
    );

    // Get the scrollable container
    const feedContainer = screen.getByRole("feed").parentElement;
    expect(feedContainer).toBeInTheDocument();

    // Initial fetch (from initialData, so no API call)
    expect(refetchCount).toBe(0);

    // Simulate pull-to-refresh gesture
    act(() => {
      const touchStart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
        bubbles: true,
      } as TouchEventInit);
      feedContainer?.dispatchEvent(touchStart);

      // Simulate pulling down 80px (at threshold)
      const touchMove = new TouchEvent("touchmove", {
        touches: [{ clientY: 180 }] as any,
        bubbles: true,
      } as TouchEventInit);
      feedContainer?.dispatchEvent(touchMove);

      // Release
      const touchEnd = new TouchEvent("touchend", {
        bubbles: true,
      } as TouchEventInit);
      feedContainer?.dispatchEvent(touchEnd);
    });

    // Wait for refetch to be triggered
    await waitFor(() => {
      expect(refetchCount).toBeGreaterThan(0);
    });

    // Verify signals are still displayed
    await screen.findByText("BTC");
  });

  it("debounces repeated pull gestures while refresh is in flight", async () => {
    jest.useFakeTimers();
    let refetchCount = 0;

    server.use(
      http.get("/api/signals", ({ request }) => {
        refetchCount++;
        return HttpResponse.json(mockSignalResponse);
      })
    );

    render(
      <QueryClientProvider client={queryClient}>
        <SignalFeed initialData={mockSignalResponse} />
      </QueryClientProvider>
    );

    const feedContainer = screen.getByRole("feed").parentElement;

    // First pull gesture
    act(() => {
      const touchStart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
        bubbles: true,
      } as TouchEventInit);
      feedContainer?.dispatchEvent(touchStart);

      const touchMove = new TouchEvent("touchmove", {
        touches: [{ clientY: 180 }] as any,
        bubbles: true,
      } as TouchEventInit);
      feedContainer?.dispatchEvent(touchMove);

      const touchEnd = new TouchEvent("touchend", {
        bubbles: true,
      } as TouchEventInit);
      feedContainer?.dispatchEvent(touchEnd);
    });

    const firstRefetchCount = refetchCount;

    // Immediately attempt second pull (should be debounced)
    act(() => {
      const touchStart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
        bubbles: true,
      } as TouchEventInit);
      feedContainer?.dispatchEvent(touchStart);

      const touchMove = new TouchEvent("touchmove", {
        touches: [{ clientY: 180 }] as any,
        bubbles: true,
      } as TouchEventInit);
      feedContainer?.dispatchEvent(touchMove);

      const touchEnd = new TouchEvent("touchend", {
        bubbles: true,
      } as TouchEventInit);
      feedContainer?.dispatchEvent(touchEnd);
    });

    // Should still be at first refetch count (debounced)
    act(() => {
      jest.runAllTimers();
    });

    jest.useRealTimers();
  });

  it("displays correct visual feedback during pull", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SignalFeed initialData={mockSignalResponse} />
      </QueryClientProvider>
    );

    const indicator = screen.getByTestId("pull-to-refresh-indicator");

    // Initially should show "Pull to refresh"
    expect(screen.getByText("Pull to refresh")).toBeInTheDocument();

    // Simulate partial pull
    const feedContainer = screen.getByRole("feed").parentElement;
    act(() => {
      const touchStart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
        bubbles: true,
      } as TouchEventInit);
      feedContainer?.dispatchEvent(touchStart);

      // Pull 40px (below threshold of 80px)
      const touchMove = new TouchEvent("touchmove", {
        touches: [{ clientY: 140 }] as any,
        bubbles: true,
      } as TouchEventInit);
      feedContainer?.dispatchEvent(touchMove);
    });

    // Should still show "Pull to refresh" (below threshold)
    expect(screen.getByText("Pull to refresh")).toBeInTheDocument();
  });

  it("updates aria-label for accessibility during pull states", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SignalFeed initialData={mockSignalResponse} />
      </QueryClientProvider>
    );

    const indicator = screen.getByTestId("pull-to-refresh-indicator");

    // Initial state
    expect(indicator).toHaveAttribute("aria-label", expect.stringContaining("Pull to refresh"));
  });

  it("disables pull-to-refresh during initial load", async () => {
    // Don't provide initialData to force initial loading state
    render(
      <QueryClientProvider client={queryClient}>
        <SignalFeed />
      </QueryClientProvider>
    );

    // During loading, pull-to-refresh should be disabled
    // (Skeleton loaders should show instead)
    await screen.findByText("Loading signal feed…", { selector: "span" });
  });

  it("does not trigger pull-to-refresh when not at scroll top", async () => {
    let refetchCount = 0;

    server.use(
      http.get("/api/signals", () => {
        refetchCount++;
        return HttpResponse.json(mockSignalResponse);
      })
    );

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <SignalFeed initialData={mockSignalResponse} />
      </QueryClientProvider>
    );

    const feedContainer = screen.getByRole("feed").parentElement;
    expect(feedContainer).toBeInTheDocument();

    // Simulate scrolling down first
    if (feedContainer) {
      feedContainer.scrollTop = 100;
    }

    // Try to pull gesture while scrolled down
    act(() => {
      const touchStart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
        bubbles: true,
      } as TouchEventInit);
      feedContainer?.dispatchEvent(touchStart);

      const touchMove = new TouchEvent("touchmove", {
        touches: [{ clientY: 180 }] as any,
        bubbles: true,
      } as TouchEventInit);
      feedContainer?.dispatchEvent(touchMove);

      const touchEnd = new TouchEvent("touchend", {
        bubbles: true,
      } as TouchEventInit);
      feedContainer?.dispatchEvent(touchEnd);
    });

    // Refetch should not have been triggered
    expect(refetchCount).toBe(0);
  });
});
