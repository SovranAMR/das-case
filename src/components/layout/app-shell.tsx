"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { DasBrandLink } from "@/components/brand/das-brand-link";
import { Sidebar } from "./sidebar";
import { DasAppFooter } from "./das-app-footer";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { QuickAddForm } from "@/components/quick-add-form";
import { GlobalSearch } from "@/components/global-search";
import { OfficeAlertBanner } from "@/components/office-alert-banner";
import { KeyboardShortcutsModal } from "@/components/keyboard-shortcuts-modal";
import { useNotificationStream } from "@/hooks/use-notification-stream";
import type { SessionUser } from "@/lib/auth/session";

function AppShellInner({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const refreshCount = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = (await res.json()) as {
        notifications: unknown[];
        reminderCount?: number;
      };
      setNotificationCount(data.reminderCount ?? data.notifications.length);
    }
  }, []);

  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  useNotificationStream({
    onReminder: () => {
      void refreshCount();
    },
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (event.key.toLowerCase() === "n") {
        setQuickAddOpen(true);
      }
      if (event.key === "?") {
        setShortcutsOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar
        user={user}
        onQuickAdd={() => setQuickAddOpen(true)}
        notificationCount={notificationCount}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-bg/80 px-4 py-3 backdrop-blur-md md:px-6">
          <Button
            variant="ghost"
            className="md:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Menüyü aç"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <GlobalSearch />
          </div>
          <DasBrandLink variant="compact" className="shrink-0" />
        </header>
        <OfficeAlertBanner />
        <main className="flex flex-1 flex-col overflow-auto p-4 md:p-6">
          <div className="mx-auto w-full max-w-[1200px] flex-1">{children}</div>
          <DasAppFooter />
        </main>
      </div>
      <Modal open={quickAddOpen} title="Hızlı Ekle" onClose={() => setQuickAddOpen(false)}>
        <QuickAddForm
          currentUserId={user.id}
          onCancel={() => setQuickAddOpen(false)}
          onSuccess={() => {
            setQuickAddOpen(false);
            showToast("Kayıt eklendi");
            router.refresh();
          }}
        />
      </Modal>
      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return <AppShellInner user={user}>{children}</AppShellInner>;
}
