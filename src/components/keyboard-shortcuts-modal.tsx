"use client";

import { Modal } from "@/components/ui/modal";
import { FORMAL_TERMS } from "@/lib/utils/formal-terms";

const SHORTCUTS = [
  { keys: "N", desc: "Hızlı ekle" },
  { keys: "/", desc: "Global arama (yakında)" },
  { keys: "?", desc: "Kısayol listesi" },
] as const;

export function KeyboardShortcutsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title="Klavye kısayolları" onClose={onClose}>
      <ul className="space-y-2 text-sm">
        {SHORTCUTS.map((s) => (
          <li key={s.keys} className="flex items-center justify-between gap-4">
            <span className="text-muted">{s.desc}</span>
            <kbd className="rounded border border-border bg-bg-elevated px-2 py-0.5 font-mono text-xs">
              {s.keys}
            </kbd>
          </li>
        ))}
      </ul>
      <div className="mt-6 border-t border-border pt-4">
        <h3 className="mb-2 text-sm font-semibold">Resmi terimler</h3>
        <ul className="space-y-2 text-sm">
          {FORMAL_TERMS.map((term) => (
            <li key={term.term}>
              <span className="font-medium">{term.term}</span>
              <span className="text-muted"> — {term.definition}</span>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
