import type { Customer, RuleWeights, ScoredCandidate, Slot } from "../types";
import { differenceInMinutes } from "date-fns";
import {
  cooldownHeuristic,
  eligibilityHeuristic,
  pickupHeuristic,
  preferenceHeuristic,
  waitTimeScore
} from "./upgradeScore";

function clamp(n: number, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, n));
}

export function waitlistScore(customer: Customer, slot: Slot, rules: RuleWeights): ScoredCandidate {
  const reasons: string[] = [];
  const w = rules.waitlist;

  const eligibility_fit = eligibilityHeuristic(customer, slot);
  if (eligibility_fit > 0.9) reasons.push("All eligibility complete");
  const wait_time = waitTimeScore(customer);
  if (wait_time > 0.5) reasons.push("Long wait time");
  const minutesLeft = differenceInMinutes(new Date(slot.startTime), new Date());
  const urgency = clamp(1 - minutesLeft / (60 * 24));
  const pickup = pickupHeuristic(customer);
  if (pickup > 0.7) reasons.push("High pickup probability");
  const preference = preferenceHeuristic(customer, slot);
  if (preference > 0.7) reasons.push("Matches stated preferences");
  const business = customer.businessPriority;
  if (business > 0.7) reasons.push("Priority customer segment");
  const cooldown = cooldownHeuristic(customer);
  if (cooldown > 0.3) reasons.push("Recent contact penalty applied");

  const score =
    100 *
    (w.eligibility * eligibility_fit +
      w.waitTime * wait_time +
      w.urgency * urgency +
      w.pickup * pickup +
      w.preferenceMatch * preference +
      w.businessPriority * business -
      w.cooldownPenalty * cooldown);

  return {
    customerId: customer.id,
    score: Math.round(clamp(score, 0, 100) * 10) / 10,
    reasons,
    blocks: [],
    source: "waitlist"
  };
}
