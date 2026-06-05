import { describe, expect, it } from "vitest";
import { canDeleteCase, canDeleteTask } from "@/lib/auth/permissions";

describe("soft-delete restore permissions (delete ile aynı rol)", () => {
  it("iş silme/geri alma yalnızca ADMIN", () => {
    expect(canDeleteTask("ADMIN")).toBe(true);
    expect(canDeleteTask("LAWYER")).toBe(false);
    expect(canDeleteTask("SECRETARY")).toBe(false);
  });

  it("dosya silme/geri alma yalnızca ADMIN", () => {
    expect(canDeleteCase("ADMIN")).toBe(true);
    expect(canDeleteCase("LAWYER")).toBe(false);
    expect(canDeleteCase("SECRETARY")).toBe(false);
  });
});
