import { withAuth } from "@/lib/api/with-auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { logActivity } from "@/lib/services/activity";
import { restoreCase } from "@/lib/services/restore";

export const runtime = "nodejs";

export const POST = withAuth(
  async ({ user }, routeCtx) => {
    const { id } = await routeCtx!.params;
    const restored = await restoreCase(id);
    if (!restored) return jsonError("Geri alınacak dosya bulunamadı", 404);

    await logActivity({
      caseId: id,
      action: "CASE_RESTORED",
      details: "Soft delete geri alındı",
      userId: user.id,
    });

    return jsonOk({ success: true });
  },
  ["ADMIN"],
);
