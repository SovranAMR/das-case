import { z } from "zod";
import { isValidEventType, isValidStage } from "@/lib/case-templates";
import { CASE_STATUSES, CASE_TYPES } from "@/lib/types";

export const createCaseExtendedSchema = z.object({
  courtName: z.string().min(2).max(200),
  fileNumber: z.string().min(1).max(100),
  clientName: z.string().min(2).max(200),
  title: z.string().min(2).max(300),
  caseType: z.enum(CASE_TYPES).default("HUKUK"),
  opposingParty: z.string().max(200).optional().nullable(),
  judgeName: z.string().max(200).optional().nullable(),
  summary: z.string().max(5000).optional().nullable(),
  openedAt: z.string().optional().nullable(),
  status: z.enum(CASE_STATUSES).optional(),
});

export const updateCaseExtendedSchema = createCaseExtendedSchema.partial().extend({
  currentStage: z.string().min(1).max(50).optional(),
  nextHearingAt: z.string().optional().nullable(),
});

export const createCaseEventSchema = z.object({
  eventType: z.string().min(1).max(50),
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional().nullable(),
  occurredAt: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateCaseEventSchema = createCaseEventSchema.partial();

export const createCaseNoteSchema = z.object({
  content: z.string().min(1).max(10000),
  isPinned: z.boolean().optional(),
});

export const updateCaseNoteSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  isPinned: z.boolean().optional(),
});

export const updateStageSchema = z.object({
  stage: z.string().min(1).max(50),
});

export function validateEventForCaseType(
  caseType: (typeof CASE_TYPES)[number],
  eventType: string,
): boolean {
  return isValidEventType(caseType, eventType);
}

export function validateStageForCaseType(
  caseType: (typeof CASE_TYPES)[number],
  stage: string,
): boolean {
  return isValidStage(caseType, stage);
}
