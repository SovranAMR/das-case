"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils/dates";
import type { WeeklyReport } from "@/lib/services/weekly-report";

export function WeeklyReportCard() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/reports/weekly")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { report: WeeklyReport } | null) => {
        if (data) setReport(data.report);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-muted">Haftalık özet yükleniyor...</p>
      </Card>
    );
  }

  if (!report) return null;

  return (
    <Card id="weekly-report-print">
      <SectionTitle className="mb-1">Haftalık büro özeti</SectionTitle>
      <p className="mb-4 text-sm text-muted">
        {formatDate(new Date(report.weekStart))} —{" "}
        {formatDate(new Date(report.weekEndLabel ?? report.weekEnd))}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Açık gecikmiş iş" value={report.overdueOpen} />
        <Stat label="Bu hafta tamamlanan" value={report.completedThisWeek} />
        <Stat label="Yeni dosya" value={report.newCasesThisWeek} />
        <Stat label="Bu haftaki duruşma" value={report.hearingsThisWeek} />
        <Stat label="Son tarih değişikliği" value={report.deadlineChangesThisWeek} />
      </div>
      <button
        type="button"
        className="mt-4 text-sm text-primary hover:underline print:hidden"
        onClick={() => window.print()}
      >
        Yazdır
      </button>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
