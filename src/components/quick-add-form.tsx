"use client";

import { useEffect, useState } from "react";
import { toDateTimeLocalValue } from "@/lib/utils/dates";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form-label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Mode = "task" | "case";

export function QuickAddForm({
  currentUserId,
  onSuccess,
  onCancel,
}: {
  currentUserId?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const [mode, setMode] = useState<Mode>("task");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    try {
      if (mode === "case") {
        const res = await fetch("/api/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courtName: form.get("courtName"),
            fileNumber: form.get("fileNumber"),
            clientName: form.get("clientName"),
            title: form.get("title"),
          }),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? "Dosya eklenemedi");
        }
      } else {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.get("title"),
            description: form.get("description") || null,
            deadline: form.get("deadline"),
            priority: form.get("priority"),
            taskType: form.get("taskType"),
            assignedTo: currentUserId ?? null,
          }),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? "İş eklenemedi");
        }
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  const [deadlineValue, setDeadlineValue] = useState("");

  useEffect(() => {
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 7);
    setDeadlineValue(toDateTimeLocalValue(defaultDeadline));
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <FormLabel>Kayıt Türü</FormLabel>
        <Select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
          <option value="task">Yeni İş</option>
          <option value="case">Yeni Dosya</option>
        </Select>
      </div>

      {mode === "case" ? (
        <>
          <div>
            <FormLabel required>Mahkeme</FormLabel>
            <Input name="courtName" required />
          </div>
          <div>
            <FormLabel required>Dosya No</FormLabel>
            <Input name="fileNumber" required />
          </div>
          <div>
            <FormLabel required>Müvekkil</FormLabel>
            <Input name="clientName" required />
          </div>
          <div>
            <FormLabel required>Konu</FormLabel>
            <Input name="title" required />
          </div>
        </>
      ) : (
        <>
          <div>
            <FormLabel required>Yapılacak İş</FormLabel>
            <Input name="title" required />
          </div>
          <div>
            <FormLabel>Detay</FormLabel>
            <Textarea name="description" rows={3} />
          </div>
          <div>
            <FormLabel required>Son Tarih</FormLabel>
            <Input
              name="deadline"
              type="datetime-local"
              value={deadlineValue}
              onChange={(e) => setDeadlineValue(e.target.value)}
              required
              disabled={!deadlineValue}
            />
          </div>
          <div>
            <FormLabel>Öncelik</FormLabel>
            <Select name="priority" defaultValue="NORMAL">
              <option value="LOW">Düşük</option>
              <option value="NORMAL">Normal</option>
              <option value="URGENT">Acil</option>
              <option value="LEGAL_DEADLINE">Kanuni Süre</option>
            </Select>
          </div>
          <div>
            <FormLabel>Tür</FormLabel>
            <Select name="taskType" defaultValue="GENERAL">
              <option value="HEARING">Duruşma</option>
              <option value="PETITION">Dilekçe</option>
              <option value="RESPONSE_DEADLINE">Cevap Süresi</option>
              <option value="ENFORCEMENT">İcra</option>
              <option value="GENERAL">Genel</option>
            </Select>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className={onCancel ? undefined : "w-full"}>
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
