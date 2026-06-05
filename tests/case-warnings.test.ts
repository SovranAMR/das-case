import { describe, expect, it } from "vitest";
import { getActiveCaseWarnings } from "@/lib/utils/case-warnings";

describe("getActiveCaseWarnings", () => {
  it("aktif dosyada eksik alanları listeler", () => {
    const warnings = getActiveCaseWarnings({
      status: "ACTIVE",
      nextHearingAt: null,
      currentStage: "",
    });
    expect(warnings).toContain("Sonraki duruşma tarihi girilmemiş");
    expect(warnings).toContain("Dosya süreci (aşama) belirtilmemiş");
  });

  it("kapalı dosyada uyarı vermez", () => {
    expect(
      getActiveCaseWarnings({
        status: "CLOSED",
        nextHearingAt: null,
        currentStage: "",
      }),
    ).toEqual([]);
  });

  it("tam dolu aktif dosyada uyarı vermez", () => {
    expect(
      getActiveCaseWarnings({
        status: "ACTIVE",
        nextHearingAt: "2026-06-10T10:00:00.000Z",
        currentStage: "hearing",
      }),
    ).toEqual([]);
  });
});
