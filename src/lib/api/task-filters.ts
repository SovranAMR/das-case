import { and, eq, isNotNull, isNull, ne, notInArray } from "drizzle-orm";
import { tasks } from "@/lib/db/schema";
import type { TaskListView } from "@/lib/utils/task-list-view";

export function buildTaskViewFilter(
  view: TaskListView | null | undefined,
  options?: { forCaseDetail?: boolean },
) {
  if (options?.forCaseDetail) {
    return isNull(tasks.archivedAt);
  }

  const resolved = view ?? "active";

  if (resolved === "archived") {
    return isNotNull(tasks.archivedAt);
  }

  if (resolved === "completed") {
    return and(isNull(tasks.archivedAt), eq(tasks.status, "COMPLETED"));
  }

  return and(
    isNull(tasks.archivedAt),
    notInArray(tasks.status, ["COMPLETED", "CANCELLED"]),
  );
}

/** Aktif çalışma listeleri: arşivlenmemiş açık işler */
export function activeWorkTaskFilter() {
  return and(
    isNull(tasks.deletedAt),
    isNull(tasks.archivedAt),
    notInArray(tasks.status, ["COMPLETED", "CANCELLED"]),
  );
}
