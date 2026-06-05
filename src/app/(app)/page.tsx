import Link from "next/link";
import { and, eq, isNotNull, isNull, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { cases, tasks } from "@/lib/db/schema";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PriorityBadge, UrgencyBadge } from "@/components/ui/badge";
import { getSessionUser } from "@/lib/auth/session";
import { shouldDefaultToMyTasks } from "@/lib/auth/permissions";
import { formatDateTime, getDeadlineUrgency } from "@/lib/utils/dates";
import {
  getHearingUrgency,
  HEARING_URGENCY_LABELS,
  isUpcomingHearing,
} from "@/lib/utils/hearings";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/types";
import { urgencyRowClass } from "@/lib/utils/urgency-styles";

const urgencyLabels = {
  overdue: "Gecikmiş",
  today: "Bugün",
  soon: "Yaklaşan",
  normal: "Normal",
  completed: "Tamamlandı",
} as const;

const hearingBadgeStyles = {
  today: "bg-orange-100 text-orange-800",
  soon: "bg-yellow-100 text-yellow-800",
  upcoming: "bg-blue-100 text-blue-800",
  past: "border border-border bg-bg-elevated text-text-secondary",
} as const;

export default async function DashboardPage() {
  const user = await getSessionUser();
  const now = new Date();
  const allTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        isNull(tasks.deletedAt),
        isNull(tasks.archivedAt),
        notInArray(tasks.status, ["COMPLETED", "CANCELLED"]),
      ),
    );

  const myTasks = user
    ? allTasks.filter((t) => t.assignedTo === user.id && t.status !== "COMPLETED" && t.status !== "CANCELLED")
    : [];

  let overdue = 0;
  let today = 0;
  let thisWeek = 0;
  let legalDeadline = 0;

  const urgent = allTasks
    .map((t) => ({ ...t, urgency: getDeadlineUrgency(t.deadline, t.status, now) }))
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

  const displayUrgent =
    user && shouldDefaultToMyTasks(user.role)
      ? urgent.filter((t) => t.assignedTo === user.id)
      : urgent;

  for (const task of allTasks) {
    const urgency = getDeadlineUrgency(task.deadline, task.status, now);
    if (urgency === "overdue") overdue += 1;
    if (urgency === "today") today += 1;
    if (task.priority === "LEGAL_DEADLINE" && task.status !== "COMPLETED") legalDeadline += 1;
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    if (task.deadline <= weekEnd && task.status !== "COMPLETED" && task.status !== "CANCELLED") {
      thisWeek += 1;
    }
  }

  const hearingRows = await db
    .select()
    .from(cases)
    .where(and(isNull(cases.deletedAt), isNotNull(cases.nextHearingAt), eq(cases.status, "ACTIVE")));

  const upcomingHearings = hearingRows
    .filter((c) => c.nextHearingAt && isUpcomingHearing(c.nextHearingAt, now, 14))
    .map((c) => ({
      ...c,
      urgency: getHearingUrgency(c.nextHearingAt!, now),
    }))
    .sort((a, b) => a.nextHearingAt!.getTime() - b.nextHearingAt!.getTime());

  return (
    <div className="space-y-6">
      <PageHeader
        label="Dashboard"
        title="Özet"
        description={user ? `Merhaba ${user.name}` : "Büro işlerinin genel görünümü"}
      />

      {user && shouldDefaultToMyTasks(user.role) && (
        <Card>
          <p className="text-sm text-muted">Bana atanan açık iş</p>
          <p className="text-3xl font-bold text-primary">{myTasks.length}</p>
          <Link href="/isler?view=mine" className="mt-2 inline-block text-sm text-primary hover:underline">
            Benim işlerim →
          </Link>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/isler?urgency=overdue&view=mine" className="block transition hover:opacity-90">
          <Card className="h-full cursor-pointer hover:border-red-200">
            <p className="text-sm text-muted">Gecikmiş</p>
            <p className="text-3xl font-bold text-red-600">{overdue}</p>
          </Card>
        </Link>
        <Link href="/isler?urgency=today&view=mine" className="block transition hover:opacity-90">
          <Card className="h-full cursor-pointer hover:border-orange-200">
            <p className="text-sm text-muted">Bugün</p>
            <p className="text-3xl font-bold text-orange-600">{today}</p>
          </Card>
        </Link>
        <Link href="/isler?view=mine" className="block transition hover:opacity-90">
          <Card className="h-full cursor-pointer hover:border-blue-200">
            <p className="text-sm text-muted">Bu Hafta</p>
            <p className="text-3xl font-bold text-blue-600">{thisWeek}</p>
          </Card>
        </Link>
        <Link href="/isler?priority=LEGAL_DEADLINE&view=mine" className="block transition hover:opacity-90">
          <Card className="h-full cursor-pointer hover:border-purple-200">
            <p className="text-sm text-muted">Kanuni Süre</p>
            <p className="text-3xl font-bold text-purple-600">{legalDeadline}</p>
          </Card>
        </Link>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl leading-tight">Yaklaşan Duruşmalar</h2>
          <Link href="/dosyalar" className="text-sm text-primary hover:underline">
            Dosyalar
          </Link>
        </div>
        {upcomingHearings.length === 0 ? (
          <p className="text-sm text-muted">14 gün içinde duruşma yok.</p>
        ) : (
          <div className="space-y-3">
            {upcomingHearings.slice(0, 8).map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div>
                  <Link href={`/dosyalar/${c.id}`} className="font-medium hover:underline">
                    {c.fileNumber} — {c.clientName}
                  </Link>
                  <p className="text-sm text-muted">{c.courtName}</p>
                  <p className="text-sm">{formatDateTime(c.nextHearingAt!)}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${hearingBadgeStyles[c.urgency]}`}
                >
                  {HEARING_URGENCY_LABELS[c.urgency]}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl leading-tight">
            {user && shouldDefaultToMyTasks(user.role) ? "Benim Acil İşlerim" : "Acil İşler"}
          </h2>
          <Link href="/isler" className="text-sm text-primary hover:underline">
            Tümünü gör
          </Link>
        </div>
        {displayUrgent.length === 0 ? (
          <p className="text-sm text-muted">Bekleyen acil iş yok.</p>
        ) : (
          <div className="space-y-3">
            {displayUrgent.slice(0, 10).map((task) => (
              <div
                key={task.id}
                className={urgencyRowClass(
                  task.urgency,
                  "flex flex-wrap items-center justify-between gap-2 transition-colors hover:opacity-95",
                )}
              >
                <div>
                  <Link href={`/isler?highlight=${task.id}`} className="font-medium hover:underline">
                    {task.title}
                  </Link>
                  <p className="text-sm text-muted">{formatDateTime(task.deadline)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <UrgencyBadge urgency={task.urgency} label={urgencyLabels[task.urgency]} />
                  <PriorityBadge priority={task.priority} label={PRIORITY_LABELS[task.priority]} />
                  <span className="rounded border border-border px-2 py-1 font-mono text-[10px] text-text-secondary">
                    {STATUS_LABELS[task.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
