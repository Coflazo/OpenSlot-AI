import type { Customer, RuleWeights, Slot } from "../types";

export interface FilterResult {
  pass: boolean;
  blocks: string[];
}

export function hardFilters(customer: Customer, slot: Slot, rules: RuleWeights): FilterResult {
  const blocks: string[] = [];

  if (customer.optedOut) blocks.push("Customer opted out");
  if (rules.requireCallConsent && !customer.consent.call) blocks.push("No call consent");
  if (rules.requireSafetyForm && slot.requirements.safetyForm && !customer.eligibility.safetyForm)
    blocks.push("Safety form incomplete");
  if (rules.requireReferral && slot.requirements.referral && !customer.eligibility.referral)
    blocks.push("Referral missing");
  if (rules.requirePaymentReady && slot.requirements.paymentReady && !customer.eligibility.paymentReady)
    blocks.push("Payment not ready");
  if (rules.requireAuthorization && !customer.eligibility.authorization)
    blocks.push("Authorization not approved");
  if (
    slot.requirements.contrast &&
    customer.eligibility.contrastStatus !== "cleared" &&
    customer.eligibility.contrastStatus !== "not_required"
  )
    blocks.push("Contrast status pending");
  if (rules.requireServiceMatch && customer.requestedService && customer.requestedService !== slot.service)
    blocks.push("Wrong service type");

  // Cooldown: contacted within last hour
  if (rules.skipRecentlyDeclined && customer.lastContactedAt) {
    const minsSince = (Date.now() - new Date(customer.lastContactedAt).getTime()) / 60_000;
    if (minsSince < 60) blocks.push("Contacted too recently");
  }

  return { pass: blocks.length === 0, blocks };
}
