import { asc, desc, sql, type SQL } from "drizzle-orm";
import { cases, tasks } from "@/lib/db/schema";

export type SortOrder = "asc" | "desc";

export const CASE_SORT_FIELDS = [
  "updatedAt",
  "createdAt",
  "fileNumber",
  "courtName",
  "clientName",
  "title",
  "status",
] as const;

export type CaseSortField = (typeof CASE_SORT_FIELDS)[number];

export const TASK_SORT_FIELDS = [
  "deadline",
  "createdAt",
  "updatedAt",
  "title",
  "priority",
  "status",
  "taskType",
] as const;

export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];

export function parseSortParam<T extends string>(
  sort: string | null,
  order: string | null,
  allowed: readonly T[],
  defaultField: T,
  defaultOrder: SortOrder = "desc",
): { field: T; order: SortOrder } {
  const field = allowed.includes(sort as T) ? (sort as T) : defaultField;
  const resolvedOrder: SortOrder = order === "asc" || order === "desc" ? order : defaultOrder;
  return { field, order: resolvedOrder };
}

const caseColumns = {
  updatedAt: cases.updatedAt,
  createdAt: cases.createdAt,
  fileNumber: cases.fileNumber,
  courtName: cases.courtName,
  clientName: cases.clientName,
  title: cases.title,
  status: cases.status,
} as const;

export function buildCaseOrderBy(field: CaseSortField, order: SortOrder): SQL {
  const column = caseColumns[field];
  return order === "asc" ? asc(column) : desc(column);
}

const taskColumns = {
  deadline: tasks.deadline,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
  title: tasks.title,
  status: tasks.status,
  taskType: tasks.taskType,
} as const;

const priorityRank = sql<number>`CASE ${tasks.priority}
  WHEN 'LEGAL_DEADLINE' THEN 0
  WHEN 'URGENT' THEN 1
  WHEN 'NORMAL' THEN 2
  WHEN 'LOW' THEN 3
  ELSE 4
END`;

export function buildTaskOrderBy(field: TaskSortField, order: SortOrder): SQL {
  if (field === "priority") {
    return order === "asc" ? asc(priorityRank) : desc(priorityRank);
  }

  const column = taskColumns[field as keyof typeof taskColumns];
  return order === "asc" ? asc(column) : desc(column);
}

export const CASE_SORT_OPTIONS = [
  { value: "updatedAt:desc", label: "Son güncelleme (yeniden eskiye)" },
  { value: "updatedAt:asc", label: "Son güncelleme (eskiden yeniye)" },
  { value: "createdAt:desc", label: "Oluşturma (yeni → eski)" },
  { value: "createdAt:asc", label: "Oluşturma (eski → yeni)" },
  { value: "fileNumber:asc", label: "Dosya no (A → Z)" },
  { value: "fileNumber:desc", label: "Dosya no (Z → A)" },
  { value: "courtName:asc", label: "Mahkeme (A → Z)" },
  { value: "courtName:desc", label: "Mahkeme (Z → A)" },
  { value: "clientName:asc", label: "Müvekkil (A → Z)" },
  { value: "clientName:desc", label: "Müvekkil (Z → A)" },
  { value: "title:asc", label: "Konu (A → Z)" },
  { value: "title:desc", label: "Konu (Z → A)" },
  { value: "status:asc", label: "Durum (A → Z)" },
] as const;

export const TASK_SORT_OPTIONS = [
  { value: "deadline:asc", label: "Son tarih (yakın → uzak)" },
  { value: "deadline:desc", label: "Son tarih (uzak → yakın)" },
  { value: "createdAt:desc", label: "Oluşturma (yeni → eski)" },
  { value: "createdAt:asc", label: "Oluşturma (eski → yeni)" },
  { value: "updatedAt:desc", label: "Güncelleme (yeni → eski)" },
  { value: "priority:asc", label: "Öncelik (yüksek → düşük)" },
  { value: "priority:desc", label: "Öncelik (düşük → yüksek)" },
  { value: "title:asc", label: "Başlık (A → Z)" },
  { value: "title:desc", label: "Başlık (Z → A)" },
  { value: "status:asc", label: "Durum (A → Z)" },
  { value: "taskType:asc", label: "Tür (A → Z)" },
] as const;

export function splitSortValue(value: string): { sort: string; order: SortOrder } {
  const [sort, order] = value.split(":");
  return {
    sort: sort ?? "",
    order: order === "asc" ? "asc" : "desc",
  };
}
