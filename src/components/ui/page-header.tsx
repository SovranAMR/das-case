import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

export function PageHeader({
  label,
  title,
  description,
  className,
  children,
}: {
  label?: string;
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div>
        {label && <p className="das-section-label mb-2">{label}</p>}
        <h1 className="das-page-title">{title}</h1>
        {description && <p className="mt-2 text-text-secondary">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <h2 className={cn("font-serif text-xl leading-tight text-text-primary", className)}>{children}</h2>;
}
