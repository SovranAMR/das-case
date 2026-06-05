import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-text-primary text-bg hover:bg-[#333] active:bg-[#444] tracking-wide",
  secondary:
    "border border-border-strong bg-bg-surface text-text-primary hover:border-text-primary hover:bg-text-primary hover:text-bg",
  danger:
    "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
  ghost:
    "bg-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-text-primary/20 focus-visible:ring-offset-2",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
