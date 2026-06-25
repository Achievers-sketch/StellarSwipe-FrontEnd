"use client";

import { useEffect } from "react";
import { useWalletStore } from "@/store/useWalletStore";
import { useThemeStore } from "@/store/useThemeStore";

/**
 * #265 – Cross-tab state synchronization.
 * Listens to the native `storage` event (fired in OTHER tabs when localStorage
 * changes) and re-hydrates the relevant Zustand store so the UI stays in sync
 * without a page refresh.  Writing to the same store from the event handler
 * does NOT emit another storage event in the same tab, so there is no loop.
 */
export function useCrossTabSync() {
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      // Wallet store
      if (e.key === "wallet-store" && e.newValue) {
        try {
          const { state } = JSON.parse(e.newValue);
          useWalletStore.setState({
            publicKey: state.publicKey ?? null,
            isConnected: state.isConnected ?? false,
            network: state.network ?? "TESTNET",
          });
        } catch {
          // ignore malformed data
        }
      }

      // Theme store
      if (e.key === "stellar-theme" && e.newValue) {
        try {
          const { state } = JSON.parse(e.newValue);
          if (state.theme === "dark" || state.theme === "light") {
            useThemeStore.setState({ theme: state.theme });
          }
        } catch {
          // ignore malformed data
        }
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);
}
