import { randomUUID } from "crypto";
import { and, eq, isNull, like, ne, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { cases } from "@/lib/db/schema";
import { parseDeadline } from "@/lib/api/parse";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  buildCaseOrderBy,
  CASE_SORT_FIELDS,
  parseSortParam,
} from "@/lib/api/sort";
import { createCaseExtendedSchema } from "@/lib/api/case-validation";
import { withAuth } from "@/lib/api/with-auth";
import { logActivity } from "@/lib/services/activity";
import { toLikePattern } from "@/lib/search/escape-like";

export const runtime = "nodejs";

export const GET = withAuth(async ({ request }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");
  const excludeArchived = url.searchParams.get("excludeArchived") === "true";
  const limitParam = parseInt(url.searchParams.get("limit") ?? "200", 10);
  const offsetParam = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const limit = Math.min(Math.max(limitParam, 1), 500);
  const offset = Math.max(offsetParam, 0);
  const { field, order } = parseSortParam(
    url.searchParams.get("sort"),
    url.searchParams.get("order"),
    CASE_SORT_FIELDS,
    "updatedAt",
    "desc",
  );

  const rows = await db
    .select()
    .from(cases)
    .where(
      and(
        isNull(cases.deletedAt),
        status
          ? eq(cases.status, status as "ACTIVE" | "CLOSED" | "ARCHIVED")
          : excludeArchived
            ? ne(cases.status, "ARCHIVED")
            : undefined,
        q
          ? (() => {
              const pattern = toLikePattern(q);
              return or(
                like(cases.courtName, pattern),
                like(cases.fileNumber, pattern),
                like(cases.clientName, pattern),
                like(cases.title, pattern),
              );
            })()
          : undefined,
      ),
    )
    .orderBy(buildCaseOrderBy(field, order))
    .limit(limit)
    .offset(offset);

  return jsonOk({ cases: rows });
});

export const POST = withAuth(async ({ request, user }) => {
  const body = await request.json();
  const parsed = createCaseExtendedSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Geçersiz veri", 400);
  }

  const id = randomUUID();
  const now = new Date();
  let openedAt = now;
  if (parsed.data.openedAt) {
    try {
      openedAt = parseDeadline(parsed.data.openedAt);
    } catch {
      return jsonError("Geçersiz açılış tarihi", 400);
    }
  }

  await db.insert(cases).values({
    id,
    courtName: parsed.data.courtName,
    fileNumber: parsed.data.fileNumber,
    clientName: parsed.data.clientName,
    title: parsed.data.title,
    caseType: parsed.data.caseType,
    currentStage: "OPENED",
    opposingParty: parsed.data.opposingParty ?? null,
    judgeName: parsed.data.judgeName ?? null,
    summary: parsed.data.summary ?? null,
    openedAt,
    status: parsed.data.status ?? "ACTIVE",
    createdAt: now,
    updatedAt: now,
  });

  await logActivity({
    caseId: id,
    action: "CASE_CREATED",
    details: `${parsed.data.courtName} - ${parsed.data.fileNumber}`,
    userId: user.id,
  });

  const created = await db
    .select()
    .from(cases)
    .where(and(eq(cases.id, id), isNull(cases.deletedAt)))
    .limit(1);

  return jsonOk({ case: created[0] }, { status: 201 });
});
