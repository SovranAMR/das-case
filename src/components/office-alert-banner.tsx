"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const THRESHOLD = 3;

export function OfficeAlertBanner() {
  const [overdue, setOverdue] = useState(0);
  const [legalDeadline, setLegalDeadline] = useState(0);

  useEffect(() => {
    void fetch("/api/dashboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { stats?: { overdue: number; legalDeadline: number } } | null) => {
        if (data?.stats) {
          setOverdue(data.stats.overdue);
          setLegalDeadline(data.stats.legalDeadline);
        }
      });
  }, []);

  const critical = overdue >= THRESHOLD || legalDeadline > 0;
  if (!critical) return null;

  return (
    <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900 md:px-6">
      <span className="font-medium">Büro uyarısı:</span>{" "}
      {overdue >= THRESHOLD && (
        <span>
          {overdue} gecikmiş iş
        </span>
      )}
      {overdue >= THRESHOLD && legalDeadline > 0 && " · "}
      {legalDeadline > 0 && <span>{legalDeadline} açık kanuni süre</span>}
      {" — "}
      <Link href="/isler?urgency=overdue" className="font-medium underline">
        Gecikmiş işleri gör
      </Link>
    </div>
  );
}
