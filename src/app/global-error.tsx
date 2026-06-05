"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          fontFamily: "Inter, system-ui, sans-serif",
          background: "#F7F4EF",
          color: "#151515",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 480, padding: 32 }}>
          <p
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 12,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#5c5c5c",
              marginBottom: 8,
            }}
          >
            Kritik Hata
          </p>
          <h1
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 32,
              lineHeight: 1.1,
              marginBottom: 16,
            }}
          >
            Uygulama yüklenemedi
          </h1>
          <p style={{ color: "#5a5a5a", lineHeight: 1.6, marginBottom: 24 }}>
            Beklenmeyen bir hata oluştu. Sayfayı yenilemeyi dene.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#151515",
              color: "#F7F4EF",
              border: "none",
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  );
}
