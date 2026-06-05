"use client";

import { cn } from "@/lib/utils/cn";
import type { CaseTemplate } from "@/lib/case-templates/types";

export function StageProgressBar({
  template,
  currentStage,
  onStageChange,
}: {
  template: CaseTemplate;
  currentStage: string;
  onStageChange?: (stage: string) => void;
}) {
  const currentOrder =
    template.stages.find((s) => s.code === currentStage)?.order ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {template.stages.map((stage) => {
          const isActive = stage.code === currentStage;
          const isPast = stage.order < currentOrder;
          return (
            <button
              key={stage.code}
              type="button"
              disabled={!onStageChange}
              onClick={() => onStageChange?.(stage.code)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                isActive && "bg-text-primary text-bg",
                !isActive && isPast && "bg-primary/20 text-primary",
                !isActive && !isPast && "border border-border bg-bg-elevated text-text-secondary",
                onStageChange && "hover:opacity-80",
                !onStageChange && "cursor-default",
              )}
            >
              {stage.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
