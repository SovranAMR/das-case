import { describe, expect, it } from "vitest";
import { sanitizeRequestBody } from "@/lib/middleware/sanitize-body";

describe("sanitizeRequestBody", () => {
  it("password alanını redakte eder", () => {
    const raw = JSON.stringify({
      email: "avukat@buro.local",
      name: "Mehmet Demir",
      password: "Guvenli123!",
      role: "LAWYER",
    });
    const result = sanitizeRequestBody(raw);
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!) as Record<string, string>;
    expect(parsed.email).toBe("avukat@buro.local");
    expect(parsed.password).toBe("[REDACTED]");
  });

  it("iç içe password alanını redakte eder", () => {
    const raw = JSON.stringify({ user: { password: "secret" }, token: "abc" });
    const parsed = JSON.parse(sanitizeRequestBody(raw)!) as {
      user: { password: string };
      token: string;
    };
    expect(parsed.user.password).toBe("[REDACTED]");
    expect(parsed.token).toBe("abc");
  });

  it("geçersiz JSON gövdesini kısaltarak döner", () => {
    const raw = "not-json-body";
    expect(sanitizeRequestBody(raw)).toBe("not-json-body");
  });

  it("csv alanını redakte eder", () => {
    const raw = JSON.stringify({
      csv: "Ayşe,ayse@buro.local,LAWYER",
    });
    const parsed = JSON.parse(sanitizeRequestBody(raw)!) as { csv: string };
    expect(parsed.csv).toBe("[REDACTED]");
  });

  it("undefined için null döner", () => {
    expect(sanitizeRequestBody(undefined)).toBeNull();
  });
});
