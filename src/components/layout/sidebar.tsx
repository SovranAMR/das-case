"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  CalendarDays,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  User,
  X,
} from "lucide-react";
import { DasBrandLink } from "@/components/brand/das-brand-link";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth/session";
import { ROLE_NAV_PATHS } from "@/lib/auth/permissions";
import { ROLE_LABELS } from "@/lib/types";

const navItems = [
  { href: "/", label: "Özet", icon: LayoutDashboard },
  { href: "/bugun", label: "Bugün", icon: CalendarDays },
  { href: "/dosyalar", label: "Dosyalar", icon: FolderOpen },
  { href: "/isler", label: "İşler", icon: ClipboardList },
  { href: "/takvim", label: "Takvim", icon: Calendar },
  { href: "/bildirimler", label: "Bildirimler", icon: Bell },
  { href: "/profil", label: "Profil", icon: User },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

export function Sidebar({
  user,
  onQuickAdd,
  notificationCount = 0,
  mobileOpen = false,
  onMobileClose,
}: {
  user: SessionUser;
  onQuickAdd?: () => void;
  notificationCount?: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const allowedPaths = ROLE_NAV_PATHS[user.role];
  const visibleNav = navItems.filter((item) => allowedPaths.includes(item.href));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/giris");
    router.refresh();
  }

  function handleNavClick() {
    onMobileClose?.();
  }

  const sidebarContent = (
    <>
      <div className="border-b border-border/60 px-5 py-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-3">
            <DasBrandLink variant="lockup" markClassName="h-6" className="text-text-primary" />
            <div>
              <p className="das-section-label">Uygulama</p>
              <h1 className="font-serif text-xl tracking-tight text-text-primary">İş Takibi</h1>
              <p className="text-xs text-text-tertiary">Hukuk bürosu</p>
            </div>
          </div>
          {onMobileClose && (
            <Button variant="ghost" onClick={onMobileClose} aria-label="Menüyü kapat" className="md:hidden">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {visibleNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-300",
                active
                  ? "bg-text-primary text-bg"
                  : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/bildirimler" && notificationCount > 0 && (
                <span className="rounded border border-border bg-bg px-2 py-0.5 font-mono text-[10px]">
                  {notificationCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-border/60 p-4">
        {onQuickAdd && (
          <Button className="w-full" onClick={onQuickAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Hızlı Ekle
          </Button>
        )}
        <div className="rounded border border-border bg-bg-surface/80 p-3">
          <p className="text-sm font-medium text-text-primary">{user.name}</p>
          <p className="text-xs text-text-tertiary">{ROLE_LABELS[user.role]}</p>
        </div>
        <Button variant="secondary" className="w-full" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Çıkış
        </Button>
        <div className="pt-1 text-center">
          <DasBrandLink variant="wordmark" className="text-[11px]" />
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-bg/90 backdrop-blur-sm md:flex">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-text-primary/25 backdrop-blur-[2px]"
            onClick={onMobileClose}
            aria-label="Menüyü kapat"
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-bg shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
