import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { jsonError, jsonOk } from "@/lib/api/response";
import { changePasswordSchema } from "@/lib/api/validation";
import { withAuth } from "@/lib/api/with-auth";

export const runtime = "nodejs";

export const POST = withAuth(async ({ request, user }) => {
  const body = await request.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Geçersiz veri", 400);
  }

  const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const record = rows[0];
  if (!record) return jsonError("Kullanıcı bulunamadı", 404);

  const valid = await verifyPassword(parsed.data.currentPassword, record.passwordHash);
  if (!valid) {
    return jsonError("Mevcut şifre hatalı", 401);
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db
    .update(users)
    .set({ passwordHash, mustChangePassword: false })
    .where(eq(users.id, user.id));

  return jsonOk({ success: true });
});
