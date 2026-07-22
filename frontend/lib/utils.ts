import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class lists safely — later classes win over earlier
 * conflicting ones (e.g. `p-4` vs `p-2`), unlike a plain template string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
