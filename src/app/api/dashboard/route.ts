import { and, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";
import { getDeadlineUrgency, isDueThisWeek, isDueToday } from "@/lib/utils/dates";

export const runtime = "nodejs";

export const GET = withAuth(async () => {
  const now = new Date();
  const rows = await db
    .select()
    .from(tasks)
    .where(isNull(tasks.deletedAt));

  let overdue = 0;
  let today = 0;
  let thisWeek = 0;
  let pending = 0;
  let legalDeadline = 0;

  const urgentTasks = rows
    .filter((task) => task.status !== "COMPLETED" && task.status !== "CANCELLED")
    .map((task) => ({
      ...task,
      urgency: getDeadlineUrgency(task.deadline, task.status, now),
    }))
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

  for (const task of rows) {
    if (task.status === "PENDING" || task.status === "IN_PROGRESS") {
      pending += 1;
    }
    if (task.priority === "LEGAL_DEADLINE" && task.status !== "COMPLETED") {
      legalDeadline += 1;
    }
    if (getDeadlineUrgency(task.deadline, task.status, now) === "overdue") {
      overdue += 1;
    }
    if (isDueToday(task.deadline, task.status, now)) {
      today += 1;
    }
    if (isDueThisWeek(task.deadline, task.status, now)) {
      thisWeek += 1;
    }
  }

  return jsonOk({
    stats: { overdue, today, thisWeek, pending, legalDeadline },
    urgentTasks: urgentTasks.slice(0, 10),
  });
});
