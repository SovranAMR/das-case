import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { jsonError, jsonOk } from "@/lib/api/response";
import { updateUserSchema } from "@/lib/api/validation";
import { withAuth } from "@/lib/api/with-auth";
import { isLastAdmin, wouldRemoveLastAdmin } from "@/lib/services/users";
import { logActivity } from "@/lib/services/activity";

export const runtime = "nodejs";

export const PATCH = withAuth(
  async ({ request, user }, routeCtx) => {
    const { id } = await routeCtx!.params;
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Geçersiz veri", 400);
    }

    const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing[0]) return jsonError("Kullanıcı bulunamadı", 404);

    if (parsed.data.role && (await wouldRemoveLastAdmin(id, parsed.data.role))) {
      return jsonError("Son yönetici hesabının rolü değiştirilemez", 400);
    }

    if (parsed.data.email) {
      const email = parsed.data.email.toLowerCase();
      const duplicate = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (duplicate[0] && duplicate[0].id !== id) {
        return jsonError("Bu giriş e-postası zaten kayıtlı", 409);
      }
    }

    const updates: Partial<typeof users.$inferInsert> = {};
    if (parsed.data.name) updates.name = parsed.data.name;
    if (parsed.data.email) updates.email = parsed.data.email.toLowerCase();
    if (parsed.data.role) updates.role = parsed.data.role;
    if (parsed.data.password) {
      updates.passwordHash = await hashPassword(parsed.data.password);
      updates.mustChangePassword = false;
    }
    if (parsed.data.active !== undefined) updates.active = parsed.data.active;
    if (parsed.data.mustChangePassword !== undefined) {
      updates.mustChangePassword = parsed.data.mustChangePassword;
    }

    await db.update(users).set(updates).where(eq(users.id, id));

    await logActivity({
      action: "USER_UPDATED",
      details: JSON.stringify({
        targetUserId: id,
        changes: Object.keys(updates),
      }),
      userId: user.id,
    });

    const updated = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        active: users.active,
        lastLoginAt: users.lastLoginAt,
        mustChangePassword: users.mustChangePassword,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return jsonOk({ user: updated[0] });
  },
  ["ADMIN"],
);

export const DELETE = withAuth(
  async ({ user }, routeCtx) => {
    const { id } = await routeCtx!.params;

    if (user.id === id) {
      return jsonError("Kendi hesabınızı silemezsiniz", 400);
    }

    const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing[0]) return jsonError("Kullanıcı bulunamadı", 404);

    if (await isLastAdmin(id)) {
      return jsonError("Son yönetici hesabı silinemez", 400);
    }

    await db.delete(users).where(eq(users.id, id));

    await logActivity({
      action: "USER_DELETED",
      details: JSON.stringify({
        targetUserId: id,
        email: existing[0].email,
        name: existing[0].name,
      }),
      userId: user.id,
    });

    return jsonOk({ success: true });
  },
  ["ADMIN"],
);
