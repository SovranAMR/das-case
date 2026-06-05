import type { TimelineSource } from "@/lib/types";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getActiveCase } from "@/lib/api/case-helpers";
import { withAuth } from "@/lib/api/with-auth";
import { buildCaseTimeline } from "@/lib/services/timeline";

export const runtime = "nodejs";

export const GET = withAuth(async ({ request }, routeCtx) => {
  const { id } = await routeCtx!.params;
  const caseData = await getActiveCase(id);
  if (!caseData) return jsonError("Dosya bulunamadı", 404);

  const url = new URL(request.url);
  const source = url.searchParams.get("source") as TimelineSource | null;
  const eventType = url.searchParams.get("eventType") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;

  const timeline = await buildCaseTimeline(id, {
    source: source ?? undefined,
    eventType,
    category,
  });

  return jsonOk({ timeline });
});
