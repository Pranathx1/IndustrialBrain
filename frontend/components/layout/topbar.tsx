"use client";

import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TopbarProps {
  title: string;
  description?: string;
}

export function Topbar({ title, description }: TopbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-base)]/80 px-6 backdrop-blur-xl">
      <div className="min-w-0">
        <h1 className="truncate text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
          {title}
        </h1>
        {description && (
          <p className="truncate text-xs text-[var(--color-text-muted)]">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] bg-white/[0.03] px-3 py-2 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--color-text-secondary)]">
          <Search className="size-3.5" strokeWidth={2} />
          <span>Search assets, documents…</span>
          <kbd className="ml-6 rounded border border-[var(--color-border-strong)] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-muted)]">
            ⌘K
          </kbd>
        </button>

        <Badge tone="success" dot>
          All systems operational
        </Badge>
      </div>
    </header>
  );
}
