import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";
import { getAllTemplates } from "@/lib/case-templates";

export const runtime = "nodejs";

export const GET = withAuth(async () => jsonOk({ templates: getAllTemplates() }));
