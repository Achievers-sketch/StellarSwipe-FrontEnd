"use client";

import { useState } from "react";
import { useState, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WalletDropdown } from "@/components/WalletDropdown";
import { SignalErrorState } from "@/components/SignalErrorState";
import { SignalCard } from "@/components/SignalCard";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { connected, connect } = useWallet();
  const { data: signals, isLoading, error, refetch } = useSignals();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
import { CTABanner } from "@/components/CTABanner";
import { HowItWorks } from "@/components/HowItWorks";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";

export default function Home() {
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 sm:gap-8 sm:p-8 bg-gray-950">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative text-center"
        >
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">StellarSwipe</h1>
          <p className="mt-2 text-gray-400">
            Connect your Freighter wallet to get started
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex flex-col items-center gap-4"
        >
          <Link href="/app">
            <Button
              size="lg"
              className="focus:ring-2 focus:ring-blue-500"
            >
              Go to Signals
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => setWalletModalOpen(true)}
            size="lg"
            className="focus:ring-2 focus:ring-blue-500"
          >
            Connect Wallet
          </Button>
        )}
      </motion.div>

      <div className="w-full max-w-md">
        {isLoading && (
          <div className="flex justify-center py-10" role="status" aria-label="Loading signals">
            <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <SignalErrorState error={error as Error} onRetry={refetch} />
        )}

        {signals && signals.length === 0 && (
          <p role="status" className="text-center text-sm text-muted-foreground">No signals available.</p>
        )}
        </motion.div>

        {signals && signals.length > 0 && (
          <ul className="flex flex-col gap-3">
            {signals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                expanded={expandedIds.has(signal.id)}
                onToggle={() => toggleExpand(signal.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
        <HowItWorks />
        <CTABanner />
        <Footer />
      </main>
    </PageTransition>
  );
}
