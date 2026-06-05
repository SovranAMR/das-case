import { and, eq, isNull, like, ne, or } from "drizzle-orm";
import { activeWorkTaskFilter } from "@/lib/api/task-filters";
import { db } from "@/lib/db";
import { cases, tasks } from "@/lib/db/schema";
import { jsonError, jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";
import { toLikePattern } from "@/lib/search/escape-like";

export const runtime = "nodejs";

const MAX_RESULTS = 8;

export const GET = withAuth(async ({ request }) => {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return jsonError("En az 2 karakter girin", 400);
  }

  const pattern = toLikePattern(q);

  const caseRows = await db
    .select({
      id: cases.id,
      fileNumber: cases.fileNumber,
      courtName: cases.courtName,
      clientName: cases.clientName,
      title: cases.title,
      nextHearingAt: cases.nextHearingAt,
    })
    .from(cases)
    .where(
      and(
        isNull(cases.deletedAt),
        ne(cases.status, "ARCHIVED"),
        or(
          like(cases.fileNumber, pattern),
          like(cases.clientName, pattern),
          like(cases.title, pattern),
          like(cases.courtName, pattern),
        ),
      ),
    )
    .limit(MAX_RESULTS);

  const taskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      deadline: tasks.deadline,
      status: tasks.status,
      caseFileNumber: cases.fileNumber,
      caseCourtName: cases.courtName,
    })
    .from(tasks)
    .leftJoin(cases, and(eq(tasks.caseId, cases.id), isNull(cases.deletedAt)))
    .where(
      and(
        activeWorkTaskFilter(),
        or(
          like(tasks.title, pattern),
          like(tasks.description, pattern),
          like(cases.fileNumber, pattern),
          like(cases.clientName, pattern),
        ),
      ),
    )
    .limit(MAX_RESULTS);

  return jsonOk({
    query: q,
    cases: caseRows,
    tasks: taskRows,
  });
});
