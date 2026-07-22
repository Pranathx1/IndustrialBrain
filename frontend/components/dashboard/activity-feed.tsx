import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FileStack, SearchCode } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/lib/api";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Live actions across the platform</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {items.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--color-text-muted)]">
            No activity yet — upload a document to get started.
          </p>
        ) : (
          <ul className="flex flex-col">
            {items.map((item, i) => {
              const Icon = item.actor === "Root Cause Agent" ? SearchCode : FileStack;
              return (
                <li
                  key={item.id}
                  className={cn("flex gap-3 py-3", i !== items.length - 1 && "border-b border-[var(--color-border)]")}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]">
                    <Icon className="size-4" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">{item.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-[var(--color-text-secondary)]">{item.detail}</p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                      {item.actor}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
