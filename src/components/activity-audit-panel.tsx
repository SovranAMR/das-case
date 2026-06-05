"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { formatDateTime } from "@/lib/utils/dates";
import { getActivityLabel } from "@/lib/utils/activity-labels";

type ActivityRow = {
  id: string;
  action: string;
  details: string | null;
  userName: string;
  caseId: string | null;
  taskId: string | null;
  createdAt: string;
};

const ACTION_FILTER_OPTIONS = [
  { value: "", label: "Tüm işlemler" },
  { value: "CASE_CREATED", label: "Dosya oluşturma" },
  { value: "CASE_UPDATED", label: "Dosya güncelleme" },
  { value: "TASK_CREATED", label: "İş oluşturma" },
  { value: "TASK_UPDATED", label: "İş güncelleme" },
  { value: "TASK_COMPLETED", label: "İş tamamlama" },
  { value: "TASK_ARCHIVED", label: "İş arşivleme" },
  { value: "TASK_UNARCHIVED", label: "Arşivden çıkarma" },
  { value: "NOTE_ADDED", label: "Not ekleme" },
  { value: "EVENT_ADDED", label: "Süreç olayı" },
  { value: "STAGE_CHANGED", label: "Aşama değişimi" },
];

export function ActivityAuditPanel() {
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ limit: "100" });
      if (action) params.set("action", action);
      const res = await fetch(`/api/activities?${params.toString()}`);
      if (!res.ok) {
        setError("Aktivite geçmişi yüklenemedi");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { activities: ActivityRow[] };
      setActivities(data.activities);
      setLoading(false);
    }
    void load();
  }, [action]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <SectionTitle>Aktivite Geçmişi</SectionTitle>
          <p className="text-sm text-muted">Kim, ne zaman, ne yaptı</p>
        </div>
        <Select value={action} onChange={(e) => setAction(e.target.value)} className="w-48">
          {ACTION_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Yükleniyor...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted">Kayıt yok.</p>
      ) : (
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {activities.map((row) => (
            <div key={row.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{getActivityLabel(row.action)}</span>
                <span className="text-xs text-muted">{formatDateTime(new Date(row.createdAt))}</span>
              </div>
              <p className="mt-1 text-muted">{row.userName}</p>
              {row.details && <p className="mt-1 text-text-secondary">{row.details}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {row.caseId && (
                  <Link
                    href={`/dosyalar/${row.caseId}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Dosyaya git
                  </Link>
                )}
                {row.taskId && (
                  <Link
                    href={`/isler?highlight=${row.taskId}`}
                    className="text-xs text-primary hover:underline"
                  >
                    İşe git
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
