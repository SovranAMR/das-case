import { and, desc, eq, isNull, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { reminders, tasks } from "@/lib/db/schema";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";
import { canUserReceiveReminder } from "@/lib/reminders/scope";
import { getEscalationNotifications } from "@/lib/services/escalation";

export const runtime = "nodejs";

export const GET = withAuth(async ({ user }) => {
  const now = new Date();

  const rows = await db
    .select({
      reminder: reminders,
      task: tasks,
    })
    .from(reminders)
    .innerJoin(tasks, eq(reminders.taskId, tasks.id))
    .where(
      and(
        lte(reminders.remindAt, now),
        isNull(reminders.dismissedAt),
        isNull(tasks.deletedAt),
      ),
    )
    .orderBy(desc(reminders.remindAt));

  const notifications = rows
    .filter((row) =>
      canUserReceiveReminder(user.id, user.role, {
        assignedTo: row.task.assignedTo,
        createdBy: row.task.createdBy,
      }),
    )
    .map((row) => ({
      type: "reminder" as const,
      id: row.reminder.id,
      taskId: row.task.id,
      taskTitle: row.task.title,
      deadline: row.task.deadline,
      remindAt: row.reminder.remindAt,
      priority: row.task.priority,
    }));

  const escalationItems =
    user.role === "ADMIN"
      ? (await getEscalationNotifications(user.id, now)).map((item) => ({
          id: item.id,
          type: "escalation" as const,
          taskId: item.taskId,
          taskTitle: item.taskTitle,
          deadline: item.deadline,
          daysOverdue: item.daysOverdue,
        }))
      : [];

  const all = [...notifications, ...escalationItems];

  return jsonOk({
    notifications: all,
    reminderCount: notifications.length,
    escalationCount: escalationItems.length,
  });
});
