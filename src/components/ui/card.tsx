import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded border border-border bg-bg-surface/80 p-5 transition-[transform,border-color] duration-300",
        className,
      )}
      {...props}
    />
  );
}
