import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { reminders, tasks } from "@/lib/db/schema";
import { jsonError, jsonOk } from "@/lib/api/response";
import { updateTaskSchema, defaultReminderOffsets } from "@/lib/api/validation";
import { withAuth } from "@/lib/api/with-auth";
import { parseDeadline } from "@/lib/api/parse";
import { logActivity } from "@/lib/services/activity";
import { syncTaskReminders } from "@/lib/services/reminders";
import { formatCompletionLabel } from "@/lib/utils/completion";
import { formatDateTime } from "@/lib/utils/dates";
import {
  isValidOverdueReason,
  requiresOverdueReason,
} from "@/lib/utils/overdue-completion";
import { canArchiveTask } from "@/lib/utils/task-list-view";
import type { ReminderOffset } from "@/lib/types";

export const runtime = "nodejs";

export const GET = withAuth(async (_ctx, routeCtx) => {
  const { id } = await routeCtx!.params;
  const row = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
    .limit(1);

  if (!row[0]) return jsonError("İş bulunamadı", 404);
  return jsonOk({ task: row[0] });
});

export const PATCH = withAuth(async ({ request, user }, routeCtx) => {
  const { id } = await routeCtx!.params;
  const body = await request.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Geçersiz veri", 400);
  }

  const existing = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
    .limit(1);

  if (!existing[0]) return jsonError("İş bulunamadı", 404);

  const nextStatus = parsed.data.status ?? existing[0].status;
  if (
    requiresOverdueReason(
      existing[0].deadline,
      existing[0].status,
      nextStatus,
    ) &&
    !isValidOverdueReason(parsed.data.overdueReason)
  ) {
    return jsonError("Gecikmiş tamamlama için gerekçe zorunlu (min 10 karakter)", 400);
  }

  const updates: Partial<typeof tasks.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (parsed.data.caseId !== undefined) updates.caseId = parsed.data.caseId;
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.taskType !== undefined) updates.taskType = parsed.data.taskType;
  if (parsed.data.assignedTo !== undefined) {
    const assigneeChanged = parsed.data.assignedTo !== existing[0].assignedTo;
    updates.assignedTo = parsed.data.assignedTo;
    if (assigneeChanged) {
      updates.assignedAt = parsed.data.assignedTo ? new Date() : null;
    }
  }

  if (parsed.data.status !== undefined) {
    if (parsed.data.status === "COMPLETED") {
      let completedAt = new Date();
      if (parsed.data.completedAt) {
        try {
          completedAt = parseDeadline(parsed.data.completedAt);
        } catch {
          return jsonError("Geçersiz tamamlanma tarihi", 400);
        }
      } else if (existing[0].completedAt) {
        completedAt = existing[0].completedAt;
      }
      updates.completedAt = completedAt;
    } else {
      updates.completedAt = null;
    }
  } else if (parsed.data.completedAt) {
    try {
      updates.completedAt = parseDeadline(parsed.data.completedAt);
    } catch {
      return jsonError("Geçersiz tamamlanma tarihi", 400);
    }
  }

  let deadline = existing[0].deadline;
  if (parsed.data.deadline) {
    try {
      const nextDeadline = parseDeadline(parsed.data.deadline);
      const changed = nextDeadline.getTime() !== existing[0].deadline.getTime();
      if (changed) {
        const reason = parsed.data.deadlineChangeReason?.trim() ?? "";
        if (reason.length < 10) {
          return jsonError("Son tarih değişikliği için gerekçe zorunlu (min 10 karakter)", 400);
        }
        await logActivity({
          caseId: existing[0].caseId,
          taskId: id,
          action: "TASK_DEADLINE_CHANGED",
          details: `${formatDateTime(existing[0].deadline)} → ${formatDateTime(nextDeadline)} — Gerekçe: ${reason}`,
          userId: user.id,
        });
      }
      deadline = nextDeadline;
      updates.deadline = deadline;
    } catch {
      return jsonError("Geçersiz son tarih", 400);
    }
  }

  if (parsed.data.archived !== undefined) {
    if (parsed.data.archived) {
      if (
        !canArchiveTask({
          status: existing[0].status,
          archivedAt: existing[0].archivedAt,
        })
      ) {
        return jsonError("Yalnızca tamamlanan veya iptal edilen işler arşivlenebilir", 400);
      }
      updates.archivedAt = new Date();
    } else {
      updates.archivedAt = null;
    }
  }

  let offsets: ReminderOffset[] | undefined;
  if (parsed.data.reminderOffsets) {
    updates.reminderOffsets = JSON.stringify(parsed.data.reminderOffsets);
    offsets = parsed.data.reminderOffsets;
  }

  await db.update(tasks).set(updates).where(eq(tasks.id, id));

  if (parsed.data.status === "COMPLETED") {
    await db
      .update(reminders)
      .set({ dismissedAt: new Date() })
      .where(eq(reminders.taskId, id));
  }

  if (parsed.data.deadline || parsed.data.reminderOffsets) {
    const currentOffsets =
      offsets ??
      (JSON.parse(existing[0].reminderOffsets) as ReminderOffset[]) ??
      defaultReminderOffsets;
    await syncTaskReminders(id, deadline, currentOffsets);
  }

  if (parsed.data.status && parsed.data.status !== existing[0].status) {
    if (parsed.data.status === "COMPLETED") {
      const completedAt = updates.completedAt ?? new Date();
      const reasonSuffix = parsed.data.overdueReason
        ? ` — Gecikme gerekçesi: ${parsed.data.overdueReason.trim()}`
        : "";
      await logActivity({
        caseId: existing[0].caseId,
        taskId: id,
        action: "TASK_COMPLETED",
        details: `${formatCompletionLabel(deadline, completedAt)} — Son tarih: ${formatDateTime(deadline)}, Tamamlanma: ${formatDateTime(completedAt)}${reasonSuffix}`,
        userId: user.id,
      });
    } else {
      await logActivity({
        caseId: existing[0].caseId,
        taskId: id,
        action: "TASK_STATUS_CHANGED",
        details: `${existing[0].status} -> ${parsed.data.status}`,
        userId: user.id,
      });
    }
  } else if (parsed.data.archived === undefined) {
    await logActivity({
      caseId: existing[0].caseId,
      taskId: id,
      action: "TASK_UPDATED",
      details: JSON.stringify(parsed.data),
      userId: user.id,
    });
  }

  const updated = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return jsonOk({ task: updated[0] });
});

export const DELETE = withAuth(
  async ({ user }, routeCtx) => {
    const { id } = await routeCtx!.params;

    const existing = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1);

    if (!existing[0]) return jsonError("İş bulunamadı", 404);

    await db
      .update(tasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, id));

    await logActivity({
      caseId: existing[0].caseId,
      taskId: id,
      action: "TASK_DELETED",
      details: "Soft delete",
      userId: user.id,
    });

    return jsonOk({ success: true });
  },
  ["ADMIN"],
);
