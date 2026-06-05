import { cn } from "@/lib/utils/cn";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded border border-border bg-bg-surface px-4 py-3 text-sm text-text-primary transition-colors placeholder:text-text-tertiary focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary/20",
        className,
      )}
      {...props}
    />
  );
}
