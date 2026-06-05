import type { CaseType } from "@/lib/types";
import { commonFields, withOccurredAt } from "./fields";
import type { CaseTemplate, EventTypeDefinition, StageDefinition } from "./types";

const hukukStages: StageDefinition[] = [
  { code: "OPENED", label: "Açıldı", order: 1 },
  { code: "PLEADING", label: "Dilekçe Süreci", order: 2 },
  { code: "PRELIMINARY", label: "Ön İnceleme", order: 3 },
  { code: "EVIDENCE", label: "Delil Toplama", order: 4 },
  { code: "HEARING", label: "Duruşma", order: 5 },
  { code: "EXPERT", label: "Bilirkişi", order: 6 },
  { code: "DECISION", label: "Karar", order: 7 },
  { code: "APPEAL", label: "Kanun Yolu", order: 8 },
  { code: "CLOSED", label: "Kapandı", order: 9 },
];

const icraStages: StageDefinition[] = [
  { code: "OPENED", label: "Açıldı", order: 1 },
  { code: "PAYMENT_ORDER", label: "Ödeme Emri", order: 2 },
  { code: "OBJECTION", label: "İtiraz", order: 3 },
  { code: "ATTACHMENT", label: "Haciz", order: 4 },
  { code: "SALE", label: "Satış", order: 5 },
  { code: "CLOSED", label: "Kapandı", order: 6 },
];

const isStages: StageDefinition[] = [
  { code: "OPENED", label: "Açıldı", order: 1 },
  { code: "MEDIATION", label: "Arabuluculuk", order: 2 },
  { code: "PLEADING", label: "Dilekçe Süreci", order: 3 },
  { code: "HEARING", label: "Duruşma", order: 4 },
  { code: "DECISION", label: "Karar", order: 5 },
  { code: "APPEAL", label: "Kanun Yolu", order: 6 },
  { code: "CLOSED", label: "Kapandı", order: 7 },
];

const cezaStages: StageDefinition[] = [
  { code: "OPENED", label: "Açıldı", order: 1 },
  { code: "INVESTIGATION", label: "Soruşturma", order: 2 },
  { code: "INDICTMENT", label: "İddianame", order: 3 },
  { code: "TRIAL", label: "Kovuşturma", order: 4 },
  { code: "DECISION", label: "Karar", order: 5 },
  { code: "APPEAL", label: "Kanun Yolu", order: 6 },
  { code: "CLOSED", label: "Kapandı", order: 7 },
];

const sharedEvents: EventTypeDefinition[] = [
  {
    code: "HEARING_HELD",
    label: "Duruşma yapıldı",
    icon: "Gavel",
    category: "hearing",
    suggestedStage: "HEARING",
    defaultTitle: "Duruşma yapıldı",
    fields: withOccurredAt([
      commonFields.outcome,
      commonFields.nextHearingAt,
      commonFields.courtroom,
    ]),
  },
  {
    code: "SERVICE_IN",
    label: "Tebliğ alındı",
    icon: "Inbox",
    category: "service",
    fields: withOccurredAt([commonFields.documentType]),
  },
  {
    code: "SERVICE_OUT",
    label: "Tebliğ verildi",
    icon: "Send",
    category: "service",
    fields: withOccurredAt([commonFields.documentType]),
  },
  {
    code: "CLIENT_MEETING",
    label: "Müvekkil görüşmesi",
    icon: "Users",
    category: "meeting",
    fields: withOccurredAt([
      { key: "subject", label: "Konu", type: "text", required: true },
    ]),
  },
  {
    code: "PHONE_CALL",
    label: "Telefon görüşmesi",
    icon: "Phone",
    category: "meeting",
    fields: withOccurredAt([
      { key: "contact", label: "Görüşülen kişi", type: "text" },
    ]),
  },
  {
    code: "FREE_NOTE",
    label: "Serbest süreç kaydı",
    icon: "FileText",
    category: "other",
    fields: withOccurredAt([
      { key: "title", label: "Başlık", type: "text", required: true },
    ]),
  },
];

