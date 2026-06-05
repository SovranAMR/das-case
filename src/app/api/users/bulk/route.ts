import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { parseBulkUsersCsv } from "@/lib/api/bulk-users";
import { jsonError, jsonOk } from "@/lib/api/response";
import { withAuth } from "@/lib/api/with-auth";
import { logActivity } from "@/lib/services/activity";
import { generateSecurePassword } from "@/lib/utils/credentials";
import { validateBureauEmail } from "@/lib/auth/email-policy";

export const runtime = "nodejs";

export const POST = withAuth(
  async ({ request, user }) => {
    const body = (await request.json()) as { csv?: string };
    if (!body.csv?.trim()) return jsonError("CSV içeriği gerekli", 400);

    const { rows, errors } = parseBulkUsersCsv(body.csv);
    if (errors.length > 0) {
      return jsonError(errors.join("; "), 400);
    }
    if (rows.length === 0) return jsonError("İçe aktarılacak satır yok", 400);
    if (rows.length > 50) return jsonError("Tek seferde en fazla 50 kullanıcı", 400);

    const created: Array<{ name: string; email: string; password: string; role: string }> = [];
    const skipped: string[] = [];

    for (const row of rows) {
      const emailCheck = validateBureauEmail(row.email);
      if (!emailCheck.valid) {
        skipped.push(`${row.email}: ${emailCheck.message ?? "Geçersiz e-posta"}`);
        continue;
      }

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, row.email.toLowerCase()))
        .limit(1);

      if (existing[0]) {
        skipped.push(`${row.email}: zaten kayıtlı`);
        continue;
      }

      const password = generateSecurePassword(12);
      const id = randomUUID();

      try {
        await db.insert(users).values({
          id,
          email: row.email.toLowerCase(),
          name: row.name,
          passwordHash: await hashPassword(password),
          role: row.role,
          mustChangePassword: true,
        });
      } catch {
        skipped.push(`${row.email}: kayıt hatası`);
        continue;
      }

      created.push({
        name: row.name,
        email: row.email.toLowerCase(),
        password,
        role: row.role,
      });
    }

    if (created.length > 0) {
      await logActivity({
        action: "USER_BULK_IMPORTED",
        details: JSON.stringify({ count: created.length, skipped: skipped.length }),
        userId: user.id,
      });
    }

    return jsonOk({ created, skipped });
  },
  ["ADMIN"],
);
