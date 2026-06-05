import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { caseNotes } from "@/lib/db/schema";
import { jsonError, jsonOk } from "@/lib/api/response";
import { canModifyRecord, getActiveCase } from "@/lib/api/case-helpers";
import { updateCaseNoteSchema } from "@/lib/api/case-validation";
import { withAuth } from "@/lib/api/with-auth";
import { logActivity } from "@/lib/services/activity";

export const runtime = "nodejs";

export const PATCH = withAuth(async ({ request, user }, routeCtx) => {
  const { id, noteId } = await routeCtx!.params;
  const caseData = await getActiveCase(id);
  if (!caseData) return jsonError("Dosya bulunamadı", 404);

  const existing = await db
    .select()
    .from(caseNotes)
    .where(
      and(eq(caseNotes.id, noteId), eq(caseNotes.caseId, id), isNull(caseNotes.deletedAt)),
    )
    .limit(1);

  if (!existing[0]) return jsonError("Not bulunamadı", 404);
  if (!canModifyRecord(user.id, user.role, existing[0].createdBy)) {
    return jsonError("Yetkiniz yok", 403);
  }

  const body = await request.json();
  const parsed = updateCaseNoteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Geçersiz veri", 400);
  }

  await db
    .update(caseNotes)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(caseNotes.id, noteId));

  await logActivity({
    caseId: id,
    action: "CASE_NOTE_UPDATED",
    details: parsed.data.content?.slice(0, 200) ?? "Not güncellendi",
    userId: user.id,
  });

  const updated = await db.select().from(caseNotes).where(eq(caseNotes.id, noteId)).limit(1);
  return jsonOk({ note: updated[0] });
});

export const DELETE = withAuth(async ({ user }, routeCtx) => {
  const { id, noteId } = await routeCtx!.params;
  const caseData = await getActiveCase(id);
  if (!caseData) return jsonError("Dosya bulunamadı", 404);

  const existing = await db
    .select()
    .from(caseNotes)
    .where(
      and(eq(caseNotes.id, noteId), eq(caseNotes.caseId, id), isNull(caseNotes.deletedAt)),
    )
    .limit(1);

  if (!existing[0]) return jsonError("Not bulunamadı", 404);
  if (!canModifyRecord(user.id, user.role, existing[0].createdBy)) {
    return jsonError("Yetkiniz yok", 403);
  }

  await db
    .update(caseNotes)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(caseNotes.id, noteId));

  await logActivity({
    caseId: id,
    action: "CASE_NOTE_DELETED",
    details: "Not silindi",
    userId: user.id,
  });

  return jsonOk({ success: true });
});
