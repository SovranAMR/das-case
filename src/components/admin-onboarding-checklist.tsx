"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/page-header";

type OnboardingItem = {
  id: string;
  label: string;
  done: boolean;
  href?: string;
};

export function AdminOnboardingChecklist() {
  const [items, setItems] = useState<OnboardingItem[]>([]);
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/settings/onboarding")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { items: OnboardingItem[]; complete: boolean } | null) => {
        if (data) {
          setItems(data.items);
          setComplete(data.complete);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || complete) return null;

  const doneCount = items.filter((item) => item.done).length;

  return (
    <Card>
      <SectionTitle className="mb-1">İlk kurulum</SectionTitle>
      <p className="mb-4 text-sm text-muted">
        Büroyu kullanıma hazırlamak için {doneCount}/{items.length} adım tamamlandı.
      </p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-sm">
            {item.done ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Circle className="h-4 w-4 text-muted" />
            )}
            {item.href && !item.done ? (
              <Link href={item.href} className="hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className={item.done ? "text-muted line-through" : ""}>{item.label}</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
