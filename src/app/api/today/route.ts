import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { cases, tasks } from "@/lib/db/schema";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";
import { getDeadlineUrgency, isDueToday, isOverdue } from "@/lib/utils/dates";
import { isTaskInActiveWork } from "@/lib/utils/task-list-view";
import { isUpcomingHearing } from "@/lib/utils/hearings";

export const runtime = "nodejs";

export const GET = withAuth(async ({ user }) => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const allTasks = await db.select().from(tasks).where(isNull(tasks.deletedAt));
  const workTasks = allTasks.filter((t) =>
    isTaskInActiveWork({ status: t.status, archivedAt: t.archivedAt }),
  );

  const overdueTasks = workTasks
    .filter((t) => isOverdue(t.deadline, t.status, now))
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
    .map((t) => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline,
      status: t.status,
      priority: t.priority,
      assignedTo: t.assignedTo,
      urgency: "overdue" as const,
    }));

  const todayTasks = workTasks
    .filter((t) => isDueToday(t.deadline, t.status, now))
    .map((t) => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline,
      status: t.status,
      priority: t.priority,
      assignedTo: t.assignedTo,
      urgency: getDeadlineUrgency(t.deadline, t.status, now),
    }));

  const myOpenTasks = workTasks
    .filter((t) => t.assignedTo === user.id)
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
    .slice(0, 20)
    .map((t) => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline,
      status: t.status,
      priority: t.priority,
      urgency: getDeadlineUrgency(t.deadline, t.status, now),
    }));

  const hearingRows = await db
    .select()
    .from(cases)
    .where(
      and(
        isNull(cases.deletedAt),
        eq(cases.status, "ACTIVE"),
        isNotNull(cases.nextHearingAt),
      ),
    );

  const todayHearings = hearingRows
    .filter((c) => {
      if (!c.nextHearingAt) return false;
      const h = c.nextHearingAt.getTime();
      return h >= start.getTime() && h <= end.getTime();
    })
    .sort((a, b) => a.nextHearingAt!.getTime() - b.nextHearingAt!.getTime())
    .map((c) => ({
      id: c.id,
      fileNumber: c.fileNumber,
      courtName: c.courtName,
      clientName: c.clientName,
      nextHearingAt: c.nextHearingAt!,
    }));

  const upcomingHearings = hearingRows
    .filter((c) => c.nextHearingAt && isUpcomingHearing(c.nextHearingAt, now, 7))
    .sort((a, b) => a.nextHearingAt!.getTime() - b.nextHearingAt!.getTime())
    .slice(0, 10)
    .map((c) => ({
      id: c.id,
      fileNumber: c.fileNumber,
      courtName: c.courtName,
      nextHearingAt: c.nextHearingAt!,
    }));

  return jsonOk({
    summary: {
      todayTaskCount: todayTasks.length,
      todayHearingCount: todayHearings.length,
      myOpenCount: myOpenTasks.length,
      overdueCount: overdueTasks.length,
    },
    overdueTasks,
    todayTasks,
    todayHearings,
    upcomingHearings,
    myOpenTasks,
  });
});
