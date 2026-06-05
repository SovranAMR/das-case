import { formatDateTime } from "@/lib/utils/dates";

type Activity = {
  id: string;
  action: string;
  details: string | null;
  userName: string;
  createdAt: Date | string;
};

const actionLabels: Record<string, string> = {
  CASE_CREATED: "Dosya oluşturuldu",
  CASE_UPDATED: "Dosya güncellendi",
  CASE_DELETED: "Dosya silindi",
  TASK_CREATED: "İş oluşturuldu",
  TASK_UPDATED: "İş güncellendi",
  TASK_STATUS_CHANGED: "Durum değişti",
  TASK_COMPLETED: "İş tamamlandı",
  TASK_DELETED: "İş silindi",
  NOTE_ADDED: "Not eklendi",
  STAGE_CHANGED: "Aşama değişti",
  CASE_EVENT_ADDED: "Süreç olayı eklendi",
  CASE_EVENT_UPDATED: "Süreç olayı güncellendi",
  CASE_EVENT_DELETED: "Süreç olayı silindi",
  CASE_NOTE_ADDED: "Not eklendi",
  CASE_NOTE_UPDATED: "Not güncellendi",
  CASE_NOTE_DELETED: "Not silindi",
};

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted">Henüz aktivite yok.</p>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="border-l-2 border-primary/30 pl-4">
          <p className="text-sm font-medium">
            {actionLabels[activity.action] ?? activity.action}
          </p>
          {activity.details && (
            <p className="mt-1 text-sm text-text-secondary">{activity.details}</p>
          )}
          <p className="mt-1 text-xs text-muted">
            {activity.userName} — {formatDateTime(new Date(activity.createdAt))}
          </p>
        </div>
      ))}
    </div>
  );
}
