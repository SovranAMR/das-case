export function getAssignmentAgeDays(assignedAt: Date, now: Date = new Date()): number {
  const ms = now.getTime() - assignedAt.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export function resolveAssignmentDate(
  assignedAt: Date | null | undefined,
  createdAt: Date,
): Date {
  return assignedAt ?? createdAt;
}

export function formatAssignmentAge(
  assignedAt: Date | null | undefined,
  createdAt: Date,
  now: Date = new Date(),
): string {
  const reference = resolveAssignmentDate(assignedAt, createdAt);
  const days = getAssignmentAgeDays(reference, now);
  if (days === 0) return "Bugün atandı";
  if (days === 1) return "1 gündür bekliyor";
  return `${days} gündür bekliyor`;
}
