import type { ReminderOffset } from "@/lib/types";

export function calculateRemindAt(deadline: Date, offset: ReminderOffset): Date {
  const remindAt = new Date(deadline);

  if (offset.days) {
    remindAt.setDate(remindAt.getDate() - offset.days);
  }

  if (offset.hours) {
    remindAt.setHours(remindAt.getHours() - offset.hours);
  }

  return remindAt;
}

export function buildReminderSchedule(
  deadline: Date,
  offsets: ReminderOffset[],
  now = new Date(),
): Date[] {
  const unique = new Map<number, Date>();

  for (const offset of offsets) {
    const remindAt = calculateRemindAt(deadline, offset);
    if (remindAt.getTime() <= now.getTime()) {
      continue;
    }
    unique.set(remindAt.getTime(), remindAt);
  }

  return Array.from(unique.values()).sort((a, b) => a.getTime() - b.getTime());
}

export function parseReminderOffsets(raw: string): ReminderOffset[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("reminderOffsets geçersiz");
  }

  return parsed.map((item) => {
    if (typeof item !== "object" || item === null) {
      throw new Error("reminderOffsets geçersiz");
    }
    const offset = item as Record<string, unknown>;
    const days = typeof offset.days === "number" ? offset.days : undefined;
    const hours = typeof offset.hours === "number" ? offset.hours : undefined;

    if (days === undefined && hours === undefined) {
      throw new Error("reminderOffsets en az bir gün veya saat içermeli");
    }

    return { days, hours };
  });
}
