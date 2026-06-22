import type { Metadata } from "next";
import { TaxReportingTool } from "@/components/TaxReportingTool";

export const metadata: Metadata = {
  title: "Tax Report | StellarSwipe",
  description: "Generate tax documents from your StellarSwipe trading activity.",
};

export default function TaxReportPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8 lg:px-8 text-foreground">
      <div className="mx-auto w-full max-w-4xl">
        <TaxReportingTool />
      </div>
    </main>
  );
}
