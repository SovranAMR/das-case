import { cn } from "@/lib/utils/cn";
import type { SelectHTMLAttributes } from "react";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded border border-border bg-bg-surface px-4 py-3 text-sm text-text-primary transition-colors focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary/20",
        className,
      )}
      {...props}
    />
  );
}
