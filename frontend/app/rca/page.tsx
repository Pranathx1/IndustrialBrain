"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { rcaApi, ApiError, type IncidentOut, type RCAAnalysisOut } from "@/lib/api";
import { AlertTriangle, SearchCode, Loader2, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_TONE: Record<string, "default" | "warning" | "critical"> = {
  near_miss: "default",
  minor: "default",
  major: "warning",
  critical: "critical",
};

export default function RCAPage() {
  const [incidents, setIncidents] = useState<IncidentOut[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<RCAAnalysisOut | null>(null);
  const [listState, setListState] = useState<"loading" | "success" | "error" | "empty">("loading");
  const [analysisState, setAnalysisState] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    rcaApi
      .listIncidents()
      .then((res) => {
        setIncidents(res);
        setListState(res.length === 0 ? "empty" : "success");
        if (res.length > 0 && res[0]) selectIncident(res[0].id);
      })
      .catch(() => setListState("error"));
  }, []);

  function selectIncident(id: string) {
    setSelectedId(id);
    setAnalysisState("loading");
    setAnalysis(null);
    rcaApi
      .analyze(id)
      .then((res) => {
        setAnalysis(res);
        setAnalysisState("success");
      })
      .catch(() => setAnalysisState("error"));
  }

  if (listState === "error") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-center">
        <AlertTriangle className="size-6 text-[var(--color-critical)]" strokeWidth={2} />
        <p className="text-sm font-medium text-[var(--color-text-primary)]">Couldn&apos;t load incidents</p>
      </div>
    );
  }

  if (listState === "empty") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-center">
        <FileWarning className="size-6 text-[var(--color-text-muted)]" strokeWidth={1.75} />
        <p className="text-sm font-medium text-[var(--color-text-primary)]">No incidents on record</p>
        <p className="max-w-sm text-xs text-[var(--color-text-muted)]">
          When an incident or near-miss is logged, it will appear here for root cause analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 pb-10 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <div>
            <CardTitle>Incidents</CardTitle>
            <CardDescription>Select one to run analysis</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          {listState === "loading" ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {incidents!.map((incident) => (
                <li key={incident.id}>
                  <button
                    onClick={() => selectIncident(incident.id)}
                    className={cn(
                      "w-full rounded-[var(--radius-control)] border px-3 py-2.5 text-left transition-colors",
                      selectedId === incident.id
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                        : "border-[var(--color-border)] hover:bg-white/[0.03]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
                        {incident.title}
                      </span>
                      <Badge tone={SEVERITY_TONE[incident.severity] ?? "default"} className="shrink-0 px-1.5 py-0 text-[9px]">
                        {incident.severity.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-0.5 font-mono-tabular text-[10px] text-[var(--color-text-muted)]">
                      {incident.asset_tag} · {new Date(incident.occurred_at).toLocaleDateString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 lg:col-span-2">
        {analysisState === "loading" && (
          <Card className="flex h-64 flex-col items-center justify-center gap-2">
            <Loader2 className="size-5 animate-spin text-[var(--color-text-muted)]" strokeWidth={2} />
            <p className="text-xs text-[var(--color-text-muted)]">Analyzing evidence…</p>
          </Card>
        )}

        {analysisState === "success" && analysis && (
          <>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Candidate causes</CardTitle>
                  <CardDescription>Ranked by supporting evidence strength</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 pt-3">
                {analysis.candidate_causes.map((cause, i) => (
                  <div key={i} className="rounded-[var(--radius-control)] border border-[var(--color-border)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{cause.cause}</p>
                      <span className="font-mono-tabular text-sm font-semibold text-[var(--color-accent-strong)]">
                        {Math.round(cause.confidence * 100)}%
                      </span>
                    </div>
                    <div className="mt-2.5 flex flex-col gap-1.5">
                      {cause.evidence.map((e, j) => (
                        <div key={j} className="flex items-start gap-2 text-[11px] text-[var(--color-text-secondary)]">
                          <SearchCode className="mt-0.5 size-3 shrink-0 text-[var(--color-text-muted)]" strokeWidth={2} />
                          <span>
                            <span className="text-[var(--color-text-muted)]">{e.source}:</span> {e.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2.5 rounded-[6px] bg-[var(--color-accent-soft)] px-2.5 py-1.5 text-[11px] text-[var(--color-accent-strong)]">
                      {cause.recommendation}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {analysis.similar_incidents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Similar prior incidents</CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <ul className="flex flex-col gap-2">
                    {analysis.similar_incidents.map((s) => (
                      <li key={s.id} className="flex items-center justify-between text-[13px]">
                        <span className="text-[var(--color-text-primary)]">{s.title}</span>
                        <span className="font-mono-tabular text-[11px] text-[var(--color-text-muted)]">
                          {new Date(s.occurred_at).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
