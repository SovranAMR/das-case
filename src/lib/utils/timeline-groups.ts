import { format, isSameDay, isSameWeek, subDays } from "date-fns";
import { tr } from "date-fns/locale";

export function getTimelineGroupLabel(date: Date, now = new Date()): string {
  if (isSameDay(date, now)) return "Bugün";
  if (isSameDay(date, subDays(now, 1))) return "Dün";
  if (isSameWeek(date, now, { weekStartsOn: 1 })) return "Bu hafta";
  return format(date, "MMMM yyyy", { locale: tr });
}

export function groupTimelineItems<T extends { occurredAt: Date | string }>(
  items: T[],
): { label: string; items: T[] }[] {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const date = new Date(item.occurredAt);
    const label = getTimelineGroupLabel(date);
    const list = groups.get(label) ?? [];
    list.push(item);
    groups.set(label, list);
  }

  return Array.from(groups.entries()).map(([label, groupItems]) => ({
    label,
    items: groupItems,
  }));
}

export function isSameTimelineDay(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}
