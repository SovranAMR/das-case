import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  canDeleteCase,
  canDeleteTask,
  canPerform,
  ROLE_NAV_PATHS,
  shouldDefaultToMyTasks,
} from "@/lib/auth/permissions";

describe("permissions", () => {
  it("admin can access settings", () => {
    expect(canAccessPath("ADMIN", "/ayarlar")).toBe(true);
    expect(ROLE_NAV_PATHS.ADMIN).toContain("/ayarlar");
  });

  it("lawyer and secretary cannot access settings", () => {
    expect(canAccessPath("LAWYER", "/ayarlar")).toBe(false);
    expect(canAccessPath("SECRETARY", "/ayarlar")).toBe(false);
  });

  it("lawyer can access case detail", () => {
    expect(canAccessPath("LAWYER", "/dosyalar/abc-123")).toBe(true);
  });

  it("defaults my tasks for lawyer and secretary", () => {
    expect(shouldDefaultToMyTasks("LAWYER")).toBe(true);
    expect(shouldDefaultToMyTasks("SECRETARY")).toBe(true);
    expect(shouldDefaultToMyTasks("ADMIN")).toBe(false);
  });

  it("only admin can delete cases", () => {
    expect(canDeleteCase("ADMIN")).toBe(true);
    expect(canDeleteCase("LAWYER")).toBe(false);
    expect(canDeleteCase("SECRETARY")).toBe(false);
  });

  it("only admin can delete tasks", () => {
    expect(canDeleteTask("ADMIN")).toBe(true);
    expect(canDeleteTask("LAWYER")).toBe(false);
  });

  it("staff can access profile but not admin settings", () => {
    expect(canAccessPath("LAWYER", "/profil")).toBe(true);
    expect(canPerform("LAWYER", "view_admin_settings")).toBe(false);
    expect(canPerform("ADMIN", "manage_users")).toBe(true);
  });
});
