import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { KpiCard as KpiCardData } from "@/lib/api";

const TONE_STYLES: Record<string, string> = {
  default: "text-[var(--color-text-primary)]",
  success: "text-[var(--color-success)]",
  warning: "text-[var(--color-warning)]",
  critical: "text-[var(--color-critical)]",
};

export function KpiCardView({ data }: { data: KpiCardData }) {
  const tone = data.tone ?? "default";
  const TrendIcon = data.trend === "up" ? ArrowUpRight : data.trend === "down" ? ArrowDownRight : null;

  return (
    <Card className="p-5 transition-colors hover:bg-[var(--color-surface-hover)]">
      <p className="text-xs font-medium text-[var(--color-text-muted)]">{data.label}</p>
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className={cn("font-mono-tabular text-[26px] font-semibold leading-none", TONE_STYLES[tone])}>
          {data.value}
        </span>
        {data.unit && <span className="font-mono-tabular text-xs text-[var(--color-text-muted)]">{data.unit}</span>}
      </div>
      {data.delta && (
        <div className="mt-3 flex items-center gap-1">
          {TrendIcon && <TrendIcon className="size-3.5 text-[var(--color-success)]" strokeWidth={2.5} />}
          <span className="font-mono-tabular text-[11px] text-[var(--color-text-muted)]">{data.delta}</span>
        </div>
      )}
    </Card>
  );
}

export function KpiCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-3 h-7 w-16 animate-pulse rounded bg-white/[0.08]" />
      <div className="mt-3 h-2.5 w-28 animate-pulse rounded bg-white/[0.05]" />
    </Card>
  );
}
