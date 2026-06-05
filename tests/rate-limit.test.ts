import { describe, expect, it } from "vitest";
import {
  evaluateLoginRateLimit,
  LOGIN_WINDOW_MS,
  MAX_LOGIN_ATTEMPTS,
  nextFailureState,
} from "@/lib/auth/rate-limit";

describe("evaluateLoginRateLimit", () => {
  const now = 1_700_000_000_000;

  it("yeni pencerede izin verir", () => {
    const result = evaluateLoginRateLimit(null, now);
    expect(result.allowed).toBe(true);
    expect(result.next.resetAt).toBe(now + LOGIN_WINDOW_MS);
  });

  it("limit aşıldığında engeller", () => {
    const result = evaluateLoginRateLimit(
      { count: MAX_LOGIN_ATTEMPTS, resetAt: now + 30_000 },
      now,
    );
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBe(30_000);
  });

  it("süresi dolmuş kaydı sıfırlar", () => {
    const result = evaluateLoginRateLimit(
      { count: MAX_LOGIN_ATTEMPTS, resetAt: now - 1 },
      now,
    );
    expect(result.allowed).toBe(true);
    expect(result.next.count).toBe(0);
  });
});

describe("nextFailureState", () => {
  const now = 1_700_000_000_000;

  it("ilk hatada sayacı 1 yapar", () => {
    expect(nextFailureState(null, now)).toEqual({
      count: 1,
      resetAt: now + LOGIN_WINDOW_MS,
    });
  });

  it("aynı pencerede sayacı artırır", () => {
    expect(
      nextFailureState({ count: 2, resetAt: now + LOGIN_WINDOW_MS }, now),
    ).toEqual({
      count: 3,
      resetAt: now + LOGIN_WINDOW_MS,
    });
  });
});
