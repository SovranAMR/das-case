"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { CaseForm } from "@/components/case-form";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useSoftDeleteUndo } from "@/hooks/use-soft-delete-undo";
import { CASE_SORT_OPTIONS, splitSortValue } from "@/lib/api/sort";
import { getStageLabel } from "@/lib/case-templates";
import { canDeleteCase } from "@/lib/auth/permissions";
import { CASE_STATUS_LABELS, CASE_TYPE_LABELS, type CaseType, type UserRole } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils/dates";
import { getHearingUrgency, HEARING_URGENCY_LABELS } from "@/lib/utils/hearings";

type CaseRow = {
  id: string;
  courtName: string;
  fileNumber: string;
  clientName: string;
  title: string;
  caseType: CaseType;
  currentStage: string;
  status: keyof typeof CASE_STATUS_LABELS;
  nextHearingAt: string | null;
  updatedAt: string;
};

const hearingBadgeStyles = {
  today: "bg-orange-100 text-orange-800",
  soon: "bg-yellow-100 text-yellow-800",
  upcoming: "bg-blue-100 text-blue-800",
  past: "border border-border bg-bg-elevated text-text-secondary",
} as const;

export default function CasesPage() {
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { deleteWithUndo } = useSoftDeleteUndo();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("updatedAt:desc");
  const [statusTab, setStatusTab] = useState<"active" | "archived">("active");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { user?: { role: UserRole } } | null) => {
        if (data?.user?.role) setRole(data.user.role);
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const { sort: sortField, order } = splitSortValue(sort);
    params.set("sort", sortField);
    params.set("order", order);
    if (statusTab === "archived") {
      params.set("status", "ARCHIVED");
    } else {
      params.set("excludeArchived", "true");
    }
    const res = await fetch(`/api/cases?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as { cases: CaseRow[] };
      setCases(data.cases);
    } else {
      showToast("Dosyalar yüklenemedi", "error");
    }
    setLoading(false);
  }, [q, sort, statusTab, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  async function handleCreate(data: {
    courtName: string;
    fileNumber: string;
    clientName: string;
    title: string;
  }) {
    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      throw new Error(err.error ?? "Dosya eklenemedi");
    }
    setOpen(false);
    showToast("Dosya eklendi");
    await load();
  }

  async function archiveCase(id: string) {
    const ok = await confirm({
      title: "Dosyayı arşivle",
      message: "Bu dosyayı arşive taşımak istediğine emin misin?",
      confirmLabel: "Arşivle",
    });
    if (!ok) return;

    const res = await fetch(`/api/cases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ARCHIVED" }),
    });
    if (!res.ok) {
      showToast("Dosya arşivlenemedi", "error");
      return;
    }
    showToast("Dosya arşivlendi");
    await load();
  }

  async function unarchiveCase(id: string) {
    const res = await fetch(`/api/cases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    if (!res.ok) {
      showToast("Dosya arşivden çıkarılamadı", "error");
      return;
    }
    showToast("Dosya arşivden çıkarıldı");
    await load();
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Dosyayı sil",
      message: "Bu dosyayı silmek istediğine emin misin? 5 saniye içinde geri alabilirsin.",
      confirmLabel: "Sil",
      variant: "danger",
    });
    if (!ok) return;
    const deleted = await deleteWithUndo({
      deleteUrl: `/api/cases/${id}`,
      restoreUrl: `/api/cases/${id}/restore`,
      message: "Dosya silindi",
      restoredMessage: "Dosya geri alındı",
      onReload: load,
    });
    if (!deleted) showToast("Dosya silinemedi", "error");
  }

  return (
    <div className="space-y-6">
      <PageHeader label="Dosya" title="Dosyalar" description="Mahkeme dosyalarını yönet">
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Dosya
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusTab === "active" ? "primary" : "secondary"}
          onClick={() => setStatusTab("active")}
        >
          Aktif
        </Button>
        <Button
          variant={statusTab === "archived" ? "primary" : "secondary"}
          onClick={() => setStatusTab("archived")}
        >
          Arşiv
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <Input
            className="pl-9"
            placeholder="Mahkeme, dosya no, müvekkil ara..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={sort} onChange={(e) => setSort(e.target.value)}>
          {CASE_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <p className="text-muted">Yükleniyor...</p>
      ) : cases.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-muted">
            {q
              ? "Aramaya uyan dosya bulunamadı."
              : statusTab === "archived"
                ? "Arşivde dosya yok."
                : "Henüz dosya yok. İlk dosyayı ekleyerek başla."}
          </p>
          {!q && statusTab === "active" && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Dosya Ekle
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          {cases.map((c) => {
            const hearingUrgency = c.nextHearingAt
              ? getHearingUrgency(new Date(c.nextHearingAt))
              : null;
            return (
            <Card key={c.id} className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/dosyalar/${c.id}`} className="font-serif text-lg hover:underline">
                  {c.fileNumber}
                </Link>
                <p className="text-sm text-muted">{c.courtName}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {CASE_TYPE_LABELS[c.caseType]}
                  </span>
                  <span className="rounded border border-border px-2 py-0.5 font-mono text-[10px] text-text-secondary">
                    {getStageLabel(c.caseType, c.currentStage)}
                  </span>
                  {c.nextHearingAt && hearingUrgency && hearingUrgency !== "past" && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${hearingBadgeStyles[hearingUrgency]}`}
                    >
                      Duruşma: {formatDateTime(new Date(c.nextHearingAt))} ({HEARING_URGENCY_LABELS[hearingUrgency]})
                    </span>
                  )}
                </div>
                <p className="mt-1">{c.title}</p>
                <p className="mt-1 text-sm">
                  Müvekkil: <span className="font-medium">{c.clientName}</span>
                </p>
                <p className="mt-1 text-xs text-muted">
                  {CASE_STATUS_LABELS[c.status]} — {formatDate(new Date(c.updatedAt))}
                </p>
              </div>
              {role && (
                <div className="flex gap-2">
                  {c.status !== "ARCHIVED" ? (
                    <Button
                      variant="secondary"
                      aria-label="Dosyayı arşivle"
                      onClick={() => void archiveCase(c.id)}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      aria-label="Dosyayı arşivden çıkar"
                      onClick={() => void unarchiveCase(c.id)}
                    >
                      <ArchiveRestore className="h-4 w-4" />
                    </Button>
                  )}
                  {canDeleteCase(role) && (
                    <Button
                      variant="danger"
                      aria-label="Dosyayı sil"
                      onClick={() => void handleDelete(c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </Card>
          );
          })}
        </div>
      )}

      <Modal open={open} title="Yeni Dosya" onClose={() => setOpen(false)}>
        <CaseForm onSubmit={handleCreate} onCancel={() => setOpen(false)} />
      </Modal>
    </div>
  );
}
