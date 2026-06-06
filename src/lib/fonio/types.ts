export type SlotStatus =
  | "OPEN"
  | "OFFERING"
  | "BOOKED"
  | "ESCALATED"
  | "EXPIRED"
  | "PAUSED_NEW_WAVES";

export type CallOutcome =
  | "not_contacted"
  | "ringing"
  | "no_answer"
  | "declined"
  | "accepted"
  | "runner_up"
  | "booked"
  | "skipped";

export type FillMode = "Patient" | "Balanced" | "Aggressive";

export interface Candidate {
  id: string;
  name: string;
  rank: number;
  matchReason: string;
  waitDays: number;
  contactStatus: CallOutcome;
  eligible: boolean;
  lastContacted: string | null;
  skipReason?: string;
  runnerUpBoost?: boolean;
}

export interface TimelineEvent {
  id: string;
  at: string;
  kind:
    | "slot_opened"
    | "ranking"
    | "wave_dispatched"
    | "call_outcome"
    | "wave_widened"
    | "booked"
    | "runner_up"
    | "escalated"
    | "paused";
  message: string;
}

export interface Wave {
  id?: string;
  number: number;
  size: number;
  candidates: { name: string; state: CallOutcome }[];
  timeoutSec: number;
}

export interface Slot {
  id: string;
  timeLabel: string;
  startsInMin: number; // negative if past
  provider: string;
  service: string;
  status: SlotStatus;
  fillMode: FillMode;
  waveSize: number;
  attempts: number;
  attemptsTotal: number;
  lastEvent: string;
  needsAttention: boolean;
  bookedCustomer?: string;
  recoveredMinBeforeStart?: number;
  reasoning: string;
  qualitative: { responseRate: string; fillConfidence: string };
  activeWave?: Wave;
  timeline: TimelineEvent[];
  candidates: Candidate[];
  runnerUp?: {
    winner: string;
    runnerUps: { name: string; messageStatus: string; priorityActive: boolean }[];
    note: string;
  };
}

export interface Alert {
  id: string;
  severity: "danger" | "warning" | "info";
  slotId?: string;
  title: string;
  reason: string;
  primaryAction: string;
  actionKind: "review" | "escalate" | "open";
}

export interface WaitlistEntry {
  id: string;
  name: string;
  preferredTimes: string;
  serviceTypes: string[];
  waitDays: number;
  contactsThisWeek: number;
  contactLimitPerWeek: number;
  consent: "granted" | "pending" | "revoked";
  lastContacted: string | null;
  priorityBoost?: string;
  eligibilityNotes: string;
  status: "active" | "paused" | "snoozed";
  notes?: string;
  recentContacts?: { at: string; outcome: CallOutcome; slot: string }[];
  runnerUpHistory?: { at: string; slot: string; reason: string }[];
  upcomingMatches?: string[];
}
