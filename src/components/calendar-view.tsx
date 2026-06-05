"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/page-header";
import { formatDateTime, getDeadlineUrgency } from "@/lib/utils/dates";
import type { TaskStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

type CalendarTask = {
  id: string;
  title: string;
  deadline: string | Date;
  status: TaskStatus;
};

export function CalendarView({ tasks }: { tasks: CalendarTask[] }) {
  const [current, setCurrent] = useState(new Date());
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setToday(new Date());
  }, []);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(current), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [current]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    for (const task of tasks) {
      const key = format(new Date(task.deadline), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          aria-label="Önceki ay"
          onClick={() => setCurrent(addMonths(current, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <SectionTitle>
          {format(current, "MMMM yyyy", { locale: tr })}
        </SectionTitle>
        <Button
          variant="ghost"
          aria-label="Sonraki ay"
          onClick={() => setCurrent(addMonths(current, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted">
        {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDay.get(key) ?? [];
          return (
            <div
              key={key}
              className={`min-h-24 rounded-lg border p-2 ${
                isSameMonth(day, current) ? "bg-bg-surface" : "bg-bg-elevated text-muted"
              } ${today && isSameDay(day, today) ? "border-primary" : "border-border"}`}
            >
              <div className="text-xs font-medium">{format(day, "d")}</div>
              <div className="mt-1 space-y-1">
                {dayTasks.slice(0, 3).map((task) => {
                  const urgency = getDeadlineUrgency(
                    new Date(task.deadline),
                    task.status,
                  );
                  return (
                    <Link
                      key={task.id}
                      href={`/isler?highlight=${task.id}`}
                      className={`block truncate rounded px-1 py-0.5 text-[10px] hover:underline ${
                        urgency === "overdue"
                          ? "bg-red-100 text-red-800"
                          : urgency === "today"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-blue-50 text-blue-800"
                      }`}
                      title={`${task.title} — ${formatDateTime(new Date(task.deadline))} (${STATUS_LABELS[task.status]})`}
                    >
                      {task.title}
                    </Link>
                  );
                })}
                {dayTasks.length > 3 && (
                  <div className="text-[10px] text-muted">+{dayTasks.length - 3} daha</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
