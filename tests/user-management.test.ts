import { describe, expect, it } from "vitest";
import { createUserSchema, updateUserSchema } from "@/lib/api/validation";
import { generateSecurePassword } from "@/lib/utils/credentials";

describe("createUserSchema", () => {
  it("accepts valid user payload", () => {
    const result = createUserSchema.safeParse({
      email: "avukat@buro.local",
      name: "Mehmet Demir",
      password: "Guvenli123!",
      role: "LAWYER",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short password", () => {
    const result = createUserSchema.safeParse({
      email: "avukat@buro.local",
      name: "Mehmet Demir",
      password: "123",
      role: "LAWYER",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateUserSchema", () => {
  it("accepts partial updates", () => {
    const result = updateUserSchema.safeParse({ role: "SECRETARY" });
    expect(result.success).toBe(true);
  });

  it("rejects empty update payload", () => {
    const result = updateUserSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("generateSecurePassword", () => {
  it("creates password with requested length", () => {
    const password = generateSecurePassword(14);
    expect(password).toHaveLength(14);
  });

  it("creates different passwords on each call", () => {
    const a = generateSecurePassword();
    const b = generateSecurePassword();
    expect(a).not.toBe(b);
  });
});
