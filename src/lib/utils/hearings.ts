import { isBefore, isSameDay } from "date-fns";

export type HearingUrgency = "today" | "soon" | "upcoming" | "past";

export function getHearingUrgency(hearingAt: Date, now = new Date()): HearingUrgency {
  if (isSameDay(hearingAt, now)) return "today";
  if (isBefore(hearingAt, now)) return "past";

  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  if (isBefore(hearingAt, threeDaysLater)) return "soon";

  const twoWeeksLater = new Date(now);
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
  if (isBefore(hearingAt, twoWeeksLater)) return "upcoming";

  return "upcoming";
}

export function isUpcomingHearing(hearingAt: Date, now = new Date(), withinDays = 14): boolean {
  if (isBefore(hearingAt, now) && !isSameDay(hearingAt, now)) return false;
  const limit = new Date(now);
  limit.setDate(limit.getDate() + withinDays);
  return hearingAt <= limit;
}

export const HEARING_URGENCY_LABELS: Record<HearingUrgency, string> = {
  today: "Bugün",
  soon: "3 gün içinde",
  upcoming: "Yaklaşan",
  past: "Geçmiş",
};
