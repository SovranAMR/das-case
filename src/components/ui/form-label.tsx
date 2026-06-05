import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function FormLabel({
  children,
  required,
  htmlFor,
  className,
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("mb-1 block text-sm font-medium", className)}
    >
      {children}
      {required && <span className="ml-0.5 text-red-600">*</span>}
    </label>
  );
}
