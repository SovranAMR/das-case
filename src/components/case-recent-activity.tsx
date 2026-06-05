"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils/dates";
import { getActivityLabel } from "@/lib/utils/activity-labels";

type ActivityRow = {
  id: string;
  action: string;
  details: string | null;
  userName: string;
  createdAt: string;
};

export function CaseRecentActivity({ caseId }: { caseId: string }) {
  const [rows, setRows] = useState<ActivityRow[]>([]);

  useEffect(() => {
    void fetch(`/api/activities?caseId=${caseId}&limit=5`)
      .then((r) => (r.ok ? r.json() : { activities: [] }))
      .then((data: { activities: ActivityRow[] }) => setRows(data.activities ?? []));
  }, [caseId]);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold">Son işlemler</h3>
      <ul className="mt-2 space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="text-xs text-muted">
            <span className="font-medium text-text-primary">{getActivityLabel(row.action)}</span>
            {" — "}
            {row.userName}
            {" · "}
            {formatDateTime(new Date(row.createdAt))}
            {row.details && (
              <p className="mt-0.5 text-text-secondary line-clamp-2">{row.details}</p>
            )}
          </li>
        ))}
      </ul>
      <Link href="/ayarlar" className="mt-2 inline-block text-xs text-primary hover:underline">
        Tüm aktivite geçmişi →
      </Link>
    </div>
  );
}
