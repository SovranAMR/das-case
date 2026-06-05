import { randomUUID } from "crypto";
import { and, eq, isNull, like, or } from "drizzle-orm";
import { buildTaskViewFilter } from "@/lib/api/task-filters";
import type { TaskListView } from "@/lib/utils/task-list-view";
import { db } from "@/lib/db";
import { cases, tasks, users } from "@/lib/db/schema";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  buildTaskOrderBy,
  parseSortParam,
  TASK_SORT_FIELDS,
} from "@/lib/api/sort";
import { createTaskSchema, defaultReminderOffsets } from "@/lib/api/validation";
import { withAuth } from "@/lib/api/with-auth";
import { parseDeadline } from "@/lib/api/parse";
import { logActivity } from "@/lib/services/activity";
import { syncTaskReminders } from "@/lib/services/reminders";
import { toLikePattern } from "@/lib/search/escape-like";

export const runtime = "nodejs";

export const GET = withAuth(async ({ request }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const caseId = url.searchParams.get("caseId");
  const assignedTo = url.searchParams.get("assignedTo");
  const limitParam = parseInt(url.searchParams.get("limit") ?? "200", 10);
  const offsetParam = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const limit = Math.min(Math.max(limitParam, 1), 500);
  const offset = Math.max(offsetParam, 0);
  const viewParam = url.searchParams.get("view");
  const view: TaskListView =
    viewParam === "completed" || viewParam === "archived" ? viewParam : "active";
  const { field, order } = parseSortParam(
    url.searchParams.get("sort"),
    url.searchParams.get("order"),
    TASK_SORT_FIELDS,
    "deadline",
    "asc",
  );

  const rows = await db
    .select({
      task: tasks,
      caseCourtName: cases.courtName,
      caseFileNumber: cases.fileNumber,
      assigneeName: users.name,
    })
    .from(tasks)
    .leftJoin(cases, eq(tasks.caseId, cases.id))
    .leftJoin(users, eq(tasks.assignedTo, users.id))
    .where(
      and(
        isNull(tasks.deletedAt),
        buildTaskViewFilter(view, { forCaseDetail: Boolean(caseId) }),
        status ? eq(tasks.status, status as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED") : undefined,
        priority
          ? eq(tasks.priority, priority as "LOW" | "NORMAL" | "URGENT" | "LEGAL_DEADLINE")
          : undefined,
        caseId ? eq(tasks.caseId, caseId) : undefined,
        assignedTo ? eq(tasks.assignedTo, assignedTo) : undefined,
        q
          ? (() => {
              const pattern = toLikePattern(q);
              return or(
                like(tasks.title, pattern),
                like(tasks.description, pattern),
                like(cases.fileNumber, pattern),
                like(cases.clientName, pattern),
              );
            })()
          : undefined,
      ),
    )
    .orderBy(buildTaskOrderBy(field, order))
    .limit(limit)
    .offset(offset);

  return jsonOk({
    tasks: rows.map((row) => ({
      ...row.task,
      caseCourtName: row.caseCourtName,
      caseFileNumber: row.caseFileNumber,
      assigneeName: row.assigneeName,
    })),
  });
});

export const POST = withAuth(async ({ request, user }) => {
  const body = await request.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Geçersiz veri", 400);
  }

  let deadline: Date;
  try {
    deadline = parseDeadline(parsed.data.deadline);
  } catch {
    return jsonError("Geçersiz son tarih", 400);
  }

  const offsets = parsed.data.reminderOffsets ?? defaultReminderOffsets;
  const id = randomUUID();
  const now = new Date();

  await db.insert(tasks).values({
    id,
    caseId: parsed.data.caseId ?? null,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    deadline,
    priority: parsed.data.priority ?? "NORMAL",
    status: parsed.data.status ?? "PENDING",
    taskType: parsed.data.taskType ?? "GENERAL",
    assignedTo: parsed.data.assignedTo,
    assignedAt: parsed.data.assignedTo ? now : null,
    reminderOffsets: JSON.stringify(offsets),
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  });

  await syncTaskReminders(id, deadline, offsets);

  await logActivity({
    caseId: parsed.data.caseId ?? null,
    taskId: id,
    action: "TASK_CREATED",
    details: parsed.data.title,
    userId: user.id,
  });

  const created = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return jsonOk({ task: created[0] }, { status: 201 });
});
