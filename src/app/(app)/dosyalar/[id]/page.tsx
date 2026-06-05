"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { CaseForm } from "@/components/case-form";
import { CaseEventForm } from "@/components/case-event-form";
import { CaseEventEditForm } from "@/components/case-event-edit-form";
import { CaseRecentActivity } from "@/components/case-recent-activity";
import { CaseNotesPanel, type CaseNote } from "@/components/case-notes-panel";
import { CaseTimeline } from "@/components/case-timeline";
import { StageProgressBar } from "@/components/stage-progress-bar";
import { TaskForm } from "@/components/task-form";
import { TaskCompletionInfo } from "@/components/task-completion-info";
import { TASK_SORT_OPTIONS, splitSortValue } from "@/lib/api/sort";
import type { CaseTemplate } from "@/lib/case-templates/types";
import type { TimelineItem } from "@/lib/services/timeline";
import {
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type CaseType,
} from "@/lib/types";
import { formatDateTime, getDeadlineUrgency } from "@/lib/utils/dates";
import { PriorityBadge, UrgencyBadge } from "@/components/ui/badge";
import { getUrgencyRowClassName } from "@/lib/utils/urgency-styles";
import { cn } from "@/lib/utils/cn";
import { getStageLabel } from "@/lib/case-templates";
import { getActiveCaseWarnings } from "@/lib/utils/case-warnings";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useSoftDeleteUndo } from "@/hooks/use-soft-delete-undo";

type CaseDetail = {
  id: string;
  courtName: string;
  fileNumber: string;
  clientName: string;
  title: string;
  caseType: CaseType;
  currentStage: string;
  opposingParty: string | null;
  judgeName: string | null;
  nextHearingAt: string | null;
  summary: string | null;
  openedAt: string | null;
  status: "ACTIVE" | "CLOSED" | "ARCHIVED";
};

type TaskRow = {
  id: string;
  title: string;
  deadline: string;
  status: keyof typeof STATUS_LABELS;
  priority: keyof typeof PRIORITY_LABELS;
  completedAt: string | null;
};

