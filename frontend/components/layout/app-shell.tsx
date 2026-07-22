"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { usePathname } from "next/navigation";

const ROUTE_META: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Dashboard",
    description: "Real-time operational intelligence across your industrial estate",
  },
  "/documents": {
    title: "Document Intelligence",
    description: "Upload, OCR, and extract structured knowledge from industrial documents",
  },
  "/copilot": {
    title: "AI Copilot",
    description: "Ask questions across your entire document corpus, with citations",
  },
  "/rca": {
    title: "Root Cause Analysis",
    description: "AI-assisted causal analysis for incidents and near-misses",
  },
  "/graph": {
    title: "Knowledge Graph",
    description: "Explore how equipment, incidents, and documents connect",
  },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const meta = ROUTE_META[pathname] ?? { title: "IndustrialBrain AI", description: "" };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-base)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={meta.title} description={meta.description} />
        <main className="blueprint-grid flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
