"use client";

import {
  ArrowUpRight,
  Banknote,
  ClipboardCheck,
  FilePlus,
  FileText,
  Gavel,
  Handshake,
  Inbox,
  Lock,
  Phone,
  Receipt,
  Scale,
  Search,
  Send,
  Users,
} from "lucide-react";
import type { TimelineItem } from "@/lib/services/timeline";
import type { EventCategory, TimelineSource } from "@/lib/types";
import { groupTimelineItems } from "@/lib/utils/timeline-groups";
import { formatDateTime } from "@/lib/utils/dates";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Gavel,
  FilePlus,
  FileText,
  Scale,
  Inbox,
  Send,
  Users,
  Phone,
  ClipboardCheck,
  ArrowUpRight,
  Receipt,
  Lock,
  Banknote,
  Handshake,
  Search,
};

const sourceStyles: Record<TimelineSource, string> = {
  event: "border-l-blue-500",
  note: "border-l-amber-500",
  system: "border-l-slate-400",
  task: "border-l-green-500",
};

const categoryFilters: { value: string; label: string }[] = [
  { value: "", label: "Tümü" },
  { value: "hearing", label: "Duruşmalar" },
  { value: "petition", label: "Dilekçeler" },
  { value: "decision", label: "Kararlar" },
  { value: "service", label: "Tebliğler" },
  { value: "meeting", label: "Görüşmeler" },
  { value: "note", label: "Notlar" },
  { value: "system", label: "Sistem" },
];

export function CaseTimeline({
  items,
  eventIcons,
  filter,
  onFilterChange,
  onEditEvent,
  onDeleteEvent,
}: {
  items: TimelineItem[];
  eventIcons: Record<string, string>;
  filter: string;
  onFilterChange: (value: string) => void;
  onEditEvent?: (id: string) => void;
  onDeleteEvent?: (id: string) => void;
}) {
  const filtered = items.filter((item) => {
    if (!filter) return true;
    if (filter === "note") return item.source === "note";
    if (filter === "system") return item.source === "system";
    return item.category === (filter as EventCategory);
  });

  const groups = groupTimelineItems(filtered);

  if (filtered.length === 0) {
    return (
      <div>
        <FilterBar filter={filter} onFilterChange={onFilterChange} />
        <p className="mt-4 text-sm text-muted">Henüz süreç kaydı yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar filter={filter} onFilterChange={onFilterChange} />
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="mb-3 text-sm font-semibold text-muted">{group.label}</h3>
          <div className="space-y-3">
            {group.items.map((item) => {
              const Icon = iconMap[eventIcons[item.eventType ?? ""] ?? "FileText"] ?? FileText;
              return (
                <div
                  key={item.id}
                  className={`rounded-lg border border-border border-l-4 bg-bg-surface p-4 ${sourceStyles[item.source]}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg border border-border bg-bg-elevated p-2">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.title}</p>
                      {item.description && (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">
                          {item.description}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted">
                        {item.userName} — {formatDateTime(new Date(item.occurredAt))}
                      </p>
                      {item.source === "event" && (onEditEvent || onDeleteEvent) && (
                        <div className="mt-2 flex gap-2">
                          {onEditEvent && (
                            <Button
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => onEditEvent(item.referenceId)}
                            >
                              Düzenle
                            </Button>
                          )}
                          {onDeleteEvent && (
                            <Button
                              variant="ghost"
                              className="h-7 px-2 text-xs text-red-600"
                              onClick={() => onDeleteEvent(item.referenceId)}
                            >
                              Sil
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterBar({
  filter,
  onFilterChange,
}: {
  filter: string;
  onFilterChange: (value: string) => void;
}) {
  return (
    <Select className="print:hidden" value={filter} onChange={(e) => onFilterChange(e.target.value)}>
      {categoryFilters.map((f) => (
        <option key={f.value} value={f.value}>
          {f.label}
        </option>
      ))}
    </Select>
  );
}
