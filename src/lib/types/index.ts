export const USER_ROLES = ["ADMIN", "LAWYER", "SECRETARY"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CASE_TYPES = ["HUKUK", "ICRA", "IS", "CEZA"] as const;
export type CaseType = (typeof CASE_TYPES)[number];

export const CASE_STATUSES = ["ACTIVE", "CLOSED", "ARCHIVED"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const TIMELINE_SOURCES = ["event", "note", "system", "task"] as const;
export type TimelineSource = (typeof TIMELINE_SOURCES)[number];

export const EVENT_CATEGORIES = [
  "hearing",
  "petition",
  "decision",
  "service",
  "meeting",
  "other",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const TASK_PRIORITIES = ["LOW", "NORMAL", "URGENT", "LEGAL_DEADLINE"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_TYPES = [
  "HEARING",
  "PETITION",
  "RESPONSE_DEADLINE",
  "ENFORCEMENT",
  "GENERAL",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export type ReminderOffset = {
  days?: number;
  hours?: number;
};

export type DeadlineUrgency = "overdue" | "today" | "soon" | "normal" | "completed";

export type CompletionTiming = "early" | "on_time" | "late";

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  URGENT: "Acil",
  LEGAL_DEADLINE: "Kanuni Süre",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Bekliyor",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  HEARING: "Duruşma",
  PETITION: "Dilekçe",
  RESPONSE_DEADLINE: "Cevap Süresi",
  ENFORCEMENT: "İcra",
  GENERAL: "Genel",
};

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  HUKUK: "Hukuk",
  ICRA: "İcra",
  IS: "İş",
  CEZA: "Ceza",
};

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  ACTIVE: "Aktif",
  CLOSED: "Kapalı",
  ARCHIVED: "Arşiv",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Yönetici",
  LAWYER: "Avukat",
  SECRETARY: "Sekreter",
};

export const DEFAULT_REMINDER_OFFSETS: ReminderOffset[] = [
  { days: 7 },
  { days: 3 },
  { days: 1 },
  { hours: 2 },
];
