import type { Customer, RuleWeights, Slot } from "../types";
import { hardFilters } from "./hardFilters";
import { estimateRouteMinutes, travelFeasibility } from "./routePlanner";
import {
  cooldownHeuristic,
  eligibilityHeuristic,
  pickupHeuristic,
  preferenceHeuristic,
  waitTimeScore
} from "./upgradeScore";
import type { AlgorithmExplanation, CandidateStatus, ScoreParts } from "./types";
import { differenceInMinutes } from "date-fns";

const HOME_NODE_BY_LANGUAGE: Record<string, string> = {};

function clamp(n: number, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, n));
}

function locationNodeForSlot(slot: Slot): string {
  return slot.location.includes("Mariahilf") ? "clinic_mariahilf" : "clinic_innere_stadt";
}

function homeNodeForCustomer(c: Customer): string {
  // Deterministic stand-in based on customer id, used until real `routeNodeId` joins exist.
  const seedMap: Record<string, string> = {
    cust_cagan: "vienna_1010",
    cust_alex: "vienna_1070",
    cust_sara: "vienna_1190",
    cust_jonas: "vienna_1100",
    cust_mia: "vienna_1060",
    cust_omar: "vienna_1100",
    cust_lena: "vienna_1010",
    cust_helena: "vienna_1180",
    cust_kerem: "wr_neustadt",
    cust_isabella: "vienna_1150",
    cust_lukas: "vienna_1140",
    cust_clara: "vienna_1020",
    cust_paul: "vienna_1230",
    cust_emma: "vienna_1010",
    cust_finn: "vienna_1220",
    cust_zeynep: "vienna_1130",
    cust_david: "vienna_1190",
    cust_anna: "vienna_1180",
    cust_tobias: "vienna_1060",
    cust_julia: "vienna_1070",
    cust_yusuf: "vienna_1220",
    cust_lara: "vienna_1010"
  };
  return seedMap[c.id] ?? "vienna_1010";
}

export interface ExplainContext {
  rules: RuleWeights;
  travelWeight: number;
  arrivalBufferMinutes: number;
  source: "upgrade" | "waitlist";
}

export function explainCandidate(
  customer: Customer,
  slot: Slot,
  ctx: ExplainContext
): AlgorithmExplanation {
  const blocks: string[] = [];
  const reasons: string[] = [];

  const filter = hardFilters(customer, slot, ctx.rules);
  for (const b of filter.blocks) blocks.push(b);

  // Route check
  const fromNodeId = homeNodeForCustomer(customer);
  const toNodeId = locationNodeForSlot(slot);
  const route = estimateRouteMinutes({ fromNodeId, toNodeId });
  const timeLeftMinutes = Math.max(0, differenceInMinutes(new Date(slot.startTime), new Date()));
  const feasibility = travelFeasibility({
    travelMinutes: route.minutes,
    arrivalBufferMinutes: ctx.arrivalBufferMinutes,
    timeLeftMinutes
  });

  if (!feasibility.feasible && route.found) {
    blocks.push(
      `Travel blocked: ${route.minutes}m drive + ${ctx.arrivalBufferMinutes}m buffer > ${timeLeftMinutes}m left`
    );
  }
  if (feasibility.feasible) {
    reasons.push(`Can arrive in time (${route.minutes}m drive vs ${timeLeftMinutes}m left)`);
  }

  // Heuristics shared with the existing ranking
  const eligibility_fit = eligibilityHeuristic(customer, slot);
  const wait_time = waitTimeScore(customer);
  const pickup = pickupHeuristic(customer);
  const preference = preferenceHeuristic(customer, slot);
  const cooldown = cooldownHeuristic(customer);
  const urgency = clamp(1 - timeLeftMinutes / (60 * 24));
  const business = customer.businessPriority;

  if (eligibility_fit > 0.9) reasons.push("All eligibility complete");
  if (wait_time > 0.5) reasons.push("Long wait time");
  if (pickup > 0.7) reasons.push("High pickup probability");
  if (preference > 0.7) reasons.push("Matches stated preferences");
  if (business > 0.7) reasons.push("Priority customer segment");
  if (cooldown > 0.3) reasons.push("Recent contact penalty applied");

  const w =
    ctx.source === "upgrade"
      ? {
          eligibility: ctx.rules.upgrade.eligibility,
          urgency: ctx.rules.upgrade.urgency,
          waitTime: 0,
          pickup: ctx.rules.upgrade.pickup,
          businessPriority: ctx.rules.upgrade.businessPriority,
          preferenceMatch: ctx.rules.upgrade.preferenceMatch,
          travelFeasibility: ctx.travelWeight,
          cooldownPenalty: ctx.rules.upgrade.cooldownPenalty
        }
      : {
          eligibility: ctx.rules.waitlist.eligibility,
          urgency: ctx.rules.waitlist.urgency,
          waitTime: ctx.rules.waitlist.waitTime,
          pickup: ctx.rules.waitlist.pickup,
          businessPriority: ctx.rules.waitlist.businessPriority,
          preferenceMatch: ctx.rules.waitlist.preferenceMatch,
          travelFeasibility: ctx.travelWeight,
          cooldownPenalty: ctx.rules.waitlist.cooldownPenalty
        };

  const scoreParts: ScoreParts = {
    eligibilityFit: eligibility_fit,
    urgency,
    waitTime: wait_time,
    pickupProbability: pickup,
    businessPriority: business,
    preferenceMatch: preference,
    travelFeasibility: feasibility.score,
    cooldownPenalty: cooldown
  };

  const weightedContributions: ScoreParts = {
    eligibilityFit: w.eligibility * eligibility_fit,
    urgency: w.urgency * urgency,
    waitTime: w.waitTime * wait_time,
    pickupProbability: w.pickup * pickup,
    businessPriority: w.businessPriority * business,
    preferenceMatch: w.preferenceMatch * preference,
    travelFeasibility: w.travelFeasibility * feasibility.score,
    cooldownPenalty: w.cooldownPenalty * cooldown
  };

  const positives =
    weightedContributions.eligibilityFit +
    weightedContributions.urgency +
    weightedContributions.waitTime +
    weightedContributions.pickupProbability +
    weightedContributions.businessPriority +
    weightedContributions.preferenceMatch +
    weightedContributions.travelFeasibility;
  const penalties = weightedContributions.cooldownPenalty;

  const blocked = blocks.length > 0;
  const travelBlocked = !feasibility.feasible && route.found;

  const rawScore = blocked || travelBlocked ? 0 : 100 * clamp(positives - penalties, 0, 1);
  const finalScore = Math.round(rawScore * 10) / 10;

  let status: CandidateStatus = "call_later";
  if (travelBlocked) status = "travel_blocked";
  else if (blocked) status = "blocked";
  else if (finalScore >= 70) status = "call_now";
  else if (finalScore >= 40) status = "call_later";
  else status = "needs_review";

  return {
    customerId: customer.id,
    customerName: customer.name,
    source: ctx.source,
    finalScore,
    status,
    blocks,
    reasons,
    scoreParts,
    weightedContributions,
    route: {
      fromNodeId,
      toNodeId,
      distanceKm: route.distanceKm === Infinity ? 0 : route.distanceKm,
      travelMinutes: route.minutes === Infinity ? 0 : route.minutes,
      arrivalBufferMinutes: ctx.arrivalBufferMinutes,
      timeLeftMinutes,
      feasible: feasibility.feasible,
      path: route.path
    },
    customer,
    slot
  };
}
