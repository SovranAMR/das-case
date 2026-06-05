"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Archive, ArchiveRestore, Plus, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { TaskForm } from "@/components/task-form";
import { TaskCompletionInfo } from "@/components/task-completion-info";
import { OverdueCompletionModal } from "@/components/overdue-completion-modal";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useSoftDeleteUndo } from "@/hooks/use-soft-delete-undo";
import { requiresOverdueReason } from "@/lib/utils/overdue-completion";
import { PriorityBadge, UrgencyBadge } from "@/components/ui/badge";
import { canDeleteTask, shouldDefaultToMyTasks } from "@/lib/auth/permissions";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_TYPE_LABELS,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
  type UserRole,
} from "@/lib/types";
import { TASK_SORT_OPTIONS, splitSortValue } from "@/lib/api/sort";
import { formatDateTime, getDeadlineUrgency } from "@/lib/utils/dates";
import { formatAssignmentAge } from "@/lib/utils/sla";
import { cn } from "@/lib/utils/cn";
import { URGENCY_FILTER_OPTIONS, getUrgencyRowClassName } from "@/lib/utils/urgency-styles";
import { canArchiveTask, type TaskListView } from "@/lib/utils/task-list-view";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  priority: TaskPriority;
  status: TaskStatus;
  taskType: TaskType;
  assignedTo: string | null;
  caseCourtName: string | null;
  caseFileNumber: string | null;
  assigneeName: string | null;
  completedAt: string | null;
  createdAt: string;
  assignedAt: string | null;
  archivedAt: string | null;
};

type Assignee = { id: string; name: string };
type Me = { id: string; role: UserRole };

const urgencyLabels = {
  overdue: "Gecikmiş",
  today: "Bugün",
  soon: "Yaklaşan",
  normal: "Normal",
  completed: "Tamamlandı",
} as const;

