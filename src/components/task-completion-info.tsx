import { CompletionBadge } from "@/components/ui/badge";
import { formatCompletionLabel, getCompletionTiming } from "@/lib/utils/completion";
import { formatDateTime } from "@/lib/utils/dates";
import type { TaskStatus } from "@/lib/types";

export function TaskCompletionInfo({
  status,
  deadline,
  completedAt,
}: {
  status: TaskStatus;
  deadline: string | Date;
  completedAt?: string | Date | null;
}) {
  if (status !== "COMPLETED" || !completedAt) return null;

  const deadlineDate = new Date(deadline);
  const completedDate = new Date(completedAt);
  const timing = getCompletionTiming(deadlineDate, completedDate);
  const label = formatCompletionLabel(deadlineDate, completedDate);

  return (
    <div className="mt-2 space-y-1">
      <CompletionBadge timing={timing} label={label} />
      <p className="text-xs text-muted">Tamamlanma: {formatDateTime(completedDate)}</p>
    </div>
  );
}
