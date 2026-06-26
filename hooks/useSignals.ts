import { useQuery } from "@tanstack/react-query";
import { fetchSignals, NetworkError, ServerError } from "@/lib/api";

export function useSignals() {
  return useQuery({
    queryKey: ["signals"],
    queryFn: () => fetchSignals(),
    retry: (failureCount, error) => {
      // Retry on network errors up to 2 times
      if (error instanceof NetworkError && failureCount < 2) {
        return true;
      }
      // Retry on server 5xx errors up to 2 times
      if (error instanceof ServerError && error.status >= 500 && failureCount < 2) {
        return true;
      }
      // Don't retry on client errors (4xx)
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000),
    staleTime: 60000,
  });
}
