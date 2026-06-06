import type { Customer, Slot } from "../types";
import { differenceInDays } from "date-fns";

export function cascadeFillProbability(vacatedSlot: Slot, allCustomers: Customer[]): number {
  const daysOut = Math.max(0, differenceInDays(new Date(vacatedSlot.startTime), new Date()));

  const eligible = allCustomers.filter((c) => {
    if (c.optedOut) return false;
    if (!c.consent.call) return false;
    if (c.requestedService && c.requestedService !== vacatedSlot.service) return false;
    return c.eligibility.referral && c.eligibility.paymentReady;
  }).length;

  // Saturating count
  const supply = Math.min(1, eligible / 6);

  // Mid-range time horizon is best — too close = too few candidates respond, too far = uncertain
  const timeBonus = daysOut < 1 ? 0.45 : daysOut < 7 ? 0.85 : daysOut < 30 ? 0.78 : 0.6;

  return Math.round(supply * timeBonus * 100) / 100;
}
