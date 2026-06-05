import type { FormField } from "./types";

export const commonFields = {
  occurredAt: {
    key: "occurredAt",
    label: "Olay Tarihi",
    type: "datetime" as const,
    required: true,
  },
  description: {
    key: "description",
    label: "Detay",
    type: "textarea" as const,
    placeholder: "Ek açıklama...",
  },
  outcome: {
    key: "outcome",
    label: "Sonuç",
    type: "textarea" as const,
    required: true,
  },
  nextHearingAt: {
    key: "nextHearingAt",
    label: "Sonraki Duruşma",
    type: "datetime" as const,
  },
  courtroom: {
    key: "courtroom",
    label: "Salon",
    type: "text" as const,
  },
  documentType: {
    key: "documentType",
    label: "Belge Türü",
    type: "text" as const,
    required: true,
  },
  decisionSummary: {
    key: "decisionSummary",
    label: "Karar Özeti",
    type: "textarea" as const,
    required: true,
  },
  appealDeadline: {
    key: "appealDeadline",
    label: "Kanun Yolu Süresi",
    type: "datetime" as const,
  },
  amount: {
    key: "amount",
    label: "Tutar (TL)",
    type: "text" as const,
  },
};

export function withOccurredAt(fields: FormField[]): FormField[] {
  return [commonFields.occurredAt, ...fields, commonFields.description];
}
