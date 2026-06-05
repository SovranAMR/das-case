"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { PriorityBadge, UrgencyBadge } from "@/components/ui/badge";
import { ListError } from "@/components/ui/list-error";
import { PRIORITY_LABELS, STATUS_LABELS, type TaskPriority, type TaskStatus } from "@/lib/types";
import { formatDateTime } from "@/lib/utils/dates";
import { urgencyRowClass } from "@/lib/utils/urgency-styles";

type TodayPayload = {
  summary: {
    todayTaskCount: number;
    todayHearingCount: number;
    myOpenCount: number;
    overdueCount: number;
  };
  overdueTasks: Array<{
    id: string;
    title: string;
    deadline: string;
    status: TaskStatus;
    priority: TaskPriority;
    urgency: string;
  }>;
  todayTasks: Array<{
    id: string;
    title: string;
    deadline: string;
    status: TaskStatus;
    priority: TaskPriority;
    urgency: string;
  }>;
  todayHearings: Array<{
    id: string;
    fileNumber: string;
    courtName: string;
    clientName: string;
    nextHearingAt: string;
  }>;
  myOpenTasks: Array<{
    id: string;
    title: string;
    deadline: string;
    status: TaskStatus;
    priority: TaskPriority;
    urgency: string;
  }>;
};

const urgencyLabels: Record<string, string> = {
  overdue: "Gecikmiş",
  today: "Bugün",
  soon: "Yaklaşan",
  normal: "Normal",
};

export default function TodayPage() {
  const [data, setData] = useState<TodayPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/today");
    if (!res.ok) {
      setError("Bugün verisi yüklenemedi");
      setLoading(false);
      return;
    }
    setData((await res.json()) as TodayPayload);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <p className="text-muted">Yükleniyor...</p>;
  if (error) return <ListError message={error} onRetry={() => void load()} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        label="Günlük"
        title="Bugün"
        description={`${data.summary.overdueCount} gecikmiş · ${data.summary.todayHearingCount} duruşma · ${data.summary.todayTaskCount} bugün biten · ${data.summary.myOpenCount} açık işim`}
      />

      {data.overdueTasks.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <SectionTitle className="mb-3 text-red-800">Gecikmiş işler</SectionTitle>
          <div className="space-y-2">
            {data.overdueTasks.map((t) => (
              <Link
                key={t.id}
                href={`/isler?highlight=${t.id}`}
                className={urgencyRowClass(
                  "overdue",
                  "block transition-colors hover:opacity-95",
                )}
              >
                <p className="font-semibold text-red-900">{t.title}</p>
                <p className="text-sm text-red-800">{formatDateTime(new Date(t.deadline))}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <UrgencyBadge urgency="overdue" label="Gecikmiş" />
                  <PriorityBadge priority={t.priority} label={PRIORITY_LABELS[t.priority]} />
                  <span className="text-xs text-red-800">{STATUS_LABELS[t.status]}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle className="mb-3">Bugünkü duruşmalar</SectionTitle>
        {data.todayHearings.length === 0 ? (
          <p className="text-sm text-muted">Bugün duruşma yok.</p>
        ) : (
          <div className="space-y-2">
            {data.todayHearings.map((h) => (
              <Link
                key={h.id}
                href={`/dosyalar/${h.id}`}
                className="block rounded-lg border border-orange-300 border-l-4 border-l-orange-600 bg-orange-50 p-3 ring-1 ring-inset ring-orange-200 transition-colors hover:opacity-95"
              >
                <p className="font-semibold text-orange-900">{h.fileNumber}</p>
                <p className="text-sm text-orange-800">{h.courtName}</p>
                <p className="text-sm text-orange-900">{h.clientName}</p>
                <p className="mt-1 text-sm font-medium text-orange-700">
                  {formatDateTime(new Date(h.nextHearingAt))}
                </p>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle className="mb-3">Bugün biten işler</SectionTitle>
        {data.todayTasks.length === 0 ? (
          <p className="text-sm text-muted">Bugün son tarihi olan iş yok.</p>
        ) : (
          <div className="space-y-2">
            {data.todayTasks.map((t) => (
              <Link
                key={t.id}
                href={`/isler?highlight=${t.id}`}
                className={urgencyRowClass(
                  "today",
                  "block transition-colors hover:opacity-95",
                )}
              >
                <p className="font-semibold">{t.title}</p>
                <p className="text-sm text-orange-800">{formatDateTime(new Date(t.deadline))}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <UrgencyBadge
                    urgency={t.urgency as "overdue" | "today" | "soon" | "normal" | "completed"}
                    label={urgencyLabels[t.urgency] ?? t.urgency}
                  />
                  <PriorityBadge priority={t.priority} label={PRIORITY_LABELS[t.priority]} />
                  <span className="text-xs text-muted">{STATUS_LABELS[t.status]}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle className="mb-3">Benim açık işlerim</SectionTitle>
        {data.myOpenTasks.length === 0 ? (
          <p className="text-sm text-muted">Açık işin yok.</p>
        ) : (
          <div className="space-y-2">
            {data.myOpenTasks.map((t) => (
              <Link
                key={t.id}
                href={`/isler?highlight=${t.id}`}
                className={urgencyRowClass(
                  t.urgency as "overdue" | "today" | "soon" | "normal" | "completed",
                  "block transition-colors hover:opacity-95",
                )}
              >
                <p className="font-medium">{t.title}</p>
                <p className="text-sm text-muted">{formatDateTime(new Date(t.deadline))}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <UrgencyBadge
                    urgency={t.urgency as "overdue" | "today" | "soon" | "normal" | "completed"}
                    label={urgencyLabels[t.urgency] ?? t.urgency}
                  />
                  <span className="text-xs text-muted">{STATUS_LABELS[t.status]}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
