"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { usePortfolioStore } from "@/store/usePortfolioStore";

export function usePortfolio() {
  const { publicKey, connected } = useWallet();
  const store = usePortfolioStore();

  // Initialize with demo data if store is empty
  useEffect(() => {
    if (store.assets.length === 0 && !connected) {
      const demoPortfolio = [
        { symbol: "XLM", name: "Stellar", value: 1500, color: "#0d1f2d" },
        { symbol: "USDC", name: "USD Coin", value: 800, color: "#2775ca" },
        { symbol: "AQUA", name: "Aqua", value: 350, color: "#00c5ff" },
        { symbol: "yXLM", name: "Yield XLM", value: 200, color: "#7b61ff" },
      ];
      store.setAssets(demoPortfolio);
    }
  }, [store, connected]);

  const fetchPortfolio = async () => {
    // In real app, fetch from API based on publicKey
    const realPortfolio = [
      { symbol: "XLM", name: "Stellar", value: 1500, color: "#0d1f2d" },
      { symbol: "USDC", name: "USD Coin", value: 800, color: "#2775ca" },
      { symbol: "AQUA", name: "Aqua", value: 350, color: "#00c5ff" },
      { symbol: "yXLM", name: "Yield XLM", value: 200, color: "#7b61ff" },
    ];
    return realPortfolio;
  };

  const { data, refetch } = useQuery({
    queryKey: ["portfolio", publicKey],
    queryFn: fetchPortfolio,
    enabled: connected && !!publicKey,
    staleTime: 60000,
  });

  useEffect(() => {
    if (data) {
      store.setAssets(data);
    }
  }, [data, store]);

  return {
    assets: data || store.assets,
    isLoading: store.isLoading,
    refetch,
  };
}