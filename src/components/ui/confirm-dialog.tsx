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
import { Modal } from "@/components/ui/modal";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
};

type ConfirmState = ConfirmOptions & { open: boolean };

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const defaultState: ConfirmState = {
  open: false,
  title: "",
  message: "",
  confirmLabel: "Onayla",
  cancelLabel: "İptal",
  variant: "default",
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>(defaultState);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((result: boolean) => {
    setState(defaultState);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({
        open: true,
        confirmLabel: "Onayla",
        cancelLabel: "İptal",
        variant: "default",
        ...options,
      });
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={state.open}
        title={state.title}
        onClose={() => close(false)}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">{state.message}</p>
          <div className="flex gap-2">
            <Button
              variant={state.variant === "danger" ? "danger" : "primary"}
              onClick={() => close(true)}
            >
              {state.confirmLabel ?? "Onayla"}
            </Button>
            <Button variant="secondary" onClick={() => close(false)}>
              {state.cancelLabel ?? "İptal"}
            </Button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm ConfirmProvider içinde kullanılmalı");
  }
  return ctx;
}
