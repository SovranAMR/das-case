type CaseWarningInput = {
  status: "ACTIVE" | "CLOSED" | "ARCHIVED";
  nextHearingAt: string | null;
  currentStage: string;
};

export function getActiveCaseWarnings(caseData: CaseWarningInput): string[] {
  if (caseData.status !== "ACTIVE") return [];

  const warnings: string[] = [];
  if (!caseData.nextHearingAt) {
    warnings.push("Sonraki duruşma tarihi girilmemiş");
  }
  if (!caseData.currentStage?.trim()) {
    warnings.push("Dosya süreci (aşama) belirtilmemiş");
  }
  return warnings;
}