function TasksPageContent() {
  const searchParams = useSearchParams();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { deleteWithUndo } = useSoftDeleteUndo();
  const [me, setMe] = useState<Me | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [view, setView] = useState<"mine" | "all">("all");
  const [listTab, setListTab] = useState<TaskListView>("active");
  const [sort, setSort] = useState("deadline:asc");
  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [statusPatching, setStatusPatching] = useState<string | null>(null);
  const [overdueModal, setOverdueModal] = useState<{ id: string; title: string } | null>(null);
  const highlightId = searchParams.get("highlight");

  const hasActiveFilters =
    Boolean(q) ||
    Boolean(status) ||
    Boolean(priority) ||
    Boolean(urgencyFilter) ||
    (view === "all" && Boolean(assignedTo));

  useEffect(() => {
    void Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/users/assignees").then((r) => (r.ok ? r.json() : { users: [] })),
    ]).then(([meData, assigneeData]) => {
      const currentUser = (meData as { user: Me }).user;
      setMe(currentUser);
      setAssignees((assigneeData as { users: Assignee[] }).users ?? []);

      const urlView = searchParams.get("view");
      if (urlView === "mine") {
        setView("mine");
        setAssignedTo(currentUser.id);
      } else if (shouldDefaultToMyTasks(currentUser.role)) {
        setView("mine");
        setAssignedTo(currentUser.id);
      } else {
        setView("all");
      }

      const urlPriority = searchParams.get("priority");
      if (urlPriority) setPriority(urlPriority);

      const urlUrgency = searchParams.get("urgency");
      if (urlUrgency) setUrgencyFilter(urlUrgency);
    });
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (view === "mine" && me) {
      params.set("assignedTo", me.id);
    } else if (assignedTo) {
      params.set("assignedTo", assignedTo);
    }
    const { sort: sortField, order } = splitSortValue(sort);
    params.set("sort", sortField);
    params.set("order", order);
    params.set("view", listTab);
    const res = await fetch(`/api/tasks?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as { tasks: TaskRow[] };
      setTasks(data.tasks);
    } else {
      showToast("İşler yüklenemedi", "error");
    }
    setLoading(false);
  }, [q, status, priority, assignedTo, view, me, sort, listTab, showToast]);

  useEffect(() => {
    if (!me) return;
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load, me]);

  useEffect(() => {
    if (!highlightId || loading) return;
    const el = document.getElementById(`task-${highlightId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, loading, tasks]);

  function handleViewChange(next: "mine" | "all") {
    setView(next);
    if (next === "mine" && me) {
      setAssignedTo(me.id);
    } else {
      setAssignedTo("");
    }
  }

  async function patchTaskStatus(
    taskId: string,
    newStatus: TaskStatus,
    overdueReason?: string,
  ): Promise<boolean> {
    setStatusPatching(taskId);
    const body: Record<string, string> = { status: newStatus };
    if (newStatus === "COMPLETED") {
      body.completedAt = new Date().toISOString();
    }
    if (overdueReason) {
      body.overdueReason = overdueReason;
    }
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setStatusPatching(null);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      showToast(err.error ?? "Güncelleme başarısız", "error");
      return false;
    }
    showToast(newStatus === "COMPLETED" ? "İş tamamlandı" : "Durum güncellendi");
    await load();
    return true;
  }

  async function bulkComplete() {
    const overdueCount = [...selected].filter((id) => {
      const task = tasks.find((t) => t.id === id);
      return (
        task &&
        requiresOverdueReason(new Date(task.deadline), task.status, "COMPLETED")
      );
    }).length;
    if (overdueCount > 0) {
      showToast(
        `${overdueCount} gecikmiş iş için tek tek gerekçe girmelisin`,
        "error",
      );
      return;
    }

    const ok = await confirm({
      title: "Seçili işleri tamamla",
      message: `${selected.size} işi tamamlandı olarak işaretlemek istediğine emin misin?`,
      confirmLabel: "Tamamla",
    });
    if (!ok) return;

    let failed = 0;
    for (const id of selected) {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED", completedAt: new Date().toISOString() }),
      });
      if (!res.ok) failed += 1;
    }
    setSelected(new Set());
    if (failed > 0) {
      showToast(`${failed} iş tamamlanamadı`, "error");
    } else {
      showToast("Seçili işler tamamlandı");
    }
    await load();
  }

  async function bulkArchive() {
    const ok = await confirm({
      title: "Seçili işleri arşivle",
      message: `${selected.size} işi arşive taşımak istediğine emin misin?`,
      confirmLabel: "Arşivle",
    });
    if (!ok) return;

    const res = await fetch("/api/tasks/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive", taskIds: [...selected] }),
    });
    if (!res.ok) {
      showToast("Toplu arşivleme başarısız", "error");
      return;
    }
    const data = (await res.json()) as { updated: number; skipped: number };
    setSelected(new Set());
    if (data.skipped > 0) {
      showToast(`${data.updated} iş arşivlendi, ${data.skipped} atlandı`);
    } else {
      showToast(`${data.updated} iş arşivlendi`);
    }
    await load();
  }

  async function bulkUnarchive() {
    const res = await fetch("/api/tasks/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unarchive", taskIds: [...selected] }),
    });
    if (!res.ok) {
      showToast("Arşivden çıkarma başarısız", "error");
      return;
    }
    const data = (await res.json()) as { updated: number };
    setSelected(new Set());
    showToast(`${data.updated} iş arşivden çıkarıldı`);
    await load();
  }

  async function archiveTask(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (!res.ok) {
      showToast("İş arşivlenemedi", "error");
      return;
    }
    showToast("İş arşivlendi");
    await load();
  }

  async function unarchiveTask(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    if (!res.ok) {
      showToast("İş arşivden çıkarılamadı", "error");
      return;
    }
    showToast("İş arşivden çıkarıldı");
    await load();
  }

  async function bulkDelete() {
    const ok = await confirm({
      title: "Seçili işleri sil",
      message: "Seçili işleri silmek istediğine emin misin? Bu işlem geri alınamaz.",
      confirmLabel: "Sil",
      variant: "danger",
    });
    if (!ok) return;
    let failed = 0;
    for (const id of selected) {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) failed += 1;
    }
    setSelected(new Set());
    if (failed > 0) {
      showToast(`${failed} iş silinemedi`, "error");
    } else {
      showToast("Seçili işler silindi");
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        label="Operasyon"
        title="İşler"
        description={
          listTab === "archived"
            ? "Arşivlenmiş tamamlanan işler"
            : listTab === "completed"
              ? "Tamamlanan işler — arşive taşıyabilirsin"
              : view === "mine"
                ? "Bana atanan açık işler"
                : "Tüm açık işler"
        }
      >
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni İş
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={listTab === "active" ? "primary" : "secondary"}
          onClick={() => setListTab("active")}
        >
          Aktif
        </Button>
        <Button
          variant={listTab === "completed" ? "primary" : "secondary"}
          onClick={() => setListTab("completed")}
        >
          Tamamlanan
        </Button>
        <Button
          variant={listTab === "archived" ? "primary" : "secondary"}
          onClick={() => setListTab("archived")}
        >
          Arşiv
        </Button>
        <Button
          variant={view === "mine" ? "primary" : "secondary"}
          onClick={() => handleViewChange("mine")}
        >
          <User className="mr-2 h-4 w-4" />
          Benim İşlerim
        </Button>
        <Button
          variant={view === "all" ? "primary" : "secondary"}
          onClick={() => handleViewChange("all")}
        >
          Tüm İşler
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
        <Input placeholder="İş, dosya no, müvekkil ara..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tüm durumlar</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">Tüm öncelikler</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        {view === "all" && (
          <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">Tüm atananlar</option>
            {assignees.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        )}
        {listTab === "active" && (
          <Select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)}>
            {URGENCY_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        )}
        <Select value={sort} onChange={(e) => setSort(e.target.value)}>
          {TASK_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        {selected.size > 0 && (
          <div className="flex flex-wrap gap-2 lg:col-span-2">
            {listTab === "active" && (
              <Button variant="secondary" onClick={() => void bulkComplete()}>
                Tamamla ({selected.size})
              </Button>
            )}
            {listTab === "completed" && (
              <Button variant="secondary" onClick={() => void bulkArchive()}>
                <Archive className="mr-2 h-4 w-4" />
                Arşivle ({selected.size})
              </Button>
            )}
            {listTab === "archived" && (
              <Button variant="secondary" onClick={() => void bulkUnarchive()}>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Geri al ({selected.size})
              </Button>
            )}
            {me && canDeleteTask(me.role) && (
              <Button variant="danger" onClick={() => void bulkDelete()}>
                Sil
              </Button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-muted">Yükleniyor...</p>
      ) : tasks.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-muted">
            {hasActiveFilters
              ? "Filtreye uyan iş bulunamadı. Aramayı veya filtreleri değiştir."
              : listTab === "archived"
                ? "Arşivde iş yok."
                : listTab === "completed"
                  ? "Tamamlanan iş yok."
                  : "Henüz açık iş yok. İlk işi ekleyerek başla."}
          </p>
          {!hasActiveFilters && listTab === "active" && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni İş Ekle
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks
            .filter((task) => {
              if (!urgencyFilter) return true;
              const urgency = getDeadlineUrgency(new Date(task.deadline), task.status);
              return urgency === urgencyFilter;
            })
            .map((task) => {
            const urgency = getDeadlineUrgency(new Date(task.deadline), task.status);
            return (
              <Card
                key={task.id}
                id={`task-${task.id}`}
                className={cn(
                  "flex flex-wrap items-start gap-3",
                  listTab === "active" && getUrgencyRowClassName(urgency),
                  highlightId === task.id && "ring-2 ring-primary ring-offset-2",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(task.id)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(task.id);
                    else next.delete(task.id);
                    setSelected(next);
                  }}
                  className="mt-1"
                />
                <div className="flex-1">
                  <button
                    className="text-left font-semibold hover:underline"
                    onClick={() => setEditTask(task)}
                  >
                    {task.title}
                  </button>
                  {task.description && (
                    <p className="mt-1 text-sm text-text-secondary">{task.description}</p>
                  )}
                  <p className="mt-1 text-sm text-muted">{formatDateTime(new Date(task.deadline))}</p>
                  {task.caseFileNumber && (
                    <p className="text-xs text-muted">
                      {task.caseFileNumber} — {task.caseCourtName}
                    </p>
                  )}
                  {task.assigneeName && (
                    <p className="text-xs text-muted">Atanan: {task.assigneeName}</p>
                  )}
                  {task.status !== "COMPLETED" && task.assignedTo && (
                    <p className="text-xs text-muted">
                      {formatAssignmentAge(
                        task.assignedAt ? new Date(task.assignedAt) : null,
                        new Date(task.createdAt),
                      )}
                    </p>
                  )}
                  <TaskCompletionInfo
                    status={task.status}
                    deadline={task.deadline}
                    completedAt={task.completedAt}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {task.status !== "COMPLETED" && (
                      <UrgencyBadge urgency={urgency} label={urgencyLabels[urgency]} />
                    )}
                    <PriorityBadge priority={task.priority} label={PRIORITY_LABELS[task.priority]} />
                    <span className="rounded border border-border px-2 py-1 font-mono text-[10px] text-text-secondary">
                      {STATUS_LABELS[task.status]}
                    </span>
                    <span className="rounded border border-border px-2 py-1 font-mono text-[10px] text-text-secondary">
                      {TASK_TYPE_LABELS[task.taskType]}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={task.status}
                    disabled={statusPatching === task.id}
                    onChange={(e) => {
                      const newStatus = e.target.value as TaskStatus;
                      if (
                        requiresOverdueReason(
                          new Date(task.deadline),
                          task.status,
                          newStatus,
                        )
                      ) {
                        setOverdueModal({ id: task.id, title: task.title });
                        return;
                      }
                      void patchTaskStatus(task.id, newStatus);
                    }}
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                  {listTab === "completed" &&
                    canArchiveTask({
                      status: task.status,
                      archivedAt: task.archivedAt ? new Date(task.archivedAt) : null,
                    }) && (
                      <Button
                        variant="secondary"
                        aria-label="İşi arşivle"
                        onClick={() => void archiveTask(task.id)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                  {listTab === "archived" && (
                    <Button
                      variant="secondary"
                      aria-label="Arşivden çıkar"
                      onClick={() => void unarchiveTask(task.id)}
                    >
                      <ArchiveRestore className="h-4 w-4" />
                    </Button>
                  )}
                  {me && canDeleteTask(me.role) && (
                    <Button
                      variant="danger"
                      aria-label="İşi sil"
                      onClick={async () => {
                        const ok = await confirm({
                          title: "İşi sil",
                          message: "Bu işi silmek istediğine emin misin? 5 saniye içinde geri alabilirsin.",
                          confirmLabel: "Sil",
                          variant: "danger",
                        });
                        if (!ok) return;
                        const deleted = await deleteWithUndo({
                          deleteUrl: `/api/tasks/${task.id}`,
                          restoreUrl: `/api/tasks/${task.id}/restore`,
                          message: "İş silindi",
                          restoredMessage: "İş geri alındı",
                          onReload: load,
                        });
                        if (!deleted) showToast("İş silinemedi", "error");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} title="Yeni İş" onClose={() => setOpen(false)}>
        <TaskForm
          currentUserId={me?.id}
          onCancel={() => setOpen(false)}
          onSubmit={async (data) => {
            const res = await fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            if (!res.ok) {
              const err = (await res.json().catch(() => ({}))) as { error?: string };
              throw new Error(err.error ?? "İş eklenemedi");
            }
            setOpen(false);
            showToast("İş eklendi");
            await load();
          }}
        />
      </Modal>

      <Modal open={!!editTask} title="İşi Düzenle" onClose={() => setEditTask(null)}>
        {editTask && (
          <TaskForm
            currentUserId={me?.id}
            initial={{
              ...editTask,
              deadline: editTask.deadline,
              assignedTo: editTask.assignedTo ?? me?.id ?? "",
            }}
            onCancel={() => setEditTask(null)}
            onSubmit={async (data) => {
              const res = await fetch(`/api/tasks/${editTask.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              if (!res.ok) {
                const err = (await res.json().catch(() => ({}))) as { error?: string };
                throw new Error(err.error ?? "Güncelleme başarısız");
              }
              setEditTask(null);
              showToast("İş güncellendi");
              await load();
            }}
          />
        )}
      </Modal>

      <OverdueCompletionModal
        open={!!overdueModal}
        taskTitle={overdueModal?.title ?? ""}
        onClose={() => setOverdueModal(null)}
        onConfirm={async (reason) => {
          if (!overdueModal) return;
          const ok = await patchTaskStatus(overdueModal.id, "COMPLETED", reason);
          if (!ok) throw new Error("Tamamlama başarısız");
          setOverdueModal(null);
        }}
      />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<p className="text-muted">Yükleniyor...</p>}>
      <TasksPageContent />
    </Suspense>
  );
}
