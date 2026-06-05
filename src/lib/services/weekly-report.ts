import { and, eq, gte, isNull, lte, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLogs, cases, tasks } from "@/lib/db/schema";

export function getWeekStart(reference: Date = new Date()): Date {
  const start = new Date(reference);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getWeekEndLabel(weekStart: Date): Date {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export type WeeklyReport = {
  weekStart: string;
  weekEnd: string;
  weekEndLabel: string;
  overdueOpen: number;
  completedThisWeek: number;
  newCasesThisWeek: number;
  hearingsThisWeek: number;
  deadlineChangesThisWeek: number;
};

export async function buildWeeklyReport(reference: Date = new Date()): Promise<WeeklyReport> {
  const weekStart = getWeekStart(reference);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const now = reference;

  const [overdueRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(
      and(
        isNull(tasks.deletedAt),
        ne(tasks.status, "COMPLETED"),
        ne(tasks.status, "CANCELLED"),
        lte(tasks.deadline, now),
      ),
    );

  const [completedRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(
      and(
        isNull(tasks.deletedAt),
        eq(tasks.status, "COMPLETED"),
        gte(tasks.completedAt, weekStart),
        lte(tasks.completedAt, weekEnd),
      ),
    );

  const [newCasesRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(cases)
    .where(
      and(
        isNull(cases.deletedAt),
        gte(cases.createdAt, weekStart),
        lte(cases.createdAt, weekEnd),
      ),
    );

  const [hearingsRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(cases)
    .where(
      and(
        isNull(cases.deletedAt),
        gte(cases.nextHearingAt, weekStart),
        lte(cases.nextHearingAt, weekEnd),
      ),
    );

  const [deadlineChangesRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.action, "TASK_DEADLINE_CHANGED"),
        gte(activityLogs.createdAt, weekStart),
        lte(activityLogs.createdAt, weekEnd),
      ),
    );

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    weekEndLabel: getWeekEndLabel(weekStart).toISOString(),
    overdueOpen: overdueRow?.count ?? 0,
    completedThisWeek: completedRow?.count ?? 0,
    newCasesThisWeek: newCasesRow?.count ?? 0,
    hearingsThisWeek: hearingsRow?.count ?? 0,
    deadlineChangesThisWeek: deadlineChangesRow?.count ?? 0,
  };
}
