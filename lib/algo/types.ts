import type { Customer, Slot } from "../types";

export type CandidateStatus =
  | "call_now"
  | "call_later"
  | "blocked"
  | "travel_blocked"
  | "needs_review";

export interface ScoreParts {
  eligibilityFit: number;
  urgency: number;
  waitTime: number;
  pickupProbability: number;
  businessPriority: number;
  preferenceMatch: number;
  travelFeasibility: number;
  cooldownPenalty: number;
}

export interface RouteResult {
  fromNodeId?: string;
  toNodeId?: string;
  distanceKm: number;
  travelMinutes: number;
  arrivalBufferMinutes: number;
  timeLeftMinutes: number;
  feasible: boolean;
  path: string[];
}

export interface AlgorithmExplanation {
  customerId: string;
  customerName: string;
  source: "upgrade" | "waitlist";
  finalScore: number;
  status: CandidateStatus;
  blocks: string[];
  reasons: string[];
  scoreParts: ScoreParts;
  weightedContributions: ScoreParts;
  route: RouteResult;
  customer: Customer;
  slot: Slot;
}
