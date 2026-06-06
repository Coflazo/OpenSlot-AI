import type { Customer, RuleWeights, ScoredCandidate, Slot } from "../types";
import { differenceInDays, differenceInMinutes } from "date-fns";

const satisfactionScore: Record<Customer["bookingSatisfaction"], number> = {
  satisfied: 0,
  neutral: 0.4,
  dissatisfied: 0.8,
  urgently_wants_earlier: 1.0
};

function clamp(n: number, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, n));
}

export function upgradeScore(
  customer: Customer,
  openSlot: Slot,
  currentBooking: Slot,
  rules: RuleWeights,
  cascadeFillProb: number
): ScoredCandidate {
  const reasons: string[] = [];
  const w = rules.upgrade;

  const earlierDays = differenceInDays(new Date(currentBooking.startTime), new Date(openSlot.startTime));
  const earlier_gain = clamp(earlierDays / 60); // saturates at 60 days
  if (earlierDays >= 7) reasons.push(`${earlierDays} days earlier than current booking`);

  const dissatisfaction_score = satisfactionScore[customer.bookingSatisfaction];
  if (dissatisfaction_score >= 0.8) reasons.push("Wants an earlier appointment");

  const minutesLeft = differenceInMinutes(new Date(openSlot.startTime), new Date());
  const urgency_score = clamp(1 - minutesLeft / (60 * 24)); // closer = more urgent
  if (urgency_score > 0.6) reasons.push("Time-sensitive opening");

  const pickup_probability = pickupHeuristic(customer);
  if (pickup_probability > 0.7) reasons.push("High pickup probability");

  const eligibility_fit = eligibilityHeuristic(customer, openSlot);
  if (eligibility_fit > 0.9) reasons.push("All eligibility complete");

  const preference_match = preferenceHeuristic(customer, openSlot);
  if (preference_match > 0.7) reasons.push("Matches stated preferences");

  const business_priority = customer.businessPriority;
  if (business_priority > 0.7) reasons.push("Priority customer segment");

  const cooldown_penalty = cooldownHeuristic(customer);
  if (cooldown_penalty > 0.3) reasons.push("Recent contact penalty applied");

  const score =
    100 *
    (w.earlierGain * earlier_gain +
      w.dissatisfaction * dissatisfaction_score +
      w.urgency * urgency_score +
      w.pickup * pickup_probability +
      w.eligibility * eligibility_fit +
      w.cascadeFillProbability * cascadeFillProb +
      w.preferenceMatch * preference_match +
      w.businessPriority * business_priority -
      w.cooldownPenalty * cooldown_penalty);

  return {
    customerId: customer.id,
    score: Math.round(clamp(score, 0, 100) * 10) / 10,
    reasons,
    blocks: [],
    source: "upgrade"
  };
}

export function pickupHeuristic(c: Customer): number {
  // Deterministic stand-in: prefer same-day opt-ins, full consent stack, recent activity
  let p = 0.5;
  if (c.preferences.sameDay) p += 0.2;
  if (c.consent.voicemail) p += 0.05;
  if (c.consent.sms) p += 0.05;
  if (c.lastContactedAt) {
    const days = (Date.now() - new Date(c.lastContactedAt).getTime()) / 86_400_000;
    if (days > 14) p += 0.1;
  } else {
    p += 0.05;
  }
  return clamp(p);
}

export function eligibilityHeuristic(c: Customer, s: Slot): number {
  const checks = [
    !s.requirements.safetyForm || c.eligibility.safetyForm,
    !s.requirements.referral || c.eligibility.referral,
    !s.requirements.paymentReady || c.eligibility.paymentReady,
    c.eligibility.authorization,
    !s.requirements.contrast || c.eligibility.contrastStatus !== "pending"
  ];
  return checks.filter(Boolean).length / checks.length;
}

export function preferenceHeuristic(c: Customer, s: Slot): number {
  let p = 0.4;
  const hour = new Date(s.startTime).getHours();
  if (c.preferences.preferredWindow === "any") p += 0.2;
  else if (
    (c.preferences.preferredWindow === "morning" && hour < 12) ||
    (c.preferences.preferredWindow === "afternoon" && hour >= 12 && hour < 17) ||
    (c.preferences.preferredWindow === "evening" && hour >= 17)
  )
    p += 0.3;
  if (c.preferences.sameDay) p += 0.1;
  if (c.requestedService === s.service) p += 0.2;
  return clamp(p);
}

export function cooldownHeuristic(c: Customer): number {
  if (!c.lastContactedAt) return 0;
  const hrs = (Date.now() - new Date(c.lastContactedAt).getTime()) / 3_600_000;
  if (hrs < 1) return 1;
  if (hrs < 6) return 0.7;
  if (hrs < 24) return 0.4;
  if (hrs < 72) return 0.15;
  return 0;
}

export function waitTimeScore(c: Customer): number {
  if (!c.waitingSince) return 0.3;
  const days = (Date.now() - new Date(c.waitingSince).getTime()) / 86_400_000;
  return clamp(days / 30);
}
