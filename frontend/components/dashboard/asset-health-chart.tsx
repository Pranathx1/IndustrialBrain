"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { AssetHealthPoint } from "@/lib/api";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-[var(--radius-control)] border border-[var(--color-border-strong)] p-3 text-xs shadow-[var(--shadow-card)]">
      <p className="mb-1.5 font-medium text-[var(--color-text-primary)]">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-mono-tabular text-[var(--color-text-primary)]">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function AssetHealthChart({ data }: { data: AssetHealthPoint[] }) {
  const latest = data[data.length - 1];
  const total = latest ? latest.healthy + latest.warning + latest.critical : 0;
  const pct = total ? Math.round((latest!.healthy / total) * 100) : 100;

  return (
    <Card className="col-span-2">
      <CardHeader>
        <div>
          <CardTitle>Asset Health Trend</CardTitle>
          <CardDescription>6-month rolling view across the industrial estate</CardDescription>
        </div>
        <Badge tone="success" dot>
          {pct}% healthy
        </Badge>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="healthyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="criticalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-critical)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-critical)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)" }} />
              <Area type="monotone" dataKey="healthy" name="Healthy" stroke="var(--color-success)" strokeWidth={2} fill="url(#healthyFill)" />
              <Area type="monotone" dataKey="critical" name="Critical" stroke="var(--color-critical)" strokeWidth={2} fill="url(#criticalFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
