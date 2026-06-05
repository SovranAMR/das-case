import type { TaskStatus } from "@/lib/types";

export type TaskListView = "active" | "completed" | "archived";

export type TaskListRow = {
  status: TaskStatus;
  archivedAt: Date | null;
};

export function matchesTaskListView(task: TaskListRow, view: TaskListView): boolean {
  if (view === "archived") {
    return task.archivedAt !== null;
  }
  if (task.archivedAt !== null) {
    return false;
  }
  if (view === "completed") {
    return task.status === "COMPLETED";
  }
  return task.status !== "COMPLETED" && task.status !== "CANCELLED";
}

export function canArchiveTask(task: TaskListRow): boolean {
  return (
    task.archivedAt === null &&
    (task.status === "COMPLETED" || task.status === "CANCELLED")
  );
}

export function isTaskInActiveWork(task: TaskListRow): boolean {
  return matchesTaskListView(task, "active");
}
