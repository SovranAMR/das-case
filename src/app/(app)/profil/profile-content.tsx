"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PasswordChangePanel } from "@/components/password-change-panel";
import { PageHeader } from "@/components/ui/page-header";

function ProfileInner() {
  const searchParams = useSearchParams();
  const required = searchParams.get("changePassword") === "required";

  return (
    <div className="space-y-6">
      <PageHeader label="Hesap" title="Profil" description="Hesap ve güvenlik ayarların" />
      {required && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">İlk giriş — şifre değiştir</p>
          <p className="mt-1">Güvenlik için yeni bir şifre belirlemeden diğer sayfalara geçemezsin.</p>
        </div>
      )}
      <PasswordChangePanel />
    </div>
  );
}

export function ProfileContent() {
  return (
    <Suspense fallback={<p className="text-muted">Yükleniyor...</p>}>
      <ProfileInner />
    </Suspense>
  );
}
