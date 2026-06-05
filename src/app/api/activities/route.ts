import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLogs, users } from "@/lib/db/schema";
import { jsonError, jsonForbidden, jsonOk } from "@/lib/api/response";
import { addNoteSchema } from "@/lib/api/validation";
import { withAuth } from "@/lib/api/with-auth";
import { logActivity } from "@/lib/services/activity";

export const runtime = "nodejs";

export const GET = withAuth(async ({ request, user }) => {
  const url = new URL(request.url);
  const caseId = url.searchParams.get("caseId");
  const taskId = url.searchParams.get("taskId");
  const action = url.searchParams.get("action");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 200);

  if (!caseId && !taskId && user.role !== "ADMIN") {
    return jsonForbidden();
  }

  const rows = await db
    .select({
      log: activityLogs,
      userName: users.name,
    })
    .from(activityLogs)
    .innerJoin(users, eq(activityLogs.userId, users.id))
    .where(
      and(
        caseId ? eq(activityLogs.caseId, caseId) : undefined,
        taskId ? eq(activityLogs.taskId, taskId) : undefined,
        action ? eq(activityLogs.action, action) : undefined,
      ),
    )
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);

  return jsonOk({
    activities: rows.map((row) => ({
      ...row.log,
      userName: row.userName,
    })),
  });
});

export const POST = withAuth(async ({ request, user }) => {
  const body = await request.json();
  const parsed = addNoteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Geçersiz not", 400);
  }

  if (!parsed.data.caseId && !parsed.data.taskId) {
    return jsonError("Not için dosya veya iş seçilmeli", 400);
  }

  await logActivity({
    caseId: parsed.data.caseId ?? null,
    taskId: parsed.data.taskId ?? null,
    action: "NOTE_ADDED",
    details: parsed.data.note,
    userId: user.id,
  });

  return jsonOk({ success: true }, { status: 201 });
});
