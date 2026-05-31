"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";
import { usePortfolio } from "@/hooks/usePortfolio";
import { Button } from "@/components/ui/button";
import { Check, Copy, LogOut, ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function WalletDropdown() {
  const { publicKey, disconnect } = useWallet();
  const { refetch } = usePortfolio();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const truncated = publicKey
    ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}`
    : "";

  const handleCopy = useCallback(async () => {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [publicKey]);

  function handleClose() {
    setOpen(false);
    triggerRef.current?.focus();
  }
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshed(false);
    try {
      await refetch();
      setRefreshed(true);
      setTimeout(() => setRefreshed(false), 2500);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, refetch]);

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handleClose();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Button
        ref={triggerRef}
        variant="outline"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Wallet menu for ${truncated}`}
        className="font-mono gap-2"
      >
        {truncated}
        <ChevronDown aria-hidden="true" className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        aria-label={`Wallet connected: ${truncated}. Click to open wallet actions.`}
        className="font-mono gap-2"
      >
        {/* Connection status dot */}
        <span
          className="relative flex h-2 w-2 shrink-0"
          aria-hidden="true"
          title="Wallet connected"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>

        {/* Address — hidden on very small screens */}
        <span className="hidden xs:inline">{truncated}</span>

        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </Button>

      {open && (
        <div
          role="menu"
          aria-label="Wallet options"
          className="absolute right-0 mt-2 w-72 rounded-xl border bg-popover shadow-lg p-2 flex flex-col gap-1 z-50"
          className="absolute right-0 mt-2 w-72 rounded-xl border bg-popover shadow-lg p-2 flex flex-col gap-1 z-dropdown"
        >
          {/* Connection status header */}
          <div className="px-3 py-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="text-xs font-medium text-green-400">Connected</span>
          </div>

          {/* Full address */}
          <p className="px-3 py-2 text-xs font-mono text-muted-foreground break-all select-all">
            {publicKey}
          </p>

          <hr className="border-border" />

          {/* Refresh balance */}
          <button
            role="menuitem"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label={
              isRefreshing
                ? "Refreshing wallet balance…"
                : refreshed
                ? "Balance refreshed"
                : "Refresh wallet balance"
            }
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshed ? (
              <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
            ) : (
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  isRefreshing && "animate-spin text-blue-400"
                )}
                aria-hidden="true"
              />
            )}
            <span aria-live="polite">
              {isRefreshing
                ? "Refreshing…"
                : refreshed
                ? "Balance updated"
                : "Refresh balance"}
            </span>
          </button>

          {/* Copy */}
          <button
            role="menuitem"
            tabIndex={0}
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            {copied ? (
              <Check aria-hidden="true" className="h-4 w-4 text-green-600" />
            ) : (
              <Copy aria-hidden="true" className="h-4 w-4" />
            )}
            {copied ? "Copied!" : "Copy address"}
          </button>

          {/* Disconnect */}
          <button
            role="menuitem"
            tabIndex={0}
            onClick={() => { disconnect(); handleClose(); }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
