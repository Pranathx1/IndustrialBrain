"use client";

import { useEffect, useState } from "react";
import { KpiCardView, KpiCardSkeleton } from "@/components/dashboard/kpi-card";
import { AssetHealthChart } from "@/components/dashboard/asset-health-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { SignalTrace } from "@/components/dashboard/signal-trace";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { dashboardApi, ApiError, type DashboardSummary } from "@/lib/api";

type LoadState = "loading" | "success" | "error";

export default function DashboardPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function load() {
    setState("loading");
    dashboardApi
      .summary()
      .then((res) => {
        setData(res);
        setState("success");
      })
      .catch((err) => {
        setErrorMessage(err instanceof ApiError ? err.message : "Couldn't reach the dashboard service.");
        setState("error");
      });
  }

  useEffect(load, []);

  if (state === "error") {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-[var(--color-critical-soft)] text-[var(--color-critical)]">
          <AlertTriangle className="size-5" strokeWidth={2} />
        </div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">Dashboard failed to load</p>
        <p className="max-w-sm text-xs text-[var(--color-text-muted)]">{errorMessage}</p>
        <Button variant="secondary" size="sm" onClick={load} className="mt-1">
          <RefreshCw className="size-3.5" strokeWidth={2} />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-base-raised)] px-6 py-5">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              Operational Overview
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              The enterprise intelligence layer for industrial operations
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw className="size-3.5" strokeWidth={2} />
            Refresh
          </Button>
        </div>
        <SignalTrace className="pointer-events-none absolute inset-x-0 bottom-0 h-14 w-full opacity-70" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {state === "loading"
          ? Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          : data!.kpis.map((kpi) => <KpiCardView key={kpi.id} data={kpi} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {state === "loading" ? (
          <>
            <Card className="h-[360px] animate-pulse lg:col-span-2" />
            <Card className="h-[360px] animate-pulse" />
          </>
        ) : (
          <>
            <AssetHealthChart data={data!.asset_health_trend} />
            <ActivityFeed items={data!.recent_activity} />
          </>
        )}
      </div>
    </div>
  );
}
