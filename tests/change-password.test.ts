import { describe, expect, it } from "vitest";
import { changePasswordSchema } from "@/lib/api/validation";

describe("changePasswordSchema", () => {
  it("accepts valid password change", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "EskiSifre1!",
      newPassword: "YeniSifre2!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects same password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "AyniSifre1!",
      newPassword: "AyniSifre1!",
    });
    expect(result.success).toBe(false);
  });
});
