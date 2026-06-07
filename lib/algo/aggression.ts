import type { AggressionLevel, RuleWeights } from "../types";
import { differenceInMinutes } from "date-fns";

export function aggression(slotStartIso: string, rules: RuleWeights): {
  level: AggressionLevel;
  concurrent: number;
  minutesLeft: number;
} {
  const minutesLeft = Math.max(0, differenceInMinutes(new Date(slotStartIso), new Date()));
  const hoursLeft = minutesLeft / 60;

  if (minutesLeft <= rules.aggression.emergencyMinutes) {
    return { level: "emergency", concurrent: 10, minutesLeft };
  }
  if (minutesLeft <= rules.aggression.aggressiveMinutes) {
    return { level: "aggressive", concurrent: 5, minutesLeft };
  }
  if (hoursLeft <= rules.aggression.focusedHours) {
    return { level: "focused", concurrent: 2, minutesLeft };
  }
  return { level: "calm", concurrent: 1, minutesLeft };
}
