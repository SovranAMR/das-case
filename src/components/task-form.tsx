"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form-label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isOverdue, toDateTimeLocalValue } from "@/lib/utils/dates";
import { requiresOverdueReason } from "@/lib/utils/overdue-completion";
import type { TaskPriority, TaskStatus, TaskType } from "@/lib/types";

type UserOption = { id: string; name: string };
type CaseOption = { id: string; title: string; fileNumber: string };

type TaskFormData = {
  caseId?: string | null;
  title: string;
  description?: string | null;
  deadline: string;
  priority: TaskPriority;
  status: TaskStatus;
  taskType: TaskType;
  assignedTo: string;
  completedAt?: string | null;
  overdueReason?: string;
  deadlineChangeReason?: string;
};

export function TaskForm({
  initial,
  currentUserId,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<TaskFormData> & { deadline?: Date | string; completedAt?: Date | string | null };
  currentUserId?: string;
  onSubmit: (data: TaskFormData) => Promise<void>;
  onCancel?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? "PENDING");
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? "NORMAL");
  const [legalConfirmed, setLegalConfirmed] = useState(false);
  const [overdueReason, setOverdueReason] = useState("");
  const [deadlineChangeReason, setDeadlineChangeReason] = useState("");
  const initialDeadlineValue = initial?.deadline
    ? toDateTimeLocalValue(new Date(initial.deadline))
    : null;
  const [deadlineValue, setDeadlineValue] = useState(
    initial?.deadline
      ? toDateTimeLocalValue(new Date(initial.deadline))
      : toDateTimeLocalValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  );
  const [users, setUsers] = useState<UserOption[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [caseSearch, setCaseSearch] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState(initial?.caseId ?? "");

  useEffect(() => {
    void Promise.all([
      fetch("/api/users/assignees").then((r) => (r.ok ? r.json() : { users: [] })),
      fetch("/api/cases").then((r) => (r.ok ? r.json() : { cases: [] })),
    ]).then(([usersData, casesData]) => {
      setUsers((usersData as { users: UserOption[] }).users ?? []);
      setCases(
        ((casesData as { cases: CaseOption[] }).cases ?? []).map((c) => ({
          id: c.id,
          title: c.title,
          fileNumber: c.fileNumber,
        })),
      );
    });
  }, []);

  useEffect(() => {
    if (priority !== "LEGAL_DEADLINE") setLegalConfirmed(false);
  }, [priority]);

  const completedAtDefault = initial?.completedAt
    ? toDateTimeLocalValue(new Date(initial.completedAt))
    : toDateTimeLocalValue(new Date());

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    if (priority === "LEGAL_DEADLINE" && !legalConfirmed) {
      setError("Kanuni süre işleri için onay kutusunu işaretle");
      setLoading(false);
      return;
    }

    const assignedTo = String(form.get("assignedTo") ?? "");
    if (!assignedTo) {
      setError("Atanan kişi seçilmeli");
      setLoading(false);
      return;
    }

    const nextStatus = (form.get("status") as TaskStatus) || status;
    const previousStatus = initial?.status ?? "PENDING";
    const needsReason =
      initial?.status &&
      requiresOverdueReason(
        new Date(String(form.get("deadline") || deadlineValue)),
        previousStatus,
        nextStatus,
      );
    if (needsReason && overdueReason.trim().length < 10) {
      setError("Gecikmiş tamamlama için gerekçe zorunlu (min 10 karakter)");
      setLoading(false);
      return;
    }

    const nextDeadline = String(form.get("deadline"));
    const deadlineChanged =
      initialDeadlineValue !== null && nextDeadline !== initialDeadlineValue;
    if (deadlineChanged && deadlineChangeReason.trim().length < 10) {
      setError("Son tarih değişikliği için gerekçe zorunlu (min 10 karakter)");
      setLoading(false);
      return;
    }

    try {
      await onSubmit({
        caseId: (form.get("caseId") as string) || null,
        title: String(form.get("title")),
        description: String(form.get("description") || "") || null,
        deadline: String(form.get("deadline")),
        priority: form.get("priority") as TaskPriority,
        status: nextStatus,
        taskType: form.get("taskType") as TaskType,
        assignedTo,
        completedAt: nextStatus === "COMPLETED" ? String(form.get("completedAt") || "") : null,
        overdueReason: needsReason ? overdueReason.trim() : undefined,
        deadlineChangeReason: deadlineChanged ? deadlineChangeReason.trim() : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {priority === "LEGAL_DEADLINE" && (
        <div className="rounded-lg border border-purple-300 bg-purple-50 p-4">
          <p className="text-sm font-semibold text-purple-900">Kanuni süre — dikkat</p>
          <p className="mt-1 text-sm text-purple-800">
            Bu iş mahkeme/usul süresi kapsamındadır. Son tarih ve sorumlu doğru olmalıdır.
          </p>
          <label className="mt-3 flex items-start gap-2 text-sm text-purple-900">
            <input
              type="checkbox"
              checked={legalConfirmed}
              onChange={(e) => setLegalConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            Kanuni süre olduğunu onaylıyorum
          </label>
        </div>
      )}
      <div>
        <FormLabel>Bağlı Dosya</FormLabel>
        <Input
          placeholder="Dosya no veya konu ara..."
          value={caseSearch}
          onChange={(e) => setCaseSearch(e.target.value)}
          className="mb-2"
        />
        <input type="hidden" name="caseId" value={selectedCaseId} />
        <Select
          value={selectedCaseId}
          onChange={(e) => setSelectedCaseId(e.target.value)}
        >
          <option value="">Genel iş (dosyasız)</option>
          {cases
            .filter((c) => {
              const q = caseSearch.trim().toLowerCase();
              if (!q) return true;
              return (
                c.fileNumber.toLowerCase().includes(q) ||
                c.title.toLowerCase().includes(q)
              );
            })
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.fileNumber} — {c.title}
              </option>
            ))}
        </Select>
      </div>
      <div>
        <FormLabel required>Yapılacak İş</FormLabel>
        <Input name="title" defaultValue={initial?.title} required />
      </div>
      <div>
        <FormLabel>Detay</FormLabel>
        <Textarea name="description" defaultValue={initial?.description ?? ""} rows={3} />
      </div>
      <div>
        <FormLabel required>Son Tarih</FormLabel>
        <Input
          name="deadline"
          type="datetime-local"
          value={deadlineValue}
          onChange={(e) => setDeadlineValue(e.target.value)}
          required
        />
        {initialDeadlineValue !== null && deadlineValue !== initialDeadlineValue && (
          <div className="mt-3">
            <FormLabel required>Son tarih değişiklik gerekçesi</FormLabel>
            <Textarea
              value={deadlineChangeReason}
              onChange={(e) => setDeadlineChangeReason(e.target.value)}
              rows={2}
              placeholder="Neden değişti? (mahkeme, müvekkil, evrak vb.)"
              required
              minLength={10}
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FormLabel>Öncelik</FormLabel>
          <Select
            name="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            <option value="LOW">Düşük</option>
            <option value="NORMAL">Normal</option>
            <option value="URGENT">Acil</option>
            <option value="LEGAL_DEADLINE">Kanuni Süre</option>
          </Select>
        </div>
        <div>
          <FormLabel>Tür</FormLabel>
          <Select name="taskType" defaultValue={initial?.taskType ?? "GENERAL"}>
            <option value="HEARING">Duruşma</option>
            <option value="PETITION">Dilekçe</option>
            <option value="RESPONSE_DEADLINE">Cevap Süresi</option>
            <option value="ENFORCEMENT">İcra</option>
            <option value="GENERAL">Genel</option>
          </Select>
        </div>
      </div>
      {initial?.status && (
        <div>
          <FormLabel>Durum</FormLabel>
          <Select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
          >
            <option value="PENDING">Bekliyor</option>
            <option value="IN_PROGRESS">Devam Ediyor</option>
            <option value="COMPLETED">Tamamlandı</option>
            <option value="CANCELLED">İptal</option>
          </Select>
        </div>
      )}
      {status === "COMPLETED" && (
        <div className="space-y-3">
          <div>
            <FormLabel required>Tamamlanma Tarihi</FormLabel>
            <Input
              name="completedAt"
              type="datetime-local"
              defaultValue={completedAtDefault}
              required
            />
            <p className="mt-1 text-xs text-muted">
              İş son tarihten önce bittiyse tamamlanma tarihini gir — sistem erken/zamanında/geç
              durumunu hesaplar.
            </p>
          </div>
          {initial?.status &&
            isOverdue(new Date(deadlineValue), initial.status) && (
              <div>
                <FormLabel required>Gecikme gerekçesi</FormLabel>
                <Textarea
                  value={overdueReason}
                  onChange={(e) => setOverdueReason(e.target.value)}
                  rows={3}
                  placeholder="Gecikme nedeni (mahkeme, müvekkil, evrak vb.)"
                  required
                  minLength={10}
                />
              </div>
            )}
        </div>
      )}
      {users.length > 0 && (
        <div>
          <FormLabel required>Atanan</FormLabel>
          <Select
            name="assignedTo"
            defaultValue={initial?.assignedTo ?? currentUserId ?? ""}
            required
          >
            <option value="" disabled>
              Kişi seç
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Kaydediliyor..." : "Kaydet"}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            İptal
          </Button>
        )}
      </div>
    </form>
  );
}
