import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { cases } from "@/lib/db/schema";
import { getStageLabel } from "@/lib/case-templates";
import { parseDeadline } from "@/lib/api/parse";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  updateCaseExtendedSchema,
  validateStageForCaseType,
} from "@/lib/api/case-validation";
import { withAuth } from "@/lib/api/with-auth";
import { logActivity } from "@/lib/services/activity";
import type { CaseType } from "@/lib/types";

export const runtime = "nodejs";

export const GET = withAuth(async (_ctx, routeCtx) => {
  const { id } = await routeCtx!.params;
  const row = await db
    .select()
    .from(cases)
    .where(and(eq(cases.id, id), isNull(cases.deletedAt)))
    .limit(1);

  if (!row[0]) return jsonError("Dosya bulunamadı", 404);
  return jsonOk({ case: row[0] });
});

export const PATCH = withAuth(async ({ request, user }, routeCtx) => {
  const { id } = await routeCtx!.params;
  const body = await request.json();
  const parsed = updateCaseExtendedSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Geçersiz veri", 400);
  }

  const existing = await db
    .select()
    .from(cases)
    .where(and(eq(cases.id, id), isNull(cases.deletedAt)))
    .limit(1);

  if (!existing[0]) return jsonError("Dosya bulunamadı", 404);

  const updates: Partial<typeof cases.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (parsed.data.courtName !== undefined) updates.courtName = parsed.data.courtName;
  if (parsed.data.fileNumber !== undefined) updates.fileNumber = parsed.data.fileNumber;
  if (parsed.data.clientName !== undefined) updates.clientName = parsed.data.clientName;
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.caseType !== undefined) updates.caseType = parsed.data.caseType;
  if (parsed.data.opposingParty !== undefined) updates.opposingParty = parsed.data.opposingParty;
  if (parsed.data.judgeName !== undefined) updates.judgeName = parsed.data.judgeName;
  if (parsed.data.summary !== undefined) updates.summary = parsed.data.summary;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  if (parsed.data.openedAt) {
    try {
      updates.openedAt = parseDeadline(parsed.data.openedAt);
    } catch {
      return jsonError("Geçersiz açılış tarihi", 400);
    }
  }

  if (parsed.data.nextHearingAt) {
    try {
      updates.nextHearingAt = parseDeadline(parsed.data.nextHearingAt);
    } catch {
      return jsonError("Geçersiz duruşma tarihi", 400);
    }
  } else if (parsed.data.nextHearingAt === null) {
    updates.nextHearingAt = null;
  }

  if (parsed.data.currentStage) {
    const caseType = (parsed.data.caseType ?? existing[0].caseType) as CaseType;
    if (!validateStageForCaseType(caseType, parsed.data.currentStage)) {
      return jsonError("Geçersiz aşama", 400);
    }
    if (parsed.data.currentStage !== existing[0].currentStage) {
      const oldLabel = getStageLabel(caseType, existing[0].currentStage);
      const newLabel = getStageLabel(caseType, parsed.data.currentStage);
      await logActivity({
        caseId: id,
        action: "STAGE_CHANGED",
        details: `${oldLabel} → ${newLabel}`,
        userId: user.id,
      });
    }
    updates.currentStage = parsed.data.currentStage;
  }

  await db.update(cases).set(updates).where(eq(cases.id, id));

  await logActivity({
    caseId: id,
    action: "CASE_UPDATED",
    details: JSON.stringify(parsed.data),
    userId: user.id,
  });

  const updated = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
  return jsonOk({ case: updated[0] });
});

export const DELETE = withAuth(
  async ({ user }, routeCtx) => {
    const { id } = await routeCtx!.params;

    const existing = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, id), isNull(cases.deletedAt)))
      .limit(1);

    if (!existing[0]) return jsonError("Dosya bulunamadı", 404);

    await db
      .update(cases)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(cases.id, id));

    await logActivity({
      caseId: id,
      action: "CASE_DELETED",
      details: "Soft delete",
      userId: user.id,
    });

    return jsonOk({ success: true });
  },
  ["ADMIN"],
);
