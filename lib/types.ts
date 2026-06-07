export type ServiceCode =
  | "MRI Knee"
  | "MRI Brain"
  | "MRI Spine"
  | "CT Chest"
  | "CT Abdomen"
  | "Ultrasound"
  | "X-ray";

export type SlotStatus =
  | "booked"
  | "open"
  | "calling"
  | "held"
  | "filled"
  | "expired"
  | "paused";

export type SlotOrigin =
  | "patient_cancellation"
  | "upgrade_cascade"
  | "manual_opening";

export interface SlotRequirements {
  safetyForm: boolean;
  referral: boolean;
  paymentReady: boolean;
  contrast: boolean;
}

export interface Slot {
  id: string;
  service: ServiceCode;
  bodyPart?: string;
  location: string;
  startTime: string;
  durationMinutes: number;
  estimatedValue: number;
  status: SlotStatus;
  requirements: SlotRequirements;
  customerId?: string;
  origin: SlotOrigin;
  parentSlotId?: string;
  cascadeDepth: number;
  cascadeChainId?: string;
  cancelledAt?: string;
  filledAt?: string;
}

export type BookingSatisfaction =
  | "satisfied"
  | "neutral"
  | "dissatisfied"
  | "urgently_wants_earlier";

export type EarlierOpportunityPreference =
  | "none"
  | "seven_days_earlier"
  | "same_location"
  | "any_earlier"
  | "same_day";

export type CascadeParticipation =
  | "can_move"
  | "move_once"
  | "manual_approval"
  | "do_not_move";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  language: "en" | "de" | "tr";
  consent: { call: boolean; sms: boolean; voicemail: boolean; recording: boolean };
  eligibility: {
    safetyForm: boolean;
    referral: boolean;
    paymentReady: boolean;
    authorization: boolean;
    contrastStatus: "not_required" | "cleared" | "pending";
  };
  preferences: {
    sameDay: boolean;
    preferredWindow: "morning" | "afternoon" | "evening" | "any";
    maxTravelMinutes: number;
  };
  requestedService?: ServiceCode;
  requestedBodyPart?: string;
  currentBookingId?: string;
  bookingSatisfaction: BookingSatisfaction;
  earlierOpportunityPreference: EarlierOpportunityPreference;
  cascadeParticipation: CascadeParticipation;
  businessPriority: number; // 0..1
  waitingSince?: string;
  lastContactedAt?: string;
  optedOut?: boolean;
  notes?: string;
}

export type CallType = "upgrade_offer" | "waitlist_offer" | "cascade_fill";

export type CallStatus =
  | "queued"
  | "ringing"
  | "in_progress"
  | "accepted"
  | "declined"
  | "no_answer"
  | "voicemail"
  | "failed";

export interface TranscriptTurn {
  id: string;
  speaker: "agent" | "customer";
  text: string;
  at: string;
}

export interface CallExtraction {
  identityConfirmed: boolean;
  slotAccepted: boolean;
  askedMedicalQuestion: boolean;
  needsCallback: boolean;
  voicemail: boolean;
}

export interface CallSession {
  id: string;
  offerId: string;
  slotId: string;
  customerId: string;
  type: CallType;
  status: CallStatus;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  transcript: TranscriptTurn[];
  extraction?: CallExtraction;
  recordingUrl?: string;
  needsReview?: boolean;
  reviewReason?: string;
}

export interface CascadeStep {
  slotId: string;
  filledByCustomerId?: string;
  vacatedSlotId?: string;
  type: "upgrade" | "waitlist";
  at: string;
}

export interface CascadeChain {
  id: string;
  rootSlotId: string;
  steps: CascadeStep[];
  depth: number;
  status: "in_progress" | "completed" | "stopped_by_depth" | "unfilled";
  startedAt: string;
  completedAt?: string;
}

export interface RuleWeights {
  // Hard filters
  requireCallConsent: boolean;
  requireSafetyForm: boolean;
  requireReferral: boolean;
  requirePaymentReady: boolean;
  requireAuthorization: boolean;
  requireServiceMatch: boolean;
  requireLocationMatch: boolean;
  requireArrivalFeasibility: boolean;
  skipRecentlyDeclined: boolean;

  // Ranking (upgrade)
  upgrade: {
    earlierGain: number;
    dissatisfaction: number;
    urgency: number;
    pickup: number;
    eligibility: number;
    cascadeFillProbability: number;
    preferenceMatch: number;
    businessPriority: number;
    cooldownPenalty: number;
  };

  // Ranking (waitlist)
  waitlist: {
    eligibility: number;
    waitTime: number;
    urgency: number;
    pickup: number;
    preferenceMatch: number;
    businessPriority: number;
    cooldownPenalty: number;
  };

  // Route-aware feasibility (shared)
  travelFeasibilityWeight: number;
  minimumArrivalBufferMinutes: number;

  // Aggression
  aggression: {
    calmHours: number;
    focusedHours: number;
    aggressiveMinutes: number;
    emergencyMinutes: number;
  };

  // Cascade
  cascade: {
    bookedFirst: boolean;
    maxDepth: number;
    minEarlierGainDays: number;
    skipSatisfied: boolean;
    requireOptIn: boolean;
    askPreferenceAfterBooking: boolean;
  };

  // Scripts
  scripts: {
    waitlistOpening: string;
    upgradeOpening: string;
    acceptance: string;
    confirmation: string;
    decline: string;
    voicemail: string;
    wrongPerson: string;
    medicalQuestion: string;
    preferenceQuestion: string;
  };
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: "system" | "agent" | "user" | string;
  action: string;
  object: string;
  result: "success" | "info" | "blocked" | "error";
  details?: string;
}

export type AggressionLevel = "calm" | "focused" | "aggressive" | "emergency";

export interface ScoredCandidate {
  customerId: string;
  score: number;
  reasons: string[];
  blocks: string[];
  source: "upgrade" | "waitlist";
}
