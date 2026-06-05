import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { loginAttempts } from "@/lib/db/schema";

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 60_000;

export type RateLimitState = {
  count: number;
  resetAt: number;
};

export function evaluateLoginRateLimit(
  record: RateLimitState | null,
  now: number,
): { allowed: boolean; retryAfterMs: number; next: RateLimitState } {
  if (!record || record.resetAt <= now) {
    return {
      allowed: true,
      retryAfterMs: 0,
      next: { count: 0, resetAt: now + LOGIN_WINDOW_MS },
    };
  }

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterMs: record.resetAt - now,
      next: record,
    };
  }

  return { allowed: true, retryAfterMs: 0, next: record };
}

export function nextFailureState(
  record: RateLimitState | null,
  now: number,
): RateLimitState {
  if (!record || record.resetAt <= now) {
    return { count: 1, resetAt: now + LOGIN_WINDOW_MS };
  }
  return { count: record.count + 1, resetAt: record.resetAt };
}

async function readAttempt(key: string): Promise<RateLimitState | null> {
  const row = await db
    .select({
      count: loginAttempts.count,
      resetAt: loginAttempts.resetAt,
    })
    .from(loginAttempts)
    .where(eq(loginAttempts.key, key))
    .limit(1);

  const record = row[0];
  if (!record) return null;
  return { count: record.count, resetAt: record.resetAt.getTime() };
}

async function writeAttempt(key: string, state: RateLimitState): Promise<void> {
  const resetAt = new Date(state.resetAt);
  const updatedAt = new Date();
  await db
    .insert(loginAttempts)
    .values({
      key,
      count: state.count,
      resetAt,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: loginAttempts.key,
      set: {
        count: state.count,
        resetAt,
        updatedAt,
      },
    });
}

export async function checkLoginRateLimit(key: string): Promise<{
  allowed: boolean;
  retryAfterMs: number;
}> {
  const now = Date.now();
  const record = await readAttempt(key);
  const result = evaluateLoginRateLimit(record, now);
  if (!record || record.resetAt <= now) {
    await writeAttempt(key, result.next);
  }
  return { allowed: result.allowed, retryAfterMs: result.retryAfterMs };
}

export async function recordLoginFailure(key: string): Promise<void> {
  const now = Date.now();
  const record = await readAttempt(key);
  const next = nextFailureState(record, now);
  await writeAttempt(key, next);
}

export async function clearLoginAttempts(key: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.key, key));
}
