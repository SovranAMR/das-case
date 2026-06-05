import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { activeWorkTaskFilter } from "@/lib/api/task-filters";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { CalendarView } from "@/components/calendar-view";

export default async function CalendarPage() {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      deadline: tasks.deadline,
      status: tasks.status,
    })
    .from(tasks)
    .where(activeWorkTaskFilter());

  return (
    <div className="space-y-6">
      <PageHeader label="Planlama" title="Takvim" description="Deadline takvimi" />
      <Card>
        <CalendarView
          tasks={rows.map((r) => ({
            ...r,
            deadline: r.deadline.toISOString(),
          }))}
        />
      </Card>
    </div>
  );
}
