"use client";

import { useState } from "react";
import { Shield, ChevronRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TwoFactorSetupWizard, DisableTwoFactor } from "@/components/TwoFactorSetupWizard";
import { securityProgram } from "@/lib/securityProgram";

export default function SecuritySettingsPage() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  function handleSetupComplete() {
    setTwoFactorEnabled(true);
    setShowSetup(false);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8 lg:px-8 text-foreground">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-blue-400" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-foreground">Account Security</h1>
        </div>

        {/* 2FA status card */}
        {!showSetup && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  Two-Factor Authentication
                </h2>
                <span
                  aria-label={twoFactorEnabled ? "2FA enabled" : "2FA disabled"}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    twoFactorEnabled
                      ? "bg-green-500/15 text-green-400"
                      : "bg-foreground-muted/10 text-foreground-muted"
                  }`}
                >
                  {twoFactorEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <p className="text-xs text-foreground-muted">
                {twoFactorEnabled
                  ? "Your account is protected with two-factor authentication."
                  : "Add an extra layer of security to your account by requiring a verification code on sign-in."}
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              {!twoFactorEnabled ? (
                <Button
                  size="sm"
                  onClick={() => setShowSetup(true)}
                  className="gap-1.5"
                  aria-label="Set up two-factor authentication"
                >
                  Set up 2FA <ChevronRight size={13} />
                </Button>
              ) : (
                <DisableTwoFactor
                  onDisabled={() => setTwoFactorEnabled(false)}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Setup wizard */}
        {showSetup && (
          <TwoFactorSetupWizard
            accountEmail="user@stellarswipe.app"
            onComplete={handleSetupComplete}
            onCancel={() => setShowSetup(false)}
          />
        )}

        <Card role="region" aria-labelledby="bug-bounty-program-title">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id="bug-bounty-program-title" className="text-sm font-semibold text-foreground">
                  {securityProgram.title}
                </h2>
                <p className="mt-1 text-xs text-foreground-muted">
                  {securityProgram.summary}
                </p>
              </div>
              <Shield size={18} className="shrink-0 text-blue-400" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-5 pb-5 text-sm">
            <section aria-labelledby="bug-bounty-scope">
              <h3 id="bug-bounty-scope" className="text-xs font-semibold uppercase text-foreground-muted">
                Scope
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground-muted">
                {securityProgram.scope.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="bug-bounty-rewards">
              <h3 id="bug-bounty-rewards" className="text-xs font-semibold uppercase text-foreground-muted">
                Reward tiers
              </h3>
              <dl className="mt-2 grid gap-2">
                {securityProgram.rewardTiers.map((tier) => (
                  <div
                    key={tier.severity}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <dt className="font-medium text-foreground">{tier.severity}</dt>
                    <dd className="text-right text-xs text-foreground-muted">{tier.reward}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section aria-labelledby="bug-bounty-submit">
              <h3 id="bug-bounty-submit" className="text-xs font-semibold uppercase text-foreground-muted">
                Submission process
              </h3>
              <p className="mt-2 text-foreground-muted">{securityProgram.submission.text}</p>
              <Button asChild size="sm" className="mt-3 gap-1.5">
                <a href={securityProgram.submission.href}>
                  <Mail size={13} aria-hidden="true" />
                  {securityProgram.submission.label}
                </a>
              </Button>
            </section>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
