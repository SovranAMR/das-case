import { describe, expect, it } from "vitest";
import { parseBulkUsersCsv } from "@/lib/api/bulk-users";

describe("parseBulkUsersCsv", () => {
  it("geçerli satırları parse eder", () => {
    const { rows, errors } = parseBulkUsersCsv(
      "Ayşe Yılmaz,ayse@buro.local,LAWYER\nMehmet,mehmet@buro.local,SECRETARY",
    );
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.role).toBe("LAWYER");
  });

  it("tırnaklı virgüllü ismi parse eder", () => {
    const { rows, errors } = parseBulkUsersCsv(
      '"Yılmaz, Ayşe",ayse@buro.local,LAWYER',
    );
    expect(errors).toHaveLength(0);
    expect(rows[0]?.name).toBe("Yılmaz, Ayşe");
  });

  it("tekrarlayan e-postayı reddeder", () => {
    const { rows, errors } = parseBulkUsersCsv(
      "Ayşe,ayse@buro.local,LAWYER\nMehmet,ayse@buro.local,SECRETARY",
    );
    expect(rows).toHaveLength(1);
    expect(errors.length).toBe(1);
  });

  it("eksik sütun hata verir", () => {
    const { rows, errors } = parseBulkUsersCsv("Sadece isim");
    expect(rows).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});
