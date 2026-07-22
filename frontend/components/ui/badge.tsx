import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border",
  {
    variants: {
      tone: {
        default: "bg-white/[0.04] text-[var(--color-text-secondary)] border-[var(--color-border)]",
        accent: "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)] border-[var(--color-accent)]/20",
        success: "bg-[var(--color-success-soft)] text-[var(--color-success)] border-[var(--color-success)]/20",
        warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning)]/20",
        critical: "bg-[var(--color-critical-soft)] text-[var(--color-critical)] border-[var(--color-critical)]/20",
      },
    },
    defaultVariants: { tone: "default" },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "size-1.5 rounded-full",
            tone === "success" && "bg-[var(--color-success)]",
            tone === "warning" && "bg-[var(--color-warning)]",
            tone === "critical" && "bg-[var(--color-critical)]",
            tone === "accent" && "bg-[var(--color-accent)]",
            (!tone || tone === "default") && "bg-[var(--color-text-muted)]"
          )}
        />
      )}
      {children}
    </span>
  );
}
