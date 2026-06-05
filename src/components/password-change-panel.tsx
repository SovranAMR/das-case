"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/page-header";
import { FormLabel } from "@/components/ui/form-label";
import { Input } from "@/components/ui/input";

export function PasswordChangePanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setError("Yeni şifreler eşleşmiyor");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Şifre değiştirilemedi");
      setLoading(false);
      return;
    }

    event.currentTarget.reset();
    setSuccess("Şifren güncellendi");
    setLoading(false);
  }

  return (
    <Card>
      <SectionTitle className="mb-1">Şifre Değiştir</SectionTitle>
      <p className="mb-4 text-sm text-muted">Mevcut şifreni girerek yeni şifre belirle.</p>
      <form onSubmit={handleSubmit} className="max-w-md space-y-3">
        <div>
          <FormLabel required>Mevcut şifre</FormLabel>
          <Input name="currentPassword" type="password" required autoComplete="current-password" />
        </div>
        <div>
          <FormLabel required>Yeni şifre</FormLabel>
          <Input name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        <div>
          <FormLabel required>Yeni şifre (tekrar)</FormLabel>
          <Input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Kaydediliyor..." : "Şifreyi Güncelle"}
        </Button>
      </form>
    </Card>
  );
}
