import { randomUUID } from "crypto";
import { and, eq, isNull, lte, ne, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLogs, escalationDismissals, tasks, users } from "@/lib/db/schema";
import { logActivity } from "@/lib/services/activity";

type AppDb = typeof db;

export const ESCALATION_DAYS = 3;
const ESCALATION_ID_PREFIX = "escalation-";

export type EscalationNotification = {
  id: string;
  type: "escalation";
  taskId: string;
  taskTitle: string;
  deadline: Date;
  daysOverdue: number;
};

function daysOverdue(deadline: Date, now: Date): number {
  const ms = now.getTime() - deadline.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export function parseEscalationNotificationId(id: string): string | null {
  if (!id.startsWith(ESCALATION_ID_PREFIX)) return null;
  const taskId = id.slice(ESCALATION_ID_PREFIX.length);
  return taskId.length > 0 ? taskId : null;
}

export async function getEscalationNotifications(
  adminUserId: string,
  now: Date = new Date(),
  database: AppDb = db,
): Promise<EscalationNotification[]> {
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() - ESCALATION_DAYS);

  const dismissed = await database
    .select({ taskId: escalationDismissals.taskId })
    .from(escalationDismissals)
    .where(eq(escalationDismissals.userId, adminUserId));

  const dismissedTaskIds = dismissed.map((row) => row.taskId);

  const rows = await database
    .select({
      id: tasks.id,
      title: tasks.title,
      deadline: tasks.deadline,
    })
    .from(tasks)
    .where(
      and(
        isNull(tasks.deletedAt),
        isNull(tasks.archivedAt),
        ne(tasks.status, "COMPLETED"),
        ne(tasks.status, "CANCELLED"),
        lte(tasks.deadline, threshold),
        dismissedTaskIds.length > 0 ? notInArray(tasks.id, dismissedTaskIds) : undefined,
      ),
    );

  return rows.map((row) => ({
    id: `${ESCALATION_ID_PREFIX}${row.id}`,
    type: "escalation" as const,
    taskId: row.id,
    taskTitle: row.title,
    deadline: row.deadline,
    daysOverdue: daysOverdue(row.deadline, now),
  }));
}

export async function dismissEscalation(
  taskId: string,
  adminUserId: string,
  database: AppDb = db,
): Promise<boolean> {
  const [task] = await database
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);

  if (!task) return false;

  try {
    await database.insert(escalationDismissals).values({
      id: randomUUID(),
      taskId,
      userId: adminUserId,
    });
    return true;
  } catch {
    return true;
  }
}

export async function processEscalations(now: Date = new Date()): Promise<number> {
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "ADMIN"), eq(users.active, true)));

  if (admins.length === 0) return 0;

  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() - ESCALATION_DAYS);

  const overdueTasks = await db
    .select({ id: tasks.id, deadline: tasks.deadline })
    .from(tasks)
    .where(
      and(
        isNull(tasks.deletedAt),
        isNull(tasks.archivedAt),
        ne(tasks.status, "COMPLETED"),
        ne(tasks.status, "CANCELLED"),
        lte(tasks.deadline, threshold),
      ),
    );

  let logged = 0;
  const actorId = admins[0]!.id;

  for (const task of overdueTasks) {
    const [existing] = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs)
      .where(and(eq(activityLogs.taskId, task.id), eq(activityLogs.action, "TASK_ESCALATED")));

    if ((existing?.count ?? 0) > 0) continue;

    const overdueDays = daysOverdue(task.deadline, now);
    await logActivity({
      taskId: task.id,
      action: "TASK_ESCALATED",
      details: `${overdueDays} gün gecikmiş — yönetici bildirimi`,
      userId: actorId,
    });
    logged += 1;
  }

  return logged;
}
