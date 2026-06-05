"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PriorityBadge } from "@/components/ui/badge";
import { ListError } from "@/components/ui/list-error";
import { useToast } from "@/components/ui/toast";
import { PRIORITY_LABELS, type TaskPriority } from "@/lib/types";
import { formatDateTime } from "@/lib/utils/dates";
import { useNotificationStream } from "@/hooks/use-notification-stream";

type ReminderNotification = {
  type: "reminder";
  id: string;
  taskId: string;
  taskTitle: string;
  deadline: string;
  remindAt: string;
  priority: TaskPriority;
};

type EscalationNotification = {
  type: "escalation";
  id: string;
  taskId: string;
  taskTitle: string;
  deadline: string;
  daysOverdue: number;
};

type Notification = ReminderNotification | EscalationNotification;

export default function NotificationsPage() {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifyPermission(Notification.permission);
    } else {
      setNotifyPermission("unsupported");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = (await res.json()) as { notifications: Notification[] };
      setNotifications(data.notifications);
    } else {
      setError("Bildirimler yüklenemedi");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useNotificationStream({
    onReminder: () => {
      void load();
    },
  });

  async function dismiss(id: string) {
    const res = await fetch(`/api/notifications/${id}/dismiss`, { method: "PATCH" });
    if (!res.ok) {
      showToast("Bildirim kapatılamadı", "error");
      return;
    }
    showToast("Bildirim okundu");
    await load();
  }

  async function requestBrowserPermission() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setNotifyPermission(result);
    if (result === "granted") {
      showToast("Tarayıcı bildirim izni verildi");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        label="Uyarılar"
        title="Bildirimler"
        description="Hatırlatıcılar ve son tarih uyarıları"
      />

      {notifyPermission !== "granted" && notifyPermission !== "unsupported" && (
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Tarayıcı bildirimleri kapalı</p>
          <p className="mt-1">
            Uygulama açıkken hatırlatıcılar burada görünür. Masaüstü uyarısı için izin ver.
          </p>
          <Button className="mt-3" variant="secondary" onClick={() => void requestBrowserPermission()}>
            Bildirim izni iste
          </Button>
        </Card>
      )}

      {loading ? (
        <p className="text-muted">Yükleniyor...</p>
      ) : error ? (
        <ListError message={error} onRetry={() => void load()} />
      ) : notifications.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-muted">Okunmamış bildirim yok.</p>
          <Link
            href="/isler"
            className="inline-flex items-center justify-center border border-border bg-bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-text-primary hover:bg-text-primary hover:text-bg"
          >
            İşlere git
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link
                  href={`/isler?highlight=${n.taskId}`}
                  className="font-semibold hover:underline"
                >
                  {n.taskTitle}
                </Link>
                <p className="text-sm text-muted">
                  Son tarih: {formatDateTime(new Date(n.deadline))}
                </p>
                {n.type === "reminder" ? (
                  <>
                    <p className="text-xs text-muted">
                      Hatırlatma: {formatDateTime(new Date(n.remindAt))}
                    </p>
                    <div className="mt-2">
                      <PriorityBadge priority={n.priority} label={PRIORITY_LABELS[n.priority]} />
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-xs font-medium text-red-700">
                    Yönetici uyarısı — {n.daysOverdue} gün gecikmiş
                  </p>
                )}
              </div>
              <Button variant="secondary" onClick={() => void dismiss(n.id)}>
                {n.type === "escalation" ? "Gizle" : "Okundu"}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
