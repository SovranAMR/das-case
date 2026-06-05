import { describe, expect, it } from "vitest";
import {
  canArchiveTask,
  isTaskInActiveWork,
  matchesTaskListView,
} from "../src/lib/utils/task-list-view";

describe("task list view", () => {
  it("aktif görünümde tamamlanan ve arşivlenmiş işleri dışlar", () => {
    expect(
      matchesTaskListView({ status: "PENDING", archivedAt: null }, "active"),
    ).toBe(true);
    expect(
      matchesTaskListView({ status: "COMPLETED", archivedAt: null }, "active"),
    ).toBe(false);
    expect(
      matchesTaskListView(
        { status: "COMPLETED", archivedAt: new Date() },
        "active",
      ),
    ).toBe(false);
  });

  it("tamamlanan görünümde yalnızca arşivlenmemiş completed işleri gösterir", () => {
    expect(
      matchesTaskListView({ status: "COMPLETED", archivedAt: null }, "completed"),
    ).toBe(true);
    expect(
      matchesTaskListView({ status: "PENDING", archivedAt: null }, "completed"),
    ).toBe(false);
  });

  it("arşiv görünümünde yalnızca archivedAt dolu kayıtları gösterir", () => {
    expect(
      matchesTaskListView(
        { status: "COMPLETED", archivedAt: new Date() },
        "archived",
      ),
    ).toBe(true);
    expect(
      matchesTaskListView({ status: "COMPLETED", archivedAt: null }, "archived"),
    ).toBe(false);
  });

  it("canArchiveTask yalnızca tamamlanan/iptal edilen açık arşiv kayıtlarında true", () => {
    expect(
      canArchiveTask({ status: "COMPLETED", archivedAt: null }),
    ).toBe(true);
    expect(
      canArchiveTask({ status: "CANCELLED", archivedAt: null }),
    ).toBe(true);
    expect(
      canArchiveTask({ status: "PENDING", archivedAt: null }),
    ).toBe(false);
    expect(
      canArchiveTask({ status: "COMPLETED", archivedAt: new Date() }),
    ).toBe(false);
  });

  it("isTaskInActiveWork aktif işleri doğrular", () => {
    expect(
      isTaskInActiveWork({ status: "IN_PROGRESS", archivedAt: null }),
    ).toBe(true);
    expect(
      isTaskInActiveWork({ status: "COMPLETED", archivedAt: null }),
    ).toBe(false);
  });
});
