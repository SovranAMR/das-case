import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";
import { buildWeeklyReport } from "@/lib/services/weekly-report";

export const runtime = "nodejs";

export const GET = withAuth(
  async () => jsonOk({ report: await buildWeeklyReport() }),
  ["ADMIN"],
);
