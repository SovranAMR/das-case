import { withAuth } from "@/lib/api/with-auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { canModifyRecord, getActiveCase } from "@/lib/api/case-helpers";
import { db } from "@/lib/db";
import { caseNotes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/services/activity";
import { restoreCaseNote } from "@/lib/services/restore";

export const runtime = "nodejs";

export const POST = withAuth(async ({ user }, routeCtx) => {
  const { id, noteId } = await routeCtx!.params;
  const caseData = await getActiveCase(id);
  if (!caseData) return jsonError("Dosya bulunamadı", 404);

  const existing = await db
    .select()
    .from(caseNotes)
    .where(eq(caseNotes.id, noteId))
    .limit(1);

  if (!existing[0]) return jsonError("Not bulunamadı", 404);
  if (existing[0].caseId !== id) return jsonError("Not bu dosyaya ait değil", 400);
  if (!canModifyRecord(user.id, user.role, existing[0].createdBy)) {
    return jsonError("Yetkiniz yok", 403);
  }

  const restored = await restoreCaseNote(noteId);
  if (!restored) return jsonError("Geri alınacak not bulunamadı", 404);

  await logActivity({
    caseId: id,
    action: "CASE_NOTE_RESTORED",
    details: "Not geri alındı",
    userId: user.id,
  });

  return jsonOk({ success: true });
});
