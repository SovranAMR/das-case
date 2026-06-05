import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export const runtime = "nodejs";

export const GET = withAuth(
  async () => {
    const row = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "last_backup_at"))
      .limit(1);

    return jsonOk({ lastBackupAt: row[0]?.value ?? null });
  },
  ["ADMIN"],
);
