"use client";

import { useEffect, useRef } from "react";

type ReminderPayload = {
  type: "reminder";
  reminderId: string;
  taskId: string;
  taskTitle: string;
  deadline: string;
  remindAt: string;
};

const MAX_RETRY_MS = 30_000;
const BASE_RETRY_MS = 1_000;

export function useNotificationStream({
  onReminder,
}: {
  onReminder: (event: ReminderPayload) => void;
}) {
  const callbackRef = useRef(onReminder);
  callbackRef.current = onReminder;

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }

    let retryCount = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let source: EventSource | null = null;
    let closed = false;

    function connect() {
      if (closed) return;
      source = new EventSource("/api/notifications/stream");

      source.onopen = () => {
        retryCount = 0;
      };

      source.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data) as Record<string, unknown>;
          if (data.type !== "reminder") return;

          const event: ReminderPayload = {
            type: "reminder",
            reminderId: String(data.reminderId),
            taskId: String(data.taskId),
            taskTitle: String(data.taskTitle),
            deadline: String(data.deadline),
            remindAt: String(data.remindAt),
          };

          callbackRef.current(event);

          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("İş Hatırlatıcısı", {
              body: `${event.taskTitle} — son tarih yaklaşıyor`,
              tag: event.reminderId,
            });
          }
        } catch {
          /* malformed SSE event */
        }
      };

      source.onerror = () => {
        source?.close();
        if (closed) return;
        const delay = Math.min(BASE_RETRY_MS * 2 ** retryCount, MAX_RETRY_MS);
        retryCount += 1;
        timer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      closed = true;
      source?.close();
      if (timer) clearTimeout(timer);
    };
  }, []);
}
