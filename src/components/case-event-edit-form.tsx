"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form-label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toDateTimeLocalValue } from "@/lib/utils/dates";

export function CaseEventEditForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: {
    title: string;
    description: string | null;
    occurredAt: string;
  };
  onSubmit: (data: {
    title: string;
    description?: string;
    occurredAt: string;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await onSubmit({
        title: String(form.get("title")),
        description: String(form.get("description") || "").trim() || undefined,
        occurredAt: String(form.get("occurredAt")),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Güncelleme başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <FormLabel required>Başlık</FormLabel>
        <Input name="title" defaultValue={initial.title} required />
      </div>
      <div>
        <FormLabel>Detay</FormLabel>
        <Textarea name="description" defaultValue={initial.description ?? ""} rows={3} />
      </div>
      <div>
        <FormLabel required>Tarih</FormLabel>
        <Input
          name="occurredAt"
          type="datetime-local"
          defaultValue={toDateTimeLocalValue(new Date(initial.occurredAt))}
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Kaydediliyor..." : "Kaydet"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          İptal
        </Button>
      </div>
    </form>
  );
}
