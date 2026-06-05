import { withAuth } from "@/lib/api/with-auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { canModifyRecord, getActiveCase } from "@/lib/api/case-helpers";
import { db } from "@/lib/db";
import { caseEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/services/activity";
import { restoreCaseEvent } from "@/lib/services/restore";

export const runtime = "nodejs";

export const POST = withAuth(async ({ user }, routeCtx) => {
  const { id, eventId } = await routeCtx!.params;
  const caseData = await getActiveCase(id);
  if (!caseData) return jsonError("Dosya bulunamadı", 404);

  const existing = await db
    .select()
    .from(caseEvents)
    .where(eq(caseEvents.id, eventId))
    .limit(1);

  if (!existing[0]) return jsonError("Olay bulunamadı", 404);
  if (existing[0].caseId !== id) return jsonError("Olay bu dosyaya ait değil", 400);
  if (!canModifyRecord(user.id, user.role, existing[0].createdBy)) {
    return jsonError("Yetkiniz yok", 403);
  }

  const restored = await restoreCaseEvent(eventId);
  if (!restored) return jsonError("Geri alınacak olay bulunamadı", 404);

  await logActivity({
    caseId: id,
    action: "CASE_EVENT_RESTORED",
    details: existing[0].title,
    userId: user.id,
  });

  return jsonOk({ success: true });
});