type TabKey = "process" | "notes" | "tasks" | "info";

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { deleteWithUndo } = useSoftDeleteUndo();
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [template, setTemplate] = useState<CaseTemplate | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<TabKey>("process");
  const [timelineFilter, setTimelineFilter] = useState("");
  const [taskSort, setTaskSort] = useState("deadline:asc");
  const [eventOpen, setEventOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<TimelineItem | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);

  const eventIcons = useMemo(() => {
    if (!template) return {};
    return Object.fromEntries(template.eventTypes.map((e) => [e.code, e.icon]));
  }, [template]);

  const load = useCallback(async () => {
    const { sort, order } = splitSortValue(taskSort);
    const taskParams = new URLSearchParams({ caseId: id, sort, order });
    const filterParam = timelineFilter
      ? timelineFilter === "note"
        ? "note"
        : timelineFilter === "system"
          ? "system"
          : undefined
      : undefined;

    const timelineUrl = new URLSearchParams();
    if (filterParam) timelineUrl.set("source", filterParam);
    if (
      timelineFilter &&
      !["note", "system", ""].includes(timelineFilter)
    ) {
      timelineUrl.set("category", timelineFilter);
    }

    const [caseRes, tasksRes, timelineRes, notesRes, meRes, templatesRes] =
      await Promise.all([
        fetch(`/api/cases/${id}`),
        fetch(`/api/tasks?${taskParams.toString()}`),
        fetch(`/api/cases/${id}/timeline?${timelineUrl.toString()}`),
        fetch(`/api/cases/${id}/notes`),
        fetch("/api/auth/me"),
        fetch("/api/case-templates"),
      ]);

    if (!caseRes.ok) {
      router.push("/dosyalar");
      return;
    }

    const caseJson = (await caseRes.json()) as { case: CaseDetail };
    const tasksJson = (await tasksRes.json()) as { tasks: TaskRow[] };
    const timelineJson = (await timelineRes.json()) as { timeline: TimelineItem[] };
    const notesJson = (await notesRes.json()) as { notes: CaseNote[] };
    const meJson = (await meRes.json()) as { user: { id: string; role: string } };
    const templatesJson = (await templatesRes.json()) as { templates: CaseTemplate[] };

    setCaseData(caseJson.case);
    setTasks(tasksJson.tasks);
    setTimeline(timelineJson.timeline);
    setNotes(notesJson.notes);
    setCurrentUserId(meJson.user.id);
    setIsAdmin(meJson.user.role === "ADMIN");
    setTemplate(
      templatesJson.templates.find((t) => t.caseType === caseJson.case.caseType) ?? null,
    );
  }, [id, router, taskSort, timelineFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!caseData || !template) return <p className="text-muted">Yükleniyor...</p>;

  const pendingTasks = tasks.filter(
    (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED",
  ).length;
  const caseWarnings = getActiveCaseWarnings(caseData);

  return (
    <div className="space-y-6">
      <Link href="/dosyalar" className="inline-flex items-center text-sm text-primary hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Dosyalara dön
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="das-page-title">{caseData.fileNumber}</h1>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                {CASE_TYPE_LABELS[caseData.caseType]}
              </span>
              <span className="rounded border border-border px-2 py-1 font-mono text-[10px] text-text-secondary">
                {getStageLabel(caseData.caseType, caseData.currentStage)}
              </span>
            </div>
            <p className="text-muted">{caseData.courtName}</p>
            <p>{caseData.title}</p>
            <p className="text-sm">Müvekkil: {caseData.clientName}</p>
            {caseData.opposingParty && (
              <p className="text-sm">Karşı taraf: {caseData.opposingParty}</p>
            )}
            {caseData.judgeName && <p className="text-sm">Hakim: {caseData.judgeName}</p>}
          </div>
          <div className="grid gap-2 text-sm sm:text-right">
            {caseData.nextHearingAt && (
              <p className="flex items-center gap-1 text-orange-700 sm:justify-end">
                <Calendar className="h-4 w-4" />
                Sonraki duruşma: {formatDateTime(new Date(caseData.nextHearingAt))}
              </p>
            )}
            <p className="text-muted">Bekleyen iş: {pendingTasks}</p>
            <p className="text-muted">{CASE_STATUS_LABELS[caseData.status]}</p>
          </div>
        </div>

        <div className="mt-4">
          <StageProgressBar
            template={template}
            currentStage={caseData.currentStage}
            onStageChange={async (stage) => {
              const res = await fetch(`/api/cases/${id}/stage`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stage }),
              });
              if (!res.ok) {
                showToast("Aşama güncellenemedi", "error");
                return;
              }
              showToast("Dosya aşaması güncellendi");
              await load();
            }}
          />
        </div>
      </Card>

      <CaseRecentActivity caseId={id} />

      {caseWarnings.length > 0 && (
        <div className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          <p className="font-medium">Eksik dosya bilgisi</p>
          <ul className="mt-1 list-inside list-disc">
            {caseWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs">
            Bilgi sekmesinden güncelleyebilirsin.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {(
          [
            ["process", "Süreç"],
            ["notes", "Notlar"],
            ["tasks", "İşler"],
            ["info", "Bilgi"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-all duration-300 ${
              tab === key
                ? "bg-text-primary text-bg"
                : "border border-border bg-bg-surface text-text-secondary hover:border-text-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "process" && (
        <Card id="case-timeline-print">
          <div className="mb-4 flex items-center justify-between gap-2 print:hidden">
            <SectionTitle>Süreç Geçmişi</SectionTitle>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Yazdır
              </Button>
              <Button onClick={() => setEventOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Olay Ekle
              </Button>
            </div>
          </div>
          <SectionTitle className="mb-4 hidden print:block">Süreç Geçmişi</SectionTitle>
          <CaseTimeline
            items={timeline}
            eventIcons={eventIcons}
            filter={timelineFilter}
            onFilterChange={setTimelineFilter}
            onEditEvent={(eventId) => {
              const item = timeline.find(
                (t) => t.referenceId === eventId && t.source === "event",
              );
              if (item) setEditEvent(item);
            }}
            onDeleteEvent={async (eventId) => {
              const ok = await confirm({
                title: "Olayı sil",
                message: "Bu olayı silmek istediğine emin misin? 5 saniye içinde geri alabilirsin.",
                confirmLabel: "Sil",
                variant: "danger",
              });
              if (!ok) return;
              const deleted = await deleteWithUndo({
                deleteUrl: `/api/cases/${id}/events/${eventId}`,
                restoreUrl: `/api/cases/${id}/events/${eventId}/restore`,
                message: "Olay silindi",
                restoredMessage: "Olay geri alındı",
                onReload: load,
              });
              if (!deleted) showToast("Olay silinemedi", "error");
            }}
          />
        </Card>
      )}

      {tab === "notes" && (
        <Card>
          <SectionTitle className="mb-4">Notlar</SectionTitle>
          <CaseNotesPanel
            notes={notes}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onAdd={async (content) => {
              await fetch(`/api/cases/${id}/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
              });
              await load();
            }}
            onUpdate={async (noteId, data) => {
              await fetch(`/api/cases/${id}/notes/${noteId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              await load();
            }}
            onDelete={async (noteId) => {
              const deleted = await deleteWithUndo({
                deleteUrl: `/api/cases/${id}/notes/${noteId}`,
                restoreUrl: `/api/cases/${id}/notes/${noteId}/restore`,
                message: "Not silindi",
                restoredMessage: "Not geri alındı",
                onReload: load,
              });
              if (!deleted) showToast("Not silinemedi", "error");
            }}
          />
        </Card>
      )}

      {tab === "tasks" && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SectionTitle>Bağlı İşler</SectionTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={taskSort} onChange={(e) => setTaskSort(e.target.value)}>
                {TASK_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Button onClick={() => setTaskOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                İş Ekle
              </Button>
            </div>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted">Bu dosyaya bağlı iş yok.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const urgency = getDeadlineUrgency(new Date(task.deadline), task.status);
                return (
                <div
                  key={task.id}
                  className={cn(
                    "rounded-lg border border-border p-3",
                    getUrgencyRowClassName(urgency),
                  )}
                >
                  <p className="font-medium">{task.title}</p>
                  <p className="text-sm text-muted">{formatDateTime(new Date(task.deadline))}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {task.status !== "COMPLETED" && (
                      <UrgencyBadge
                        urgency={urgency}
                        label={
                          urgency === "overdue"
                            ? "Gecikmiş"
                            : urgency === "today"
                              ? "Bugün"
                              : urgency === "soon"
                                ? "Yaklaşan"
                                : "Normal"
                        }
                      />
                    )}
                    <PriorityBadge priority={task.priority} label={PRIORITY_LABELS[task.priority]} />
                    <span className="text-xs text-muted">{STATUS_LABELS[task.status]}</span>
                  </div>
                  <TaskCompletionInfo
                    status={task.status}
                    deadline={task.deadline}
                    completedAt={task.completedAt}
                  />
                </div>
              );
              })}
            </div>
          )}
        </Card>
      )}

      {tab === "info" && (
        <Card>
          <SectionTitle className="mb-4">Dosya Bilgisi</SectionTitle>
          <CaseForm
            initial={caseData}
            onSubmit={async (data) => {
              if (data.status === "CLOSED" && caseData.status !== "CLOSED") {
                const openCount = tasks.filter(
                  (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED",
                ).length;
                if (openCount > 0) {
                  const ok = await confirm({
                    title: "Dosyayı kapat",
                    message: `${openCount} açık iş var. Dosyayı yine de kapatmak istiyor musun?`,
                    confirmLabel: "Kapat",
                    variant: "danger",
                  });
                  if (!ok) throw new Error("İptal edildi");
                }
              }
              const res = await fetch(`/api/cases/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              if (!res.ok) throw new Error("Güncelleme başarısız");
              showToast("Dosya güncellendi");
              await load();
            }}
          />
        </Card>
      )}

      <Modal open={!!editEvent} title="Olayı Düzenle" onClose={() => setEditEvent(null)}>
        {editEvent && (
          <CaseEventEditForm
            initial={{
              title: editEvent.title,
              description: editEvent.description,
              occurredAt: new Date(editEvent.occurredAt).toISOString(),
            }}
            onCancel={() => setEditEvent(null)}
            onSubmit={async (data) => {
              const res = await fetch(`/api/cases/${id}/events/${editEvent.referenceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              if (!res.ok) throw new Error("Güncelleme başarısız");
              setEditEvent(null);
              showToast("Olay güncellendi");
              await load();
            }}
          />
        )}
      </Modal>

      <Modal open={eventOpen} title="Süreç Olayı Ekle" onClose={() => setEventOpen(false)}>
        <CaseEventForm
          template={template}
          onCancel={() => setEventOpen(false)}
          onSubmit={async (data) => {
            const res = await fetch(`/api/cases/${id}/events`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...data,
                description: data.description ?? data.metadata.description,
                metadata: data.metadata,
              }),
            });
            if (!res.ok) {
              const err = (await res.json()) as { error?: string };
              throw new Error(err.error ?? "Olay eklenemedi");
            }
            setEventOpen(false);
            showToast("Olay eklendi");
            await load();
          }}
        />
      </Modal>

      <Modal open={taskOpen} title="Dosyaya İş Ekle" onClose={() => setTaskOpen(false)}>
        <TaskForm
          initial={{ caseId: id }}
          onCancel={() => setTaskOpen(false)}
          onSubmit={async (data) => {
            const res = await fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...data, caseId: id }),
            });
            if (!res.ok) throw new Error("İş eklenemedi");
            setTaskOpen(false);
            showToast("İş eklendi");
            await load();
          }}
        />
      </Modal>
    </div>
  );
}
