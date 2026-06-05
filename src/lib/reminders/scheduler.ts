import cron from "node-cron";
import { and, eq, isNull, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { reminders, tasks } from "@/lib/db/schema";
import type { UserRole } from "@/lib/types";
import { canUserReceiveReminder } from "@/lib/reminders/scope";
import { processEscalations } from "@/lib/services/escalation";

export type ReminderEvent = {
  reminderId: string;
  taskId: string;
  taskTitle: string;
  deadline: string;
  remindAt: string;
};

type ReminderSubscriber = {
  userId: string;
  role: UserRole;
  callback: (event: ReminderEvent) => void;
};

const subscribers = new Set<ReminderSubscriber>();
let started = false;

export function subscribeToReminders(
  userId: string,
  role: UserRole,
  callback: (event: ReminderEvent) => void,
): () => void {
  const subscriber: ReminderSubscriber = { userId, role, callback };
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

function publish(
  event: ReminderEvent,
  audience: { assignedTo: string | null; createdBy: string },
): void {
  for (const subscriber of subscribers) {
    if (
      canUserReceiveReminder(subscriber.userId, subscriber.role, audience)
    ) {
      subscriber.callback(event);
    }
  }
}

export async function processDueReminders(): Promise<number> {
  const now = new Date();

  const dueReminders = await db
    .select({
      reminderId: reminders.id,
      taskId: reminders.taskId,
      remindAt: reminders.remindAt,
      taskTitle: tasks.title,
      deadline: tasks.deadline,
      assignedTo: tasks.assignedTo,
      createdBy: tasks.createdBy,
    })
    .from(reminders)
    .innerJoin(tasks, eq(reminders.taskId, tasks.id))
    .where(
      and(
        lte(reminders.remindAt, now),
        isNull(reminders.dismissedAt),
        isNull(reminders.sentAt),
        isNull(tasks.deletedAt),
      ),
    );

  for (const row of dueReminders) {
    publish(
      {
        reminderId: row.reminderId,
        taskId: row.taskId,
        taskTitle: row.taskTitle,
        deadline: row.deadline.toISOString(),
        remindAt: row.remindAt.toISOString(),
      },
      {
        assignedTo: row.assignedTo,
        createdBy: row.createdBy,
      },
    );

    await db
      .update(reminders)
      .set({ sentAt: now })
      .where(eq(reminders.id, row.reminderId));
  }

  return dueReminders.length;
}

export function startReminderScheduler(): void {
  if (started) return;
  started = true;

  cron.schedule("* * * * *", () => {
    void processDueReminders();
    void processEscalations();
  });

  void processDueReminders();
  void processEscalations();
}
