import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reminders, tasks } from "@/lib/db/schema";
import { jsonError, jsonForbidden, jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";
import { canUserReceiveReminder } from "@/lib/reminders/scope";
import { dismissEscalation, parseEscalationNotificationId } from "@/lib/services/escalation";

export const runtime = "nodejs";

export const PATCH = withAuth(async ({ user }, routeCtx) => {
  const { id } = await routeCtx!.params;

  const escalationTaskId = parseEscalationNotificationId(id);
  if (escalationTaskId) {
    if (user.role !== "ADMIN") return jsonForbidden();
    const dismissed = await dismissEscalation(escalationTaskId, user.id);
    if (!dismissed) return jsonError("Bildirim bulunamadı", 404);
    return jsonOk({ success: true });
  }

  const existing = await db
    .select({
      reminder: reminders,
      task: tasks,
    })
    .from(reminders)
    .innerJoin(tasks, eq(reminders.taskId, tasks.id))
    .where(eq(reminders.id, id))
    .limit(1);

  const row = existing[0];
  if (!row) return jsonError("Bildirim bulunamadı", 404);

  if (
    !canUserReceiveReminder(user.id, user.role, {
      assignedTo: row.task.assignedTo,
      createdBy: row.task.createdBy,
    })
  ) {
    return jsonForbidden();
  }

  await db
    .update(reminders)
    .set({ dismissedAt: new Date() })
    .where(eq(reminders.id, id));

  return jsonOk({ success: true });
});
