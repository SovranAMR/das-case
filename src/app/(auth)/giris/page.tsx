"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DasBrandLink } from "@/components/brand/das-brand-link";
import { DasAppFooter } from "@/components/layout/das-app-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

declare global {
  interface Window {
    dasApp?: {
      getMode: () => Promise<"server" | "client" | null>;
      forgotAdminPassword: () => Promise<{ ok: boolean; reason?: string }>;
    };
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  const [recoveryMsg, setRecoveryMsg] = useState<string | null>(null);

  useEffect(() => {
    // window.dasApp yalnizca Electron preload'unda bulunur; SSR/hydration
    // uyumu icin mount sonrasi tespit ediyoruz (sunucuda window yok).
    if (typeof window !== "undefined" && window.dasApp) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecoveryAvailable(true);
    }
  }, []);

  async function handleForgot() {
    setRecoveryMsg(null);
    setError(null);
    if (!window.dasApp) return;
    try {
      const res = await window.dasApp.forgotAdminPassword();
      if (res.reason === "client") {
        setRecoveryMsg(
          "Yönetici erişimi yalnızca sunucu (ana) bilgisayarda sıfırlanabilir. " +
            "Lütfen DAS Case'in sunucu modunda kurulu olduğu bilgisayarda bu işlemi yapın.",
        );
      } else if (res.ok) {
        setRecoveryMsg(
          "İşlem tamamlandı. Yeni belirlediğiniz bilgilerle giriş yapabilirsiniz.",
        );
      }
    } catch {
      setRecoveryMsg("İşlem başlatılamadı. Lütfen tekrar deneyin.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Giriş başarısız");
      setLoading(false);
      return;
    }

    const raw = searchParams.get("next") ?? "/";
    const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
    router.push(next);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md shadow-[0_1px_0_rgba(0,0,0,0.03)]">
      <p className="das-section-label mb-2">Giriş</p>
      <h1 className="das-page-title mb-1">İş Takibi</h1>
      <p className="mb-6 text-sm text-text-secondary">Hukuk bürosu operasyon paneli</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Giriş ID (e-posta)
          </label>
          <Input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="ornek@buro.local"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Şifre</label>
          <Input name="password" type="password" required autoComplete="current-password" />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </Button>
      </form>

      {recoveryAvailable && (
        <div className="mt-5 border-t border-border/60 pt-4">
          <button
            type="button"
            onClick={handleForgot}
            className="text-sm text-text-secondary underline underline-offset-2 transition-colors hover:text-text-primary"
          >
            Yönetici hesabıma erişemiyorum
          </button>
          {recoveryMsg && (
            <p className="mt-2 text-sm text-text-secondary">{recoveryMsg}</p>
          )}
        </div>
      )}
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border/60 bg-bg/80 px-6 py-5 backdrop-blur-md md:px-8">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between">
          <DasBrandLink variant="lockup" />
          <DasBrandLink variant="wordmark" className="hidden text-sm sm:inline" />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <Suspense fallback={<p className="text-text-tertiary">Yükleniyor...</p>}>
          <LoginForm />
        </Suspense>
      </main>

      <div className="mx-auto w-full max-w-[1200px]">
        <DasAppFooter />
      </div>
    </div>
  );
}
