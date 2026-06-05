import type { CaseType } from "@/lib/types";

export type FormFieldType = "text" | "textarea" | "date" | "datetime" | "select";

export type FormField = {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
};

export type StageDefinition = {
  code: string;
  label: string;
  order: number;
};

export type EventTypeDefinition = {
  code: string;
  label: string;
  icon: string;
  category: "hearing" | "petition" | "decision" | "service" | "meeting" | "other";
  fields: FormField[];
  suggestedStage?: string;
  defaultTitle?: string;
};

export type CaseTemplate = {
  caseType: CaseType;
  label: string;
  stages: StageDefinition[];
  eventTypes: EventTypeDefinition[];
};
