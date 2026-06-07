export type FillMode = "Patient" | "Balanced" | "Aggressive";

export type CallOutcome =
  | "accepted"
  | "declined"
  | "no_answer"
  | "not_contacted"
  | "runner_up"
  | "booked";

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

export interface Slot {
  id: string;
  timeLabel: string;
  startsInMin: number;
  provider: string;
  service: string;
  status: string;
  fillMode: FillMode;
  waveSize: number;
  attempts: number;
  attemptsTotal: number;
  lastEvent: string;
  needsAttention: boolean;
  reasoning: string;
  qualitative: { responseRate: string; fillConfidence: string };
  candidates: Candidate[];
  timeline: unknown[];
}
