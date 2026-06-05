import { describe, expect, it } from "vitest";
import { validateBureauEmail } from "@/lib/auth/email-policy";

describe("validateBureauEmail", () => {
  it("buro.local kabul eder", () => {
    expect(validateBureauEmail("ali@buro.local").valid).toBe(true);
  });

  it("disposable reddeder", () => {
    expect(validateBureauEmail("test@mailinator.com").valid).toBe(false);
  });

  it("farklı domain için ipucu verir", () => {
    const result = validateBureauEmail("ali@example.com");
    expect(result.valid).toBe(true);
    expect(result.hint).toContain("buro.local");
  });
});
