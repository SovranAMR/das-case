"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils/dates";
import { STATUS_LABELS, type TaskStatus } from "@/lib/types";

type SearchCase = {
  id: string;
  fileNumber: string;
  courtName: string;
  clientName: string;
  title: string;
};

type SearchTask = {
  id: string;
  title: string;
  deadline: string;
  status: TaskStatus;
  caseFileNumber: string | null;
};

type SearchResult = {
  cases: SearchCase[];
  tasks: SearchTask[];
};

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = (await res.json()) as SearchResult;
        setResult(data);
        setOpen(true);
      }
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const hasResults = (result?.cases.length ?? 0) + (result?.tasks.length ?? 0) > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
        <Input
          className="pl-9 pr-9"
          placeholder="Dosya no, müvekkil, iş ara..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            if (q.trim().length >= 2) setOpen(true);
          }}
        />
        {q && (
          <button
            type="button"
            className="absolute right-2 top-2 rounded p-0.5 text-muted hover:text-text-primary"
            onClick={() => {
              setQ("");
              setResult(null);
              setOpen(false);
            }}
            aria-label="Temizle"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-2 w-full rounded border border-border bg-bg-surface shadow-[0_1px_0_rgba(0,0,0,0.03)]">
          {loading ? (
            <p className="p-3 text-sm text-muted">Aranıyor...</p>
          ) : !hasResults ? (
            <p className="p-3 text-sm text-muted">Sonuç bulunamadı.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto p-2">
              {result?.cases.map((c) => (
                <Link
                  key={c.id}
                  href={`/dosyalar/${c.id}`}
                  className="block rounded px-3 py-2 transition-colors hover:bg-bg-elevated"
                  onClick={() => {
                    setOpen(false);
                    setQ("");
                  }}
                >
                  <p className="text-sm font-medium">{c.fileNumber}</p>
                  <p className="text-xs text-muted">
                    {c.clientName} — {c.courtName}
                  </p>
                </Link>
              ))}
              {result?.tasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/isler?highlight=${t.id}`}
                  className="block rounded px-3 py-2 transition-colors hover:bg-bg-elevated"
                  onClick={() => {
                    setOpen(false);
                    setQ("");
                  }}
                >
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted">
                    {t.caseFileNumber ? `${t.caseFileNumber} — ` : ""}
                    {formatDateTime(new Date(t.deadline))} — {STATUS_LABELS[t.status]}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
