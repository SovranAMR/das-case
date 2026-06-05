import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reminders, tasks } from "@/lib/db/schema";
import {
  buildReminderSchedule,
  parseReminderOffsets,
} from "@/lib/reminders/calculate";
import type { ReminderOffset } from "@/lib/types";

export async function syncTaskReminders(
  taskId: string,
  deadline: Date,
  offsets: ReminderOffset[],
): Promise<void> {
  await db.delete(reminders).where(eq(reminders.taskId, taskId));

  const schedule = buildReminderSchedule(deadline, offsets);
  if (schedule.length === 0) return;

  await db.insert(reminders).values(
    schedule.map((remindAt) => ({
      id: randomUUID(),
      taskId,
      remindAt,
    })),
  );
}

export async function rebuildRemindersForTask(taskId: string): Promise<void> {
  const rows = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const task = rows[0];

  if (!task || task.deletedAt) return;

  const offsets = parseReminderOffsets(task.reminderOffsets);
  await syncTaskReminders(taskId, task.deadline, offsets);
}
