"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form-label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toDateTimeLocalValue } from "@/lib/utils/dates";
import { CASE_TYPE_LABELS, type CaseStatus, type CaseType } from "@/lib/types";

const COURTS = [
  "Bursa 1. Asliye Hukuk Mahkemesi",
  "Bursa 2. Asliye Hukuk Mahkemesi",
  "Bursa İş Mahkemesi",
  "Bursa İcra Dairesi",
  "Bursa Sulh Hukuk Mahkemesi",
  "Bursa Aile Mahkemesi",
];

export type CaseFormData = {
  courtName: string;
  fileNumber: string;
  clientName: string;
  title: string;
  caseType: CaseType;
  opposingParty?: string | null;
  judgeName?: string | null;
  summary?: string | null;
  openedAt?: string | null;
  nextHearingAt?: string | null;
  status?: CaseStatus;
};

export function CaseForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<CaseFormData> & {
    openedAt?: Date | string | null;
    nextHearingAt?: Date | string | null;
  };
  onSubmit: (data: CaseFormData) => Promise<void>;
  onCancel?: () => void;
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
        courtName: String(form.get("courtName")),
        fileNumber: String(form.get("fileNumber")),
        clientName: String(form.get("clientName")),
        title: String(form.get("title")),
        caseType: form.get("caseType") as CaseType,
        opposingParty: String(form.get("opposingParty") || "") || null,
        judgeName: String(form.get("judgeName") || "") || null,
        summary: String(form.get("summary") || "") || null,
        openedAt: String(form.get("openedAt") || "") || null,
        nextHearingAt: String(form.get("nextHearingAt") || "") || null,
        status: (form.get("status") as CaseStatus) || "ACTIVE",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  }

  const [openedDefault, setOpenedDefault] = useState("");
  const [hearingDefault, setHearingDefault] = useState("");

  useEffect(() => {
    setOpenedDefault(
      initial?.openedAt
        ? toDateTimeLocalValue(new Date(initial.openedAt))
        : toDateTimeLocalValue(new Date()),
    );
    setHearingDefault(
      initial?.nextHearingAt ? toDateTimeLocalValue(new Date(initial.nextHearingAt)) : "",
    );
  }, [initial?.openedAt, initial?.nextHearingAt]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <FormLabel required>Dosya Türü</FormLabel>
        <Select name="caseType" defaultValue={initial?.caseType ?? "HUKUK"} required>
          {Object.entries(CASE_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <FormLabel required>Mahkeme</FormLabel>
        <Input name="courtName" list="courts" defaultValue={initial?.courtName} required />
        <datalist id="courts">
          {COURTS.map((court) => (
            <option key={court} value={court} />
          ))}
        </datalist>
      </div>
      <div>
        <FormLabel required>Dosya No</FormLabel>
        <Input name="fileNumber" defaultValue={initial?.fileNumber} placeholder="2024/1234 Esas" required />
      </div>
      <div>
        <FormLabel required>Müvekkil</FormLabel>
        <Input name="clientName" defaultValue={initial?.clientName} required />
      </div>
      <div>
        <FormLabel>Karşı Taraf</FormLabel>
        <Input name="opposingParty" defaultValue={initial?.opposingParty ?? ""} />
      </div>
      <div>
        <FormLabel required>Konu</FormLabel>
        <Input name="title" defaultValue={initial?.title} required />
      </div>
      <div>
        <FormLabel>Hakim</FormLabel>
        <Input name="judgeName" defaultValue={initial?.judgeName ?? ""} />
      </div>
      <div>
        <FormLabel>Özet</FormLabel>
        <Textarea name="summary" defaultValue={initial?.summary ?? ""} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FormLabel>Açılış Tarihi</FormLabel>
          <Input
            name="openedAt"
            type="datetime-local"
            value={openedDefault}
            onChange={(e) => setOpenedDefault(e.target.value)}
            disabled={!openedDefault}
          />
        </div>
        <div>
          <FormLabel>Sonraki Duruşma</FormLabel>
          <Input
            name="nextHearingAt"
            type="datetime-local"
            value={hearingDefault}
            onChange={(e) => setHearingDefault(e.target.value)}
          />
        </div>
      </div>
      {initial?.status && (
        <div>
          <FormLabel>Durum</FormLabel>
          <Select name="status" defaultValue={initial.status}>
            <option value="ACTIVE">Aktif</option>
            <option value="CLOSED">Kapalı</option>
            <option value="ARCHIVED">Arşiv</option>
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
