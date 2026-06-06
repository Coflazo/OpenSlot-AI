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
export type BookingStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "REPLACED_BY_UPGRADE"
  | "COMPLETED"
  | "NO_SHOW";
export type BookingSource = "calendar_seed" | "call_webhook" | "manual" | "seed" | "upgrade";
export type WaitlistStatus = "active" | "paused" | "snoozed" | "fulfilled" | "expired";
export type ConsentStatus = "granted" | "pending" | "revoked";
export type OfferType = "waitlist" | "upgrade";
export type OfferStatus =
  | "queued"
  | "calling"
  | "accepted"
  | "declined"
  | "timed_out"
  | "lost_conflict"
  | "cancelled";
export type PriorityReason = "runner_up" | "upgrade_wait" | "vip" | "manual";
export type IntegrationEventStatus = "received" | "processed" | "duplicate" | "failed";
export type TimelineEventKind =
  | "slot_opened"
  | "ranking"
  | "wave_dispatched"
  | "call_outcome"
  | "wave_widened"
  | "booked"
  | "runner_up"
  | "escalated"
  | "paused";

export interface ClinicRow {
  id: string;
  name: string;
  timezone: string;
  fill_mode_default: FillMode;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  max_contacts_per_patient_per_week: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderRow {
  id: string;
  clinic_id: string;
  external_provider_id: string | null;
  display_name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceRow {
  id: string;
  clinic_id: string;
  name: string;
  duration_min: number;
  value_cents: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientRow {
  id: string;
  clinic_id: string;
  external_patient_id: string | null;
  full_name: string;
  phone_e164: string;
  email: string | null;
  sms_consent: ConsentStatus;
  voice_consent: ConsentStatus;
  vip_priority: number;
  max_contacts_per_week_override: number | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientPreferenceRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  service_id: string | null;
  provider_id: string | null;
  preferred_weekdays: number[] | null;
  preferred_time_windows: { start: string; end: string }[] | null;
  avoid_time_windows: { start: string; end: string }[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SlotRow {
  id: string;
  clinic_id: string;
  provider_id: string;
  service_id: string;
  external_calendar_event_id: string | null;
  starts_at: string;
  ends_at: string;
  status: SlotStatus;
  fill_mode: FillMode;
  active_wave_id: string | null;
  booked_booking_id: string | null;
  new_waves_paused: boolean;
  needs_attention: boolean;
  last_event: string | null;
  reasoning: string | null;
  recovered_min_before_start: number | null;
  created_from: string;
  created_at: string;
  updated_at: string;
}

export interface BookingRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  slot_id: string;
  service_id: string;
  status: BookingStatus;
  source: BookingSource;
  external_calendar_event_id: string | null;
  preference_fit: string | null;
  upgrade_opt_in: boolean;
  replaced_by_booking_id: string | null;
  cancelled_reason: string | null;
  booked_at: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaitlistEntryRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  service_id: string;
  preferred_provider_id: string | null;
  status: WaitlistStatus;
  joined_at: string;
  hard_deadline_at: string | null;
  snoozed_until: string | null;
  priority_score_override: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SlotWaveRow {
  id: string;
  clinic_id: string;
  slot_id: string;
  wave_number: number;
  wave_size: number;
  p_estimate: number;
  target_fill_probability: number;
  k_needed: number;
  waves_possible: number;
  timeout_at: string;
  status: string;
  created_at: string;
}

export interface SlotOfferRow {
  id: string;
  clinic_id: string;
  slot_id: string;
  wave_id: string | null;
  patient_id: string;
  waitlist_entry_id: string | null;
  current_booking_id: string | null;
  offer_type: OfferType;
  status: OfferStatus;
  rank: number;
  score: number;
  score_breakdown: {
    wait?: number;
    acceptance?: number;
    priority?: number;
    preference?: number;
    cooldownPenalty?: number;
  };
  reason: string;
  expires_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallAttemptRow {
  id: string;
  clinic_id: string;
  slot_offer_id: string;
  provider: string;
  provider_call_id: string | null;
  provider_event_id: string | null;
  outcome: CallOutcome;
  started_at: string | null;
  ended_at: string | null;
  transcript_url: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PriorityBumpRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  service_id: string | null;
  provider_id: string | null;
  reason: PriorityReason;
  source_slot_id: string | null;
  source_booking_attempt_id: string | null;
  boost_points: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  consumed_at: string | null;
}

export interface BookingAttemptRow {
  id: string;
  clinic_id: string;
  slot_id: string;
  patient_id: string;
  slot_offer_id: string | null;
  source: BookingSource;
  result_code: string;
  won_booking_id: string | null;
  lost_to_booking_id: string | null;
  message: string | null;
  created_at: string;
}

export interface PriorityRuleRow {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  service_id: string | null;
  provider_id: string | null;
  label: string;
  boost_points: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationEventRow {
  id: string;
  clinic_id: string;
  provider: string;
  provider_event_id: string;
  event_type: string;
  status: IntegrationEventStatus;
  related_slot_id: string | null;
  related_patient_id: string | null;
  payload: Record<string, unknown>;
  error_message: string | null;
  received_at: string;
  processed_at: string | null;
}

export interface SlotTimelineEventRow {
  id: string;
  clinic_id: string;
  slot_id: string;
  kind: TimelineEventKind;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface OpenSlotDbState {
  now: string;
  clinics: ClinicRow[];
  providers: ProviderRow[];
  services: ServiceRow[];
  patients: PatientRow[];
  patient_preferences: PatientPreferenceRow[];
  slots: SlotRow[];
  bookings: BookingRow[];
  waitlist_entries: WaitlistEntryRow[];
  slot_waves: SlotWaveRow[];
  slot_offers: SlotOfferRow[];
  call_attempts: CallAttemptRow[];
  booking_attempts: BookingAttemptRow[];
  priority_bumps: PriorityBumpRow[];
  priority_rules: PriorityRuleRow[];
  integration_events: IntegrationEventRow[];
  slot_timeline_events: SlotTimelineEventRow[];
}

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
  kind: TimelineEventKind;
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
  newWavesPaused?: boolean;
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

export interface BookingView {
  booking: BookingRow;
  patient: PatientRow;
}

export interface CandidateView {
  offer: SlotOfferRow;
  patient: PatientRow;
  waitlistEntry?: WaitlistEntryRow;
  callAttempt?: CallAttemptRow;
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

export interface SlotWaveView extends Wave {
  row: SlotWaveRow;
  offers: CandidateView[];
}

export interface SlotView {
  row: SlotRow;
  provider: ProviderRow;
  service: ServiceRow;
  bookedBooking?: BookingView;
  id: string;
  timeLabel: string;
  startsInMin: number;
  status: SlotStatus;
  newWavesPaused: boolean;
  fillMode: FillMode;
  waveSize: number;
  attempts: number;
  attemptsTotal: number;
  lastEvent: string;
  needsAttention: boolean;
  bookedCustomer?: PatientRow;
  recoveredMinBeforeStart?: number;
  reasoning: string;
  qualitative: { responseRate: string; fillConfidence: string };
  activeWave?: SlotWaveView;
  timeline: TimelineEvent[];
  candidates: CandidateView[];
  runnerUp?: {
    winner: PatientRow | null;
    runnerUps: { patient: PatientRow; messageStatus: string; priorityActive: boolean }[];
    note: string;
  };
}

export interface WaitlistView {
  patient: PatientRow;
  entries: WaitlistEntryRow[];
  id: string;
  name: string;
  phone: string;
  email: string | null;
  smsConsent: ConsentStatus;
  preferredTimes: string;
  serviceTypes: string[];
  waitDays: number;
  contactsThisWeek: number;
  contactLimitPerWeek: number;
  consent: ConsentStatus;
  lastContacted: string | null;
  priorityBoost?: string;
  eligibilityNotes: string;
  status: "active" | "paused" | "snoozed";
  notes?: string;
  slotId: string | null;
  hardDeadlineAt: string | null;
  snoozedUntil: string | null;
  recentContacts?: { at: string; outcome: CallOutcome; slot: string }[];
  runnerUpHistory?: { at: string; slot: string; reason: string }[];
  upcomingMatches?: string[];
}

export interface WaitlistEntry {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  smsConsent: ConsentStatus;
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
  slotId: string | null;
  hardDeadlineAt: string | null;
  snoozedUntil: string | null;
  recentContacts?: { at: string; outcome: CallOutcome; slot: string }[];
  runnerUpHistory?: { at: string; slot: string; reason: string }[];
  upcomingMatches?: string[];
}
