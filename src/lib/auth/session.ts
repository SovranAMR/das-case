import { cookies } from "next/headers";
import { eq, lt } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import type { UserRole } from "@/lib/types";

export const SESSION_COOKIE = "is_takibi_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  mustChangePassword: boolean;
};

function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}

function useSecureCookies(): boolean {
  if (process.env.SECURE_COOKIES === "true") return true;
  if (process.env.SECURE_COOKIES === "false") return false;
  return process.env.NODE_ENV === "production";
}

export async function createSession(userId: string): Promise<string> {
  await db.delete(sessions).where(eq(sessions.userId, userId));

  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: useSecureCookies(),
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });

  return sessionId;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    cookieStore.delete(SESSION_COOKIE);
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const now = new Date();
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      mustChangePassword: users.mustChangePassword,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const row = result[0];
  if (!row || row.expiresAt <= now) {
    if (sessionId) {
      await db.delete(sessions).where(eq(sessions.id, sessionId));
      cookieStore.delete(SESSION_COOKIE);
    }
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    mustChangePassword: row.mustChangePassword,
  };
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function cleanupExpiredSessions(): Promise<void> {
  const now = new Date();
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}