export const CASE_TEMPLATES: Record<CaseType, CaseTemplate> = {
  HUKUK: {
    caseType: "HUKUK",
    label: "Hukuk",
    stages: hukukStages,
    eventTypes: [
      ...sharedEvents,
      {
        code: "LAWSUIT_FILED",
        label: "Dava dilekçesi verildi",
        icon: "FilePlus",
        category: "petition",
        suggestedStage: "PLEADING",
        defaultTitle: "Dava dilekçesi verildi",
        fields: withOccurredAt([commonFields.documentType]),
      },
      {
        code: "RESPONSE_FILED",
        label: "Cevap dilekçesi verildi",
        icon: "FileInput",
        category: "petition",
        suggestedStage: "PLEADING",
        defaultTitle: "Cevap dilekçesi verildi",
        fields: withOccurredAt([commonFields.documentType]),
      },
      {
        code: "REPLY_DUPLICATE",
        label: "Replik/Düplik",
        icon: "Files",
        category: "petition",
        suggestedStage: "PLEADING",
        fields: withOccurredAt([
          {
            key: "petitionKind",
            label: "Tür",
            type: "select",
            required: true,
            options: [
              { value: "REPLY", label: "Replik" },
              { value: "DUPLICATE", label: "Düplik" },
            ],
          },
        ]),
      },
      {
        code: "EXPERT_REPORT",
        label: "Bilirkişi raporu",
        icon: "ClipboardCheck",
        category: "other",
        suggestedStage: "EXPERT",
        fields: withOccurredAt([commonFields.outcome]),
      },
      {
        code: "INTERIM_DECISION",
        label: "Ara karar",
        icon: "Scale",
        category: "decision",
        fields: withOccurredAt([commonFields.decisionSummary]),
      },
      {
        code: "FINAL_DECISION",
        label: "Esas karar",
        icon: "Scale",
        category: "decision",
        suggestedStage: "DECISION",
        defaultTitle: "Esas karar verildi",
        fields: withOccurredAt([
          commonFields.decisionSummary,
          commonFields.appealDeadline,
        ]),
      },
      {
        code: "APPEAL_FILED",
        label: "İstinaf/Temyiz başvurusu",
        icon: "ArrowUpRight",
        category: "decision",
        suggestedStage: "APPEAL",
        fields: withOccurredAt([
          {
            key: "appealType",
            label: "Kanun yolu",
            type: "select",
            required: true,
            options: [
              { value: "ISTINAF", label: "İstinaf" },
              { value: "TEMYIZ", label: "Temyiz" },
            ],
          },
        ]),
      },
    ],
  },
  ICRA: {
    caseType: "ICRA",
    label: "İcra",
    stages: icraStages,
    eventTypes: [
      ...sharedEvents.filter((e) => e.code !== "HEARING_HELD"),
      {
        code: "PAYMENT_ORDER",
        label: "Ödeme emri çıktı",
        icon: "Receipt",
        category: "petition",
        suggestedStage: "PAYMENT_ORDER",
        defaultTitle: "Ödeme emri çıktı",
        fields: withOccurredAt([commonFields.amount]),
      },
      {
        code: "OBJECTION_FILED",
        label: "İtiraz edildi",
        icon: "AlertTriangle",
        category: "petition",
        suggestedStage: "OBJECTION",
        fields: withOccurredAt([commonFields.outcome]),
      },
      {
        code: "ATTACHMENT_ORDER",
        label: "Haciz işlemi",
        icon: "Lock",
        category: "other",
        suggestedStage: "ATTACHMENT",
        fields: withOccurredAt([
          { key: "asset", label: "Haciz konusu", type: "text", required: true },
        ]),
      },
      {
        code: "SALE_HELD",
        label: "Satış işlemi",
        icon: "BadgeDollarSign",
        category: "other",
        suggestedStage: "SALE",
        fields: withOccurredAt([commonFields.amount, commonFields.outcome]),
      },
      {
        code: "PAYMENT_RECEIVED",
        label: "Ödeme alındı",
        icon: "Banknote",
        category: "other",
        fields: withOccurredAt([commonFields.amount]),
      },
    ],
  },
  IS: {
    caseType: "IS",
    label: "İş",
    stages: isStages,
    eventTypes: [
      ...sharedEvents,
      {
        code: "MEDIATION_SESSION",
        label: "Arabuluculuk oturumu",
        icon: "Handshake",
        category: "meeting",
        suggestedStage: "MEDIATION",
        fields: withOccurredAt([commonFields.outcome]),
      },
      {
        code: "LAWSUIT_FILED",
        label: "Dava dilekçesi verildi",
        icon: "FilePlus",
        category: "petition",
        suggestedStage: "PLEADING",
        fields: withOccurredAt([commonFields.documentType]),
      },
      {
        code: "RESPONSE_FILED",
        label: "Cevap dilekçesi verildi",
        icon: "FileInput",
        category: "petition",
        suggestedStage: "PLEADING",
        fields: withOccurredAt([commonFields.documentType]),
      },
      {
        code: "FINAL_DECISION",
        label: "Karar verildi",
        icon: "Scale",
        category: "decision",
        suggestedStage: "DECISION",
        fields: withOccurredAt([
          commonFields.decisionSummary,
          commonFields.appealDeadline,
        ]),
      },
      {
        code: "APPEAL_FILED",
        label: "İstinaf/Temyiz başvurusu",
        icon: "ArrowUpRight",
        category: "decision",
        suggestedStage: "APPEAL",
        fields: withOccurredAt([
          {
            key: "appealType",
            label: "Kanun yolu",
            type: "select",
            required: true,
            options: [
              { value: "ISTINAF", label: "İstinaf" },
              { value: "TEMYIZ", label: "Temyiz" },
            ],
          },
        ]),
      },
    ],
  },
  CEZA: {
    caseType: "CEZA",
    label: "Ceza",
    stages: cezaStages,
    eventTypes: [
      ...sharedEvents,
      {
        code: "INVESTIGATION_STEP",
        label: "Soruşturma işlemi",
        icon: "Search",
        category: "other",
        suggestedStage: "INVESTIGATION",
        fields: withOccurredAt([
          { key: "step", label: "İşlem", type: "text", required: true },
        ]),
      },
      {
        code: "INDICTMENT_ISSUED",
        label: "İddianame düzenlendi",
        icon: "FileWarning",
        category: "petition",
        suggestedStage: "INDICTMENT",
        fields: withOccurredAt([commonFields.documentType]),
      },
      {
        code: "FINAL_DECISION",
        label: "Karar verildi",
        icon: "Scale",
        category: "decision",
        suggestedStage: "DECISION",
        fields: withOccurredAt([
          commonFields.decisionSummary,
          commonFields.appealDeadline,
        ]),
      },
      {
        code: "APPEAL_FILED",
        label: "İstinaf/Temyiz başvurusu",
        icon: "ArrowUpRight",
        category: "decision",
        suggestedStage: "APPEAL",
        fields: withOccurredAt([
          {
            key: "appealType",
            label: "Kanun yolu",
            type: "select",
            required: true,
            options: [
              { value: "ISTINAF", label: "İstinaf" },
              { value: "TEMYIZ", label: "Temyiz" },
            ],
          },
        ]),
      },
    ],
  },
};

export function getCaseTemplate(caseType: CaseType): CaseTemplate {
  return CASE_TEMPLATES[caseType];
}

export function getStageLabel(caseType: CaseType, stageCode: string): string {
  const stage = CASE_TEMPLATES[caseType].stages.find((s) => s.code === stageCode);
  return stage?.label ?? stageCode;
}

export function getEventTypeDefinition(
  caseType: CaseType,
  eventType: string,
): EventTypeDefinition | undefined {
  return CASE_TEMPLATES[caseType].eventTypes.find((e) => e.code === eventType);
}

export function isValidEventType(caseType: CaseType, eventType: string): boolean {
  return Boolean(getEventTypeDefinition(caseType, eventType));
}

export function isValidStage(caseType: CaseType, stageCode: string): boolean {
  return CASE_TEMPLATES[caseType].stages.some((s) => s.code === stageCode);
}

export function getAllTemplates(): CaseTemplate[] {
  return Object.values(CASE_TEMPLATES);
}
