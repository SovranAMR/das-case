import { differenceInCalendarDays, isBefore, isSameDay } from "date-fns";

export type CompletionTiming = "early" | "on_time" | "late";

export function getCompletionTiming(
  deadline: Date,
  completedAt: Date,
): CompletionTiming {
  if (isSameDay(completedAt, deadline)) {
    return "on_time";
  }

  if (isBefore(completedAt, deadline)) {
    return "early";
  }

  return "late";
}

export function getCompletionDayDiff(deadline: Date, completedAt: Date): number {
  return Math.abs(differenceInCalendarDays(deadline, completedAt));
}

export function formatCompletionLabel(deadline: Date, completedAt: Date): string {
  const timing = getCompletionTiming(deadline, completedAt);
  const days = getCompletionDayDiff(deadline, completedAt);

  if (timing === "on_time") {
    return "Zamanında tamamlandı";
  }

  if (timing === "early") {
    return days === 1 ? "1 gün erken tamamlandı" : `${days} gün erken tamamlandı`;
  }

  return days === 1 ? "1 gün geç tamamlandı" : `${days} gün geç tamamlandı`;
}
