import { describe, expect, it } from "vitest";
import { parseCsvLine } from "@/lib/utils/parse-csv-line";

describe("parseCsvLine", () => {
  it("basit virgülle ayrılmış alanları parse eder", () => {
    expect(parseCsvLine("Ayşe,ayse@buro.local,LAWYER")).toEqual([
      "Ayşe",
      "ayse@buro.local",
      "LAWYER",
    ]);
  });

  it("tırnaklı isimde virgülü korur", () => {
    expect(parseCsvLine('"Yılmaz, Ayşe",ayse@buro.local,LAWYER')).toEqual([
      "Yılmaz, Ayşe",
      "ayse@buro.local",
      "LAWYER",
    ]);
  });

  it("çift tırnak escape eder", () => {
    expect(parseCsvLine('"Ayşe ""Avukat""",ayse@buro.local,SECRETARY')).toEqual([
      'Ayşe "Avukat"',
      "ayse@buro.local",
      "SECRETARY",
    ]);
  });
});
