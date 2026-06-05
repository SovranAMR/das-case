import { describe, expect, it } from "vitest";
import {
  isValidOverdueReason,
  requiresOverdueReason,
} from "@/lib/utils/overdue-completion";

describe("requiresOverdueReason", () => {
  it("gecikmiş iş tamamlanırken gerekçe ister", () => {
    const deadline = new Date("2026-01-01T12:00:00.000Z");
    expect(requiresOverdueReason(deadline, "PENDING", "COMPLETED")).toBe(true);
  });

  it("zamanında tamamlamada gerekçe istemez", () => {
    const deadline = new Date("2099-01-01T12:00:00.000Z");
    expect(requiresOverdueReason(deadline, "PENDING", "COMPLETED")).toBe(false);
  });
});

describe("isValidOverdueReason", () => {
  it("10+ karakter kabul eder", () => {
    expect(isValidOverdueReason("Müvekkil evrak gecikti")).toBe(true);
  });

  it("kısa metni reddeder", () => {
    expect(isValidOverdueReason("kısa")).toBe(false);
  });
});
