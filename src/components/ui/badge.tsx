import { cn } from "@/lib/utils/cn";
import type { CompletionTiming, DeadlineUrgency, TaskPriority } from "@/lib/types";

const urgencyStyles: Record<DeadlineUrgency, string> = {
  overdue: "bg-red-600 text-white font-semibold shadow-sm",
  today: "bg-orange-600 text-white font-semibold shadow-sm",
  soon: "bg-amber-500 text-white font-medium",
  normal: "border border-border bg-bg-elevated text-text-secondary",
  completed: "bg-green-100 text-green-800",
};

const priorityStyles: Record<TaskPriority, string> = {
  LOW: "border border-border bg-bg-elevated text-text-secondary",
  NORMAL: "bg-blue-100 text-blue-800",
  URGENT: "bg-orange-100 text-orange-800",
  LEGAL_DEADLINE: "bg-purple-100 text-purple-800",
};

export function UrgencyBadge({
  urgency,
  label,
}: {
  urgency: DeadlineUrgency;
  label: string;
}) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", urgencyStyles[urgency])}>
      {label}
    </span>
  );
}

const completionStyles: Record<CompletionTiming, string> = {
  early: "bg-emerald-100 text-emerald-800",
  on_time: "bg-green-100 text-green-800",
  late: "bg-amber-100 text-amber-900",
};

export function CompletionBadge({
  timing,
  label,
}: {
  timing: CompletionTiming;
  label: string;
}) {
  return (
    <span
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", completionStyles[timing])}
    >
      {label}
    </span>
  );
}

export function PriorityBadge({
  priority,
  label,
}: {
  priority: TaskPriority;
  label: string;
}) {
  return (
    <span
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", priorityStyles[priority])}
    >
      {label}
    </span>
  );
}
