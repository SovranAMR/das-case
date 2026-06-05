import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import {
  checkLoginRateLimit,
  clearLoginAttempts,
  recordLoginFailure,
} from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/api/response";
import { loginSchema } from "@/lib/api/validation";
import { logApiRequest, getClientIp } from "@/lib/middleware/forensic-log";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rate = await checkLoginRateLimit(ip);
  if (!rate.allowed) {
    return jsonError("Çok fazla deneme. Lütfen bekleyin.", 429);
  }

  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Geçersiz giriş", 400);
  }

  void logApiRequest(request, null, JSON.stringify({ email: parsed.data.email }));

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()))
    .limit(1);

  const user = rows[0];
  if (!user) {
    await recordLoginFailure(ip);
    return jsonError("E-posta veya şifre hatalı", 401);
  }

  if (!user.active) {
    return jsonError("Hesap pasif — yöneticinle iletişime geç", 403);
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    await recordLoginFailure(ip);
    return jsonError("E-posta veya şifre hatalı", 401);
  }

  await clearLoginAttempts(ip);
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));
  await createSession(user.id);

  return jsonOk({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  });
}
