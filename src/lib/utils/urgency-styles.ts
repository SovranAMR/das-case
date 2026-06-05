import type { DeadlineUrgency } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const urgencyRowStyles: Partial<Record<DeadlineUrgency, string>> = {
  overdue: "border-l-4 border-l-red-600 bg-red-50 ring-1 ring-inset ring-red-200",
  today: "border-l-4 border-l-orange-600 bg-orange-50 ring-1 ring-inset ring-orange-200",
  soon: "border-l-4 border-l-amber-500 bg-amber-50/90",
};

export function getUrgencyRowClassName(urgency: DeadlineUrgency): string {
  return urgencyRowStyles[urgency] ?? "";
}

export function urgencyRowClass(urgency: DeadlineUrgency, extra?: string): string {
  return cn("rounded-lg border border-border p-3", getUrgencyRowClassName(urgency), extra);
}

export const URGENCY_FILTER_OPTIONS = [
  { value: "", label: "Tüm aciliyetler" },
  { value: "overdue", label: "Gecikmiş" },
  { value: "today", label: "Bugün" },
  { value: "soon", label: "Yaklaşan (3 gün)" },
  { value: "normal", label: "Normal" },
] as const;
