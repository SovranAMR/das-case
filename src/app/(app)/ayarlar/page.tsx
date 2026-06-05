"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { ActivityAuditPanel } from "@/components/activity-audit-panel";
import { AdminOnboardingChecklist } from "@/components/admin-onboarding-checklist";
import { UserManagementPanel } from "@/components/user-management-panel";
import { WeeklyReportCard } from "@/components/weekly-report-card";
import type { UserRole } from "@/lib/types";

type Me = {
  id: string;
  role: UserRole;
};

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [backupStale, setBackupStale] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setMe((data as { user: Me }).user));
    void fetch("/api/settings/backup")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { lastBackupAt: string | null } | null) => {
        if (!data?.lastBackupAt) {
          setBackupStale(true);
          return;
        }
        const age = Date.now() - new Date(data.lastBackupAt).getTime();
        setBackupStale(age > 7 * 24 * 60 * 60 * 1000);
      });
  }, []);

  async function handleBackup() {
    setError(null);
    setSuccess(null);
    setBackupLoading(true);
    const res = await fetch("/api/backup");
    setBackupLoading(false);
    if (!res.ok) {
      setError("Yedek alınamadı");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `is-takibi-backup-${new Date().toISOString().slice(0, 10)}.db`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess("Yedek indirildi");
    setBackupStale(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader label="Sistem" title="Ayarlar" description="Kullanıcı ve sistem yönetimi" />

      {me?.role === "ADMIN" && <AdminOnboardingChecklist />}

      {me?.role === "ADMIN" && <WeeklyReportCard />}

      {me?.role === "ADMIN" && me.id && <UserManagementPanel currentUserId={me.id} />}

      {me?.role === "ADMIN" && <ActivityAuditPanel />}

      {me?.role === "ADMIN" && (
        <Card>
          {backupStale && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Son yedek 7 günden eski veya hiç alınmamış. Düzenli yedek al.
            </div>
          )}
          <SectionTitle className="mb-4">Veritabanı Yedeği</SectionTitle>
          <p className="mb-3 text-sm text-muted">
            SQLite veritabanını indir. Düzenli yedek almayı unutma.
          </p>
          <Button onClick={() => void handleBackup()} disabled={backupLoading}>
            {backupLoading ? "Hazırlanıyor..." : "Yedek İndir"}
          </Button>
        </Card>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
    </div>
  );
}
