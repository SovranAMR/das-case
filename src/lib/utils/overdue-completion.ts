import { isOverdue } from "@/lib/utils/dates";
import type { TaskStatus } from "@/lib/types";

export function requiresOverdueReason(
  deadline: Date,
  previousStatus: TaskStatus,
  newStatus: TaskStatus,
): boolean {
  if (newStatus !== "COMPLETED") return false;
  return isOverdue(deadline, previousStatus);
}

export function isValidOverdueReason(reason: string | undefined): boolean {
  return typeof reason === "string" && reason.trim().length >= 10;
}
