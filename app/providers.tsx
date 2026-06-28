"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ToastProvider } from "@/components/ui/toast";
import { initI18n } from "@/lib/i18n";
import { PerformanceMonitoringProvider } from "@/components/performance/PerformanceMonitoringProvider";
import { useCrossTabSync } from "@/hooks/useCrossTabSync";

// React Query Devtools are only useful while developing locally. Gating the
// dynamic import on NODE_ENV means the `development` branch is statically
// dead-code-eliminated by the bundler in production builds, so the devtools
// chunk never ships to users. No manual toggling required — it follows the env.
const ReactQueryDevtools: React.ComponentType<{ initialIsOpen?: boolean }> =
  process.env.NODE_ENV === "development"
    ? dynamic(
        () =>
          import("@tanstack/react-query-devtools").then((mod) => ({
            default: mod.ReactQueryDevtools,
          })),
        { ssr: false }
      )
    : () => null;

export function Providers({ children }: { children: React.ReactNode }) {
  useCrossTabSync();

  useEffect(() => {
    initI18n();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PerformanceMonitoringProvider>
        {children}
      </PerformanceMonitoringProvider>
      <ToastProvider />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
