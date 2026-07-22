"use client";

import { cn } from "@/lib/utils";
import { LayoutDashboard, FileStack, Sparkles, SearchCode, Share2, Waves, ChevronsLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Document Intelligence", href: "/documents", icon: FileStack },
  { label: "AI Copilot", href: "/copilot", icon: Sparkles },
  { label: "Root Cause Analysis", href: "/rca", icon: SearchCode },
  { label: "Knowledge Graph", href: "/graph", icon: Share2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-[var(--color-border)] bg-[var(--color-base-raised)] transition-[width] duration-200",
        collapsed ? "w-[76px]" : "w-[260px]"
      )}
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-[var(--color-border)] px-5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]">
          <Waves className="size-4.5" strokeWidth={2.25} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
              IndustrialBrain
            </p>
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              Enterprise
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]"
                      : "text-[var(--color-text-secondary)] hover:bg-white/[0.04] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[var(--color-accent)]" />
                  )}
                  <Icon className="size-4.5 shrink-0" strokeWidth={2} />
                  {!collapsed && <span className="truncate font-medium">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[var(--color-border)] px-3 py-3">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--color-text-secondary)]"
        >
          <ChevronsLeft className={cn("size-4.5 shrink-0 transition-transform", collapsed && "rotate-180")} strokeWidth={2} />
          {!collapsed && <span className="font-medium">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
