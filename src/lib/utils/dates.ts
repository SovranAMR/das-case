import {
  endOfDay,
  endOfWeek,
  isBefore,
  isSameDay,
  isWithinInterval,
  startOfDay,
  startOfWeek,
} from "date-fns";
import type { DeadlineUrgency, TaskStatus } from "@/lib/types";

export function getDeadlineUrgency(
  deadline: Date,
  status: TaskStatus,
  now = new Date(),
): DeadlineUrgency {
  if (status === "COMPLETED" || status === "CANCELLED") {
    return "completed";
  }

  if (isBefore(deadline, now)) {
    return "overdue";
  }

  if (isSameDay(deadline, now)) {
    return "today";
  }

  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  if (isBefore(deadline, threeDaysLater)) {
    return "soon";
  }

  return "normal";
}

export function isOverdue(deadline: Date, status: TaskStatus, now = new Date()): boolean {
  return getDeadlineUrgency(deadline, status, now) === "overdue";
}

export function isDueToday(deadline: Date, status: TaskStatus, now = new Date()): boolean {
  if (status === "COMPLETED" || status === "CANCELLED") return false;
  return isSameDay(deadline, now);
}

export function isDueThisWeek(deadline: Date, status: TaskStatus, now = new Date()): boolean {
  if (status === "COMPLETED" || status === "CANCELLED") return false;
  return isWithinInterval(deadline, {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  });
}

export function isDueTodayOrBefore(
  deadline: Date,
  status: TaskStatus,
  now = new Date(),
): boolean {
  if (status === "COMPLETED" || status === "CANCELLED") return false;
  return isBefore(deadline, endOfDay(now)) || isSameDay(deadline, now);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(date);
}

export function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseDateTimeLocalValue(value: string): Date {
  return new Date(value);
}

export function startOfToday(now = new Date()): Date {
  return startOfDay(now);
}
