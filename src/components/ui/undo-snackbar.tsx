"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const UNDO_DURATION_MS = 5000;

type UndoContextValue = {
  showUndo: (message: string, onUndo: () => Promise<boolean>) => void;
};

const UndoContext = createContext<UndoContextValue | null>(null);

export function UndoProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const onUndoRef = useRef<(() => Promise<boolean>) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setOpen(false);
    setMessage("");
    onUndoRef.current = null;
    setLoading(false);
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => dismiss(), UNDO_DURATION_MS);
  }, [dismiss]);

  const showUndo = useCallback(
    (text: string, onUndo: () => Promise<boolean>) => {
      dismiss();
      setMessage(text);
      onUndoRef.current = onUndo;
      setOpen(true);
      timerRef.current = setTimeout(() => dismiss(), UNDO_DURATION_MS);
    },
    [dismiss],
  );

  const handleUndo = useCallback(async () => {
    if (!onUndoRef.current || loading) return;
    setLoading(true);
    try {
      const success = await onUndoRef.current();
      if (success) {
        dismiss();
      } else {
        setLoading(false);
        resetTimer();
      }
    } catch {
      setLoading(false);
      resetTimer();
    }
  }, [dismiss, loading, resetTimer]);

  const value = useMemo(() => ({ showUndo }), [showUndo]);

  return (
    <UndoContext.Provider value={value}>
      {children}
      {open && (
        <div
          className={cn(
            "pointer-events-none fixed bottom-6 left-1/2 z-[110] w-full max-w-md -translate-x-1/2 px-4",
          )}
          aria-live="polite"
        >
          <div className="pointer-events-auto flex items-center justify-between gap-3 rounded border border-border-strong bg-text-primary px-4 py-3 text-sm text-bg shadow-[0_1px_0_rgba(0,0,0,0.03)]">
            <span>{message}</span>
            <Button
              variant="secondary"
              className="shrink-0"
              disabled={loading}
              onClick={() => void handleUndo()}
            >
              {loading ? "..." : "Geri al"}
            </Button>
          </div>
        </div>
      )}
    </UndoContext.Provider>
  );
}

export function useUndo(): UndoContextValue {
  const ctx = useContext(UndoContext);
  if (!ctx) {
    throw new Error("useUndo UndoProvider içinde kullanılmalı");
  }
  return ctx;
}
