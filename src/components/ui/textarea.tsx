import { cn } from "@/lib/utils/cn";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded border border-border bg-bg-surface px-4 py-3 text-sm text-text-primary transition-colors placeholder:text-text-tertiary focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary/20",
        className,
      )}
      {...props}
    />
  );
}
