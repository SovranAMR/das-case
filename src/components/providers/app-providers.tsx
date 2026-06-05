"use client";

import type { ReactNode } from "react";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ToastProvider } from "@/components/ui/toast";
import { UndoProvider } from "@/components/ui/undo-snackbar";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <UndoProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </UndoProvider>
    </ToastProvider>
  );
}
