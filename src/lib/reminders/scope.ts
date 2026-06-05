import type { UserRole } from "@/lib/types";

export type ReminderAudience = {
  assignedTo: string | null;
  createdBy: string;
};

export function canUserReceiveReminder(
  userId: string,
  role: UserRole,
  audience: ReminderAudience,
): boolean {
  if (role === "ADMIN") return true;
  return audience.assignedTo === userId || audience.createdBy === userId;
}
