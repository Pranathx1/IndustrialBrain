import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/** Shimmer skeleton block used for every module's loading state. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.04] bg-[length:200%_100%]",
        className
      )}
      style={{ animation: "shimmer 1.8s ease-in-out infinite" }}
      {...props}
    />
  );
}
