import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { jsonError, jsonOk } from "@/lib/api/response";
import { createUserSchema } from "@/lib/api/validation";
import { withAuth } from "@/lib/api/with-auth";
import { logActivity } from "@/lib/services/activity";

export const runtime = "nodejs";

export const GET = withAuth(
  async () => {
    const rows = await db
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
      .from(users);

    return jsonOk({ users: rows });
  },
  ["ADMIN"],
);

export const POST = withAuth(
  async ({ request, user }) => {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Geçersiz veri", 400);
    }

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, parsed.data.email.toLowerCase()))
      .limit(1);

    if (existing[0]) {
      return jsonError("Bu e-posta zaten kayıtlı", 409);
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const id = randomUUID();

    await db.insert(users).values({
      id,
      email: parsed.data.email.toLowerCase(),
      name: parsed.data.name,
      passwordHash,
      role: parsed.data.role,
      mustChangePassword: true,
    });

    await logActivity({
      action: "USER_CREATED",
      details: JSON.stringify({
        targetUserId: id,
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.name,
        role: parsed.data.role,
      }),
      userId: user.id,
    });

    return jsonOk(
      {
        user: {
          id,
          email: parsed.data.email.toLowerCase(),
          name: parsed.data.name,
          role: parsed.data.role,
        },
      },
      { status: 201 },
    );
  },
  ["ADMIN"],
);
