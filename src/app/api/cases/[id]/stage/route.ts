import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cases } from "@/lib/db/schema";
import { getStageLabel } from "@/lib/case-templates";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getActiveCase } from "@/lib/api/case-helpers";
import {
  updateStageSchema,
  validateStageForCaseType,
} from "@/lib/api/case-validation";
import { withAuth } from "@/lib/api/with-auth";
import { logActivity } from "@/lib/services/activity";
import type { CaseType } from "@/lib/types";

export const runtime = "nodejs";

export const PATCH = withAuth(async ({ request, user }, routeCtx) => {
  const { id } = await routeCtx!.params;
  const caseData = await getActiveCase(id);
  if (!caseData) return jsonError("Dosya bulunamadı", 404);

  const body = await request.json();
  const parsed = updateStageSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Geçersiz veri", 400);
  }

  if (!validateStageForCaseType(caseData.caseType as CaseType, parsed.data.stage)) {
    return jsonError("Geçersiz aşama", 400);
  }

  const oldLabel = getStageLabel(caseData.caseType as CaseType, caseData.currentStage);
  const newLabel = getStageLabel(caseData.caseType as CaseType, parsed.data.stage);

  await db
    .update(cases)
    .set({ currentStage: parsed.data.stage, updatedAt: new Date() })
    .where(eq(cases.id, id));

  await logActivity({
    caseId: id,
    action: "STAGE_CHANGED",
    details: `${oldLabel} → ${newLabel}`,
    userId: user.id,
  });

  const updated = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
  return jsonOk({ case: updated[0] });
});
