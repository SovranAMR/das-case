import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";

export const runtime = "nodejs";

export const GET = withAuth(async () => {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(eq(users.active, true))
    .orderBy(users.name);

  return jsonOk({ users: rows });
});
