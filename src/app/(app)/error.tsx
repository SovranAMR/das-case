"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-lg text-center">
        <p className="das-section-label mb-2">Hata</p>
        <h1 className="das-page-title mb-4">Bir sorun oluştu</h1>
        <p className="mb-6 text-text-secondary">
          Sayfa yüklenirken beklenmeyen bir hata oluştu. Tekrar denemek
          sorunu çözebilir.
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>Tekrar dene</Button>
          <Button variant="secondary" onClick={() => window.location.replace("/")}>
            Ana sayfaya dön
          </Button>
        </div>
        {error.digest && (
          <p className="mt-4 font-mono text-xs text-text-tertiary">
            Hata kodu: {error.digest}
          </p>
        )}
      </Card>
    </div>
  );
}
