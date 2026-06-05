import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { caseEvents } from "@/lib/db/schema";
import { parseDeadline } from "@/lib/api/parse";
import { jsonError, jsonOk } from "@/lib/api/response";
import { canModifyRecord, getActiveCase } from "@/lib/api/case-helpers";
import { updateCaseEventSchema } from "@/lib/api/case-validation";
import { withAuth } from "@/lib/api/with-auth";
import { logActivity } from "@/lib/services/activity";
import { applyEventSideEffects } from "@/lib/services/case-events";

export const runtime = "nodejs";

export const PATCH = withAuth(async ({ request, user }, routeCtx) => {
  const { id, eventId } = await routeCtx!.params;
  const caseData = await getActiveCase(id);
  if (!caseData) return jsonError("Dosya bulunamadı", 404);

  const existing = await db
    .select()
    .from(caseEvents)
    .where(
      and(eq(caseEvents.id, eventId), eq(caseEvents.caseId, id), isNull(caseEvents.deletedAt)),
    )
    .limit(1);

  if (!existing[0]) return jsonError("Olay bulunamadı", 404);
  if (!canModifyRecord(user.id, user.role, existing[0].createdBy)) {
    return jsonError("Yetkiniz yok", 403);
  }

  const body = await request.json();
  const parsed = updateCaseEventSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Geçersiz veri", 400);
  }

  const updates: Partial<typeof caseEvents.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.eventType !== undefined) updates.eventType = parsed.data.eventType;
  if (parsed.data.occurredAt) {
    try {
      updates.occurredAt = parseDeadline(parsed.data.occurredAt);
    } catch {
      return jsonError("Geçersiz olay tarihi", 400);
    }
  }
  if (parsed.data.metadata !== undefined) {
    updates.metadata = JSON.stringify(parsed.data.metadata);
  }

  await db.update(caseEvents).set(updates).where(eq(caseEvents.id, eventId));

  if (parsed.data.metadata || parsed.data.eventType) {
    const metadata = parsed.data.metadata ??
      (existing[0].metadata ? (JSON.parse(existing[0].metadata) as Record<string, unknown>) : {});
    await applyEventSideEffects(id, parsed.data.eventType ?? existing[0].eventType, metadata);
  }

  await logActivity({
    caseId: id,
    action: "CASE_EVENT_UPDATED",
    details: existing[0].title,
    userId: user.id,
  });

  const updated = await db.select().from(caseEvents).where(eq(caseEvents.id, eventId)).limit(1);
  return jsonOk({ event: updated[0] });
});

export const DELETE = withAuth(async ({ user }, routeCtx) => {
  const { id, eventId } = await routeCtx!.params;
  const caseData = await getActiveCase(id);
  if (!caseData) return jsonError("Dosya bulunamadı", 404);

  const existing = await db
    .select()
    .from(caseEvents)
    .where(
      and(eq(caseEvents.id, eventId), eq(caseEvents.caseId, id), isNull(caseEvents.deletedAt)),
    )
    .limit(1);

  if (!existing[0]) return jsonError("Olay bulunamadı", 404);
  if (!canModifyRecord(user.id, user.role, existing[0].createdBy)) {
    return jsonError("Yetkiniz yok", 403);
  }

  await db
    .update(caseEvents)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(caseEvents.id, eventId));

  await logActivity({
    caseId: id,
    action: "CASE_EVENT_DELETED",
    details: existing[0].title,
    userId: user.id,
  });

  return jsonOk({ success: true });
});
