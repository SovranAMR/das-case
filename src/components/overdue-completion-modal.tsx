"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";

export function OverdueCompletionModal({
  open,
  taskTitle,
  onClose,
  onConfirm,
}: {
  open: boolean;
  taskTitle: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 10) {
      setError("Gerekçe en az 10 karakter olmalı");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} title="Gecikmiş tamamlama gerekçesi" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          <span className="font-medium text-text-primary">{taskTitle}</span> son tarihten sonra
          tamamlanıyor. Kısa bir gerekçe yaz.
        </p>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Gecikme nedeni (mahkeme, müvekkil, evrak vb.)"
          required
          minLength={10}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Kaydediliyor..." : "Tamamla"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            İptal
          </Button>
        </div>
      </form>
    </Modal>
  );
}
