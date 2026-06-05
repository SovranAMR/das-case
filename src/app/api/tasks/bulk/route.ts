import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { jsonError, jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";
import { logActivity } from "@/lib/services/activity";
import { canArchiveTask } from "@/lib/utils/task-list-view";

export const runtime = "nodejs";

const bulkSchema = z.object({
  action: z.enum(["archive", "unarchive"]),
  taskIds: z.array(z.string().uuid()).min(1).max(100),
});

export const POST = withAuth(async ({ request, user }) => {
  const body = await request.json();
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Geçersiz veri", 400);
  }

  const { action, taskIds } = parsed.data;
  const rows = await db
    .select()
    .from(tasks)
    .where(and(inArray(tasks.id, taskIds), isNull(tasks.deletedAt)));

  if (rows.length === 0) {
    return jsonError("İş bulunamadı", 404);
  }

  const now = new Date();
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (action === "archive") {
      if (!canArchiveTask({ status: row.status, archivedAt: row.archivedAt })) {
        skipped += 1;
        continue;
      }
      await db
        .update(tasks)
        .set({ archivedAt: now, updatedAt: now })
        .where(eq(tasks.id, row.id));
      await logActivity({
        caseId: row.caseId,
        taskId: row.id,
        action: "TASK_ARCHIVED",
        details: row.title,
        userId: user.id,
      });
      updated += 1;
      continue;
    }

    if (!row.archivedAt) {
      skipped += 1;
      continue;
    }
    await db
      .update(tasks)
      .set({ archivedAt: null, updatedAt: now })
      .where(eq(tasks.id, row.id));
    await logActivity({
      caseId: row.caseId,
      taskId: row.id,
      action: "TASK_UNARCHIVED",
      details: row.title,
      userId: user.id,
    });
    updated += 1;
  }

  return jsonOk({ updated, skipped, total: taskIds.length });
});
