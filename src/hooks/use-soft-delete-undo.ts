"use client";

import { useCallback } from "react";
import { useUndo } from "@/components/ui/undo-snackbar";
import { useToast } from "@/components/ui/toast";

type SoftDeleteUndoOptions = {
  deleteUrl: string;
  restoreUrl: string;
  message: string;
  restoredMessage?: string;
  onReload: () => Promise<void>;
};

export function useSoftDeleteUndo() {
  const { showUndo } = useUndo();
  const { showToast } = useToast();

  const deleteWithUndo = useCallback(
    async (options: SoftDeleteUndoOptions): Promise<boolean> => {
      try {
        const res = await fetch(options.deleteUrl, { method: "DELETE" });
        if (!res.ok) return false;

        await options.onReload();

        showUndo(options.message, async () => {
          try {
            const restoreRes = await fetch(options.restoreUrl, { method: "POST" });
            if (!restoreRes.ok) {
              showToast("Geri alınamadı", "error");
              return false;
            }
            showToast(options.restoredMessage ?? "Geri alındı");
            await options.onReload();
            return true;
          } catch {
            showToast("Bağlantı hatası", "error");
            return false;
          }
        });

        return true;
      } catch {
        showToast("Bağlantı hatası", "error");
        return false;
      }
    },
    [showToast, showUndo],
  );

  return { deleteWithUndo };
}
