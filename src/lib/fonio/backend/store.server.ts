import { createHash } from "node:crypto";

import type { CallOutcome, Slot, WaitlistEntry } from "../types";
import {
  calculateWaveSize,
  eligibleForNextWave,
  estimateSlotCallSuccess,
  rankCandidates,
} from "./algorithm";
import { supabase } from "../../supabase.server";

type DbConsentStatus = "granted" | "pending" | "revoked";
type DbWaitlistStatus = "active" | "paused" | "snoozed" | "fulfilled" | "expired";
type DbSlotStatus = Slot["status"];
type DbBookingSource = "calendar_seed" | "call_webhook" | "manual" | "upgrade";
type BookingSource = "call_webhook" | "manual" | "seed" | "upgrade";

export interface AttemptBookingInput {
  slotId: string;
  candidateId?: string;
  candidateName?: string;
  waveId?: string;
  source: BookingSource;
}

export interface CallOutcomeInput {
  slotId: string;
  candidateId: string;
  outcome: CallOutcome;
  providerEventId?: string;
  waveId?: string;
}

export interface SlotOpenedInput {
  id: string;
  timeLabel: string;
  startsInMin: number;
  provider: string;
  service: string;
  fillMode?: Slot["fillMode"];
}

interface DbPatient {
  id: string;
  clinic_id: string;
  full_name: string;
  phone_e164: string;
  email: string | null;
  sms_consent: DbConsentStatus;
  voice_consent: DbConsentStatus;
  vip_priority: number;
  max_contacts_per_week_override: number | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DbProvider {
  id: string;
  clinic_id: string;
  display_name: string;
  active: boolean;
}

interface DbService {
  id: string;
  clinic_id: string;
  name: string;
  duration_min: number;
  active: boolean;
}

interface DbSlot {
  id: string;
  clinic_id: string;
  provider_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  status: DbSlotStatus;
  booked_patient_id: string | null;
  new_waves_paused: boolean;
  needs_attention: boolean;
  last_event: string | null;
  reasoning: string | null;
  recovered_min_before_start: number | null;
  created_from: string;
  created_at: string;
  updated_at: string;
}

interface DbWaitlistEntry {
  id: string;
  clinic_id: string;
  patient_id: string;
  service_id: string;
  slot_id: string | null;
  status: DbWaitlistStatus;
  joined_at: string;
  hard_deadline_at: string | null;
  snoozed_until: string | null;
  priority_score_override: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface DbCallAttempt {
  id: string;
  clinic_id: string;
  waitlist_entry_id: string;
  patient_id: string;
  slot_id: string;
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

interface DbBooking {
  id: string;
  clinic_id: string;
  patient_id: string;
  slot_id: string;
  waitlist_entry_id: string | null;
  call_attempt_id: string | null;
  status: "ACTIVE" | "CANCELLED" | "REPLACED_BY_UPGRADE" | "COMPLETED" | "NO_SHOW";
  source: DbBookingSource;
  replaced_by_booking_id: string | null;
  cancelled_reason: string | null;
  cancelled_at: string | null;
  booked_at: string;
  created_at: string;
  updated_at: string;
}

interface DbState {
  patients: DbPatient[];
  providers: DbProvider[];
  services: DbService[];
  slots: DbSlot[];
  waitlistEntries: DbWaitlistEntry[];
  callAttempts: DbCallAttempt[];
  bookings: DbBooking[];
}

interface ResolvedCandidate {
  slot: DbSlot;
  patient: DbPatient;
  waitlistEntry: DbWaitlistEntry;
  mappedSlot: Slot;
}

const DEFAULT_CONTACT_LIMIT = 2;

export async function initializeFromSupabase() {
  await readDbState();
}

export async function getBackendState() {
  const state = await readDbState();
  return mapDbStateToBackendState(state);
}

export async function getSlot(slotId: string) {
  const normalizedSlotId = normalizeSlotId(slotId);
  const state = await readDbState();
  const slot = state.slots.find((item) => item.id === normalizedSlotId);
  if (!slot) return null;
  return mapDbSlotToLegacy(slot, state);
}

export async function openSlot(input: SlotOpenedInput) {
  const normalizedSlotId = normalizeSlotId(input.id);
  const existing = await getSlot(normalizedSlotId);
  if (existing) return existing;

  const state = await readDbState();
  const provider = state.providers.find((p) => p.display_name === input.provider);
  const service = state.services.find((s) => s.name === input.service);

  if (!provider || !service) {
    throw new Error(
      `Provider "${input.provider}" or Service "${input.service}" not found in database`,
    );
  }

  const clinic = state.providers[0]; // Get clinic_id from first provider
  const clinicId = clinic?.clinic_id;

  if (!clinicId) {
    throw new Error("No clinic found in database");
  }

  const startsAt = new Date(Date.now() + input.startsInMin * 60000);
  const endsAt = new Date(startsAt.getTime() + defaultDurationMin(input.service) * 60000);
  const insertRow = {
    clinic_id: clinicId,
    provider_id: provider.id,
    service_id: service.id,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    status: "OPEN" as DbSlotStatus,
    new_waves_paused: false,
    needs_attention: false,
    last_event: "Slot opened from external integration",
    reasoning: "Calling one at a time because there is enough runway.",
    created_from: "calendar_cancellation",
  };

  const { data, error } = await supabase.from("slots").insert(insertRow).select("*").single();
  throwIfSupabaseError(error, "open slot");
  return requireMappedSlot((data as DbSlot).id);
}

export async function getRankedSlot(slotId: string) {
  const normalizedSlotId = normalizeSlotId(slotId);
  const slot = await requireSlot(normalizedSlotId);
  const ranked = rankCandidates(slot);
  const p = estimateSlotCallSuccess(slot);
  const recommendation = calculateWaveSize({
    p,
    usableTimeMin: slot.startsInMin,
    fillMode: slot.fillMode,
  });

  return {
    slotId: normalizedSlotId,
    ranked,
    recommendation,
  };
}

export async function dispatchNextWave(slotId: string, requestedWaveSize?: number) {
  const normalizedSlotId = normalizeSlotId(slotId);
  const state = await readDbState();
  const dbSlot = requireDbSlot(state, normalizedSlotId);
  const slot = mapDbSlotToLegacy(dbSlot, state);

  if (dbSlot.new_waves_paused || dbSlot.status === "PAUSED_NEW_WAVES") {
    return {
      ok: false,
      reason: "New waves are paused. Calls already in progress may still complete.",
      slot,
    };
  }

  if (!["OPEN", "PAUSED_NEW_WAVES"].includes(dbSlot.status)) {
    return {
      ok: false,
      reason: `Cannot dispatch a wave while slot is ${dbSlot.status}.`,
      slot,
    };
  }

  const ranked = rankCandidates(slot);
  const p = estimateSlotCallSuccess(slot);
  const recommendation = calculateWaveSize({
    p,
    usableTimeMin: slot.startsInMin,
    fillMode: slot.fillMode,
  });
  const waveSize = requestedWaveSize ?? recommendation.waveSize;

  console.log(
    `[DISPATCH] 🔍 Filtering ${ranked.length} ranked candidates for wave size ${waveSize}...`,
  );

  const waveCandidates = ranked.filter(eligibleForNextWave).slice(0, waveSize);

  console.log(
    `[DISPATCH] After filtering: ${waveCandidates.length} candidates eligible for next wave`,
  );

  if (!waveCandidates.length) {
    console.error(
      `[DISPATCH] ❌ No eligible candidates found. Escalating slot to manual review.`,
    );
    await updateSlot(normalizedSlotId, {
      status: "ESCALATED",
      needs_attention: true,
      last_event: "No eligible candidates",
    });
    const escalatedSlot = await requireSlot(normalizedSlotId);
    return { ok: false, reason: "No eligible candidates.", slot: escalatedSlot };
  }

  const waitlistById = new Map(state.waitlistEntries.map((entry) => [entry.id, entry]));
  const callRows = waveCandidates.map((candidate) => {
    const waitlistEntry = requireRow(
      waitlistById.get(candidate.id),
      "waitlist entry",
      candidate.id,
    );
    return {
      clinic_id: dbSlot.clinic_id,
      waitlist_entry_id: waitlistEntry.id,
      patient_id: waitlistEntry.patient_id,
      slot_id: dbSlot.id,
      provider: "fonio",
      provider_event_id: `dispatch-${dbSlot.id}-${waitlistEntry.id}-${Date.now()}`,
      outcome: "ringing" as CallOutcome,
      started_at: new Date().toISOString(),
    };
  });

  const { error: insertError } = await supabase.from("call_attempts").insert(callRows);
  throwIfSupabaseError(insertError, "dispatch call attempts");

  await updateSlot(normalizedSlotId, {
    status: "OFFERING",
    last_event: `Wave dispatched`,
    reasoning: recommendation.explanation,
  });

  const updatedSlot = await requireSlot(normalizedSlotId);
  return {
    ok: true,
    slot: updatedSlot,
    wave: updatedSlot.activeWave,
    candidates: waveCandidates,
    recommendation,
  };
}

export async function recordCallOutcome(input: CallOutcomeInput) {
  const normalizedSlotId = normalizeSlotId(input.slotId);
  const state = await readDbState();
  const dbSlot = requireDbSlot(state, normalizedSlotId);

  // Find waitlist entry by candidateId (which may be passed in different formats)
  // Try to match by looking through call attempts or patient info
  let waitlistEntry = state.waitlistEntries.find((entry) => entry.id === input.candidateId);

  if (!waitlistEntry) {
    // Fallback: if we can't find by ID, might need to handle differently
    console.warn(
      `[OUTCOME] ⚠️  Could not find waitlist entry with id ${input.candidateId}. This may be a mismatch between candidate IDs.`,
    );
    // Try to find latest call attempt for this slot that matches
    const latestAttempt = state.callAttempts
      .filter((a) => a.slot_id === normalizedSlotId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .at(0);

    if (latestAttempt) {
      waitlistEntry = requireRow(
        state.waitlistEntries.find((entry) => entry.id === latestAttempt.waitlist_entry_id),
        "waitlist entry",
        latestAttempt.waitlist_entry_id,
      );
    } else {
      throw new Error(`Could not find waitlist entry for candidateId ${input.candidateId}`);
    }
  }

  if (input.providerEventId) {
    const existingEvent = state.callAttempts.find(
      (attempt) => attempt.provider_event_id === input.providerEventId,
    );
    if (existingEvent && existingEvent.outcome === input.outcome) {
      return { ok: true, duplicate: true, slot: mapDbSlotToLegacy(dbSlot, state) };
    }
  }

  const latestAttempt = latestCallAttempt(
    state.callAttempts.filter(
      (attempt) =>
        attempt.slot_id === normalizedSlotId && attempt.waitlist_entry_id === input.candidateId,
    ),
  );
  const endedAt = input.outcome === "ringing" ? null : new Date().toISOString();

  if (latestAttempt) {
    const { error } = await supabase
      .from("call_attempts")
      .update({
        outcome: input.outcome,
        provider_event_id: input.providerEventId ?? latestAttempt.provider_event_id,
        ended_at: endedAt,
        raw_payload: input.providerEventId ? { providerEventId: input.providerEventId } : null,
      })
      .eq("id", latestAttempt.id);
    throwIfSupabaseError(error, "record call outcome");
  } else {
    const { error } = await supabase.from("call_attempts").insert({
      waitlist_entry_id: waitlistEntry.id,
      patient_id: waitlistEntry.patient_id,
      slot_id: normalizedSlotId,
      provider: "fonio",
      provider_event_id: input.providerEventId ?? null,
      outcome: input.outcome,
      started_at: new Date().toISOString(),
      ended_at: endedAt,
    });
    throwIfSupabaseError(error, "insert call outcome");
  }

  console.log(
    `[OUTCOME] 📊 Recording ${input.outcome} for patient ${waitlistEntry.patient_id} on slot ${normalizedSlotId}`,
  );

  await supabase
    .from("patients")
    .update({ last_contacted_at: new Date().toISOString() })
    .eq("id", waitlistEntry.patient_id);

  console.log(
    `[OUTCOME] ✓ Updated patient last_contacted_at`,
  );

  if (input.outcome === "accepted") {
    console.log(
      `[OUTCOME] 🎉 ACCEPTED! Attempting to book slot for patient...`,
    );
    const booking = await attemptBooking({
      slotId: normalizedSlotId,
      candidateId: input.candidateId,
      waveId: input.waveId,
      source: "call_webhook",
    });
    console.log(
      `[OUTCOME] ${booking.ok ? "✓" : "❌"} Booking result: ${booking.message}`,
    );
    return {
      ok: true,
      booking,
      slot: await requireSlot(normalizedSlotId),
    };
  }

  if (input.outcome === "declined") {
    console.log(
      `[OUTCOME] 👋 DECLINED - Keeping patient in waitlist for future waves`,
    );
  }

  if (input.outcome === "no_answer") {
    console.log(
      `[OUTCOME] 📴 NO ANSWER - Keeping patient in waitlist for retry`,
    );
  }

  const nextState = await readDbState({ seedIfEmpty: false });
  const stillRinging = nextState.callAttempts.some(
    (attempt) => attempt.slot_id === normalizedSlotId && attempt.outcome === "ringing",
  );
  const nextDbSlot = requireDbSlot(nextState, normalizedSlotId);
  if (nextDbSlot.status === "OFFERING" && !stillRinging) {
    await updateSlot(normalizedSlotId, {
      status: nextDbSlot.new_waves_paused ? "PAUSED_NEW_WAVES" : "OPEN",
      last_event: "Wave closed without booking",
    });
  }

  return { ok: true, slot: await requireSlot(normalizedSlotId) };
}

export async function attemptBooking(input: AttemptBookingInput) {
  const resolved = await resolveCandidate(input);
  const { slot, patient, waitlistEntry } = resolved;

  if (slot.status === "BOOKED" || slot.booked_patient_id) {
    const runnerUp =
      slot.booked_patient_id !== patient.id ? await markRunnerUp(slot.id, waitlistEntry.id) : null;
    const updatedSlot = await requireSlot(slot.id);
    return {
      ok: false,
      code: "BOOKING_CONFLICT",
      message: `Could not book. Slot already booked by ${updatedSlot.bookedCustomer ?? "another patient"}.`,
      runnerUp,
      slot: updatedSlot,
    };
  }

  if (input.source === "call_webhook") {
    console.log(
      `[BOOKING] 📞 Validating call_webhook source: checking if wave is active...`,
    );
    const latestAttempt = latestCallAttemptFor(slot.id, waitlistEntry.id, await readDbState());
    if (slot.status !== "OFFERING" || !latestAttempt) {
      console.error(
        `[BOOKING] ❌ Wave is stale or no active call attempt (slot status: ${slot.status}, has attempt: ${!!latestAttempt})`,
      );
      await markRunnerUp(slot.id, waitlistEntry.id);
      return {
        ok: false,
        code: "STALE_WAVE",
        message: "Acceptance came from a stale or inactive wave.",
        slot: await requireSlot(slot.id),
      };
    }
  }

  if (input.source === "manual") {
    console.log(
      `[BOOKING] 👤 Manual booking: bypassing wave validation (receptionist override)`,
    );
  }

  if (slot.status === "EXPIRED") {
    return {
      ok: false,
      code: "SLOT_EXPIRED",
      message: "Cannot book an expired slot.",
      slot: resolved.mappedSlot,
    };
  }

  const recoveredMin = Math.max(minutesUntil(slot.starts_at), 0);
  const { data: updatedRows, error: updateError } = await supabase
    .from("slots")
    .update({
      status: "BOOKED" as DbSlotStatus,
      booked_patient_id: patient.id,
      needs_attention: false,
      last_event: `Booked ${patient.full_name}`,
      recovered_min_before_start: recoveredMin,
    })
    .eq("id", slot.id)
    .is("booked_patient_id", null)
    .in("status", ["OPEN", "OFFERING", "ESCALATED", "PAUSED_NEW_WAVES"])
    .select("*");
  throwIfSupabaseError(updateError, "book slot");

  if (!updatedRows?.length) {
    await markRunnerUp(slot.id, waitlistEntry.id);
    const latestSlot = await requireSlot(slot.id);
    return {
      ok: false,
      code: "BOOKING_CONFLICT",
      message: `Could not book. Slot already booked by ${latestSlot.bookedCustomer ?? "another patient"}.`,
      slot: latestSlot,
    };
  }

  console.log(
    `[BOOKING] 📝 Creating booking record for ${patient.full_name} on slot ${slot.id}`,
  );

  const latestAttempt = latestCallAttemptFor(slot.id, waitlistEntry.id, await readDbState());
  const { error: bookingError } = await supabase.from("bookings").insert({
    clinic_id: slot.clinic_id,
    patient_id: patient.id,
    slot_id: slot.id,
    waitlist_entry_id: waitlistEntry.id,
    call_attempt_id: latestAttempt?.id ?? null,
    status: "ACTIVE",
    source: toDbBookingSource(input.source),
    booked_at: new Date().toISOString(),
  });
  throwIfSupabaseError(bookingError, "create booking");

  console.log(
    `[BOOKING] ✓ Booking created. Now updating waitlist & call attempts...`,
  );

  console.log(
    `[BOOKING] 📋 Marking all waitlist entries for patient ${patient.id} as fulfilled...`,
  );

  // Mark ALL waitlist entries for this patient as fulfilled (they got a booking)
  const { error: updateAllError } = await supabase
    .from("waitlist_entries")
    .update({ status: "fulfilled" })
    .eq("patient_id", patient.id);

  if (updateAllError) {
    console.error(
      `[BOOKING] ⚠️  Error updating waitlist entries:`,
      updateAllError,
    );
  } else {
    console.log(
      `[BOOKING] ✓ All waitlist entries for patient marked as 'fulfilled'`,
    );
  }

  const updates = await Promise.all([
    markBookedAttempt(slot.id, waitlistEntry.id),
    markOtherAcceptedAsRunnerUp(slot.id, patient.id),
  ]);

  console.log(
    `[BOOKING] 🎉 BOOKING COMPLETE: ${patient.full_name} is now booked for slot ${slot.id}`,
  );

  return {
    ok: true,
    code: "BOOKED",
    message: `Booked ${patient.full_name}.`,
    slot: await requireSlot(slot.id),
  };
}

export async function setSlotPaused(slotId: string, paused: boolean) {
  const normalizedSlotId = normalizeSlotId(slotId);
  const state = await readDbState();
  const slot = requireDbSlot(state, normalizedSlotId);
  if (slot.status === "BOOKED" || slot.status === "EXPIRED") {
    return {
      ok: false,
      reason: `Cannot pause a ${slot.status} slot.`,
      slot: mapDbSlotToLegacy(slot, state),
    };
  }

  await updateSlot(normalizedSlotId, {
    new_waves_paused: paused,
    status: slot.status === "OFFERING" ? slot.status : paused ? "PAUSED_NEW_WAVES" : "OPEN",
    last_event: paused ? "New waves paused" : "New waves resumed",
    reasoning: paused
      ? "New waves are paused. Calls already ringing or in progress may still complete."
      : "Automation can dispatch the next wave when the slot is eligible.",
  });

  return { ok: true, slot: await requireSlot(normalizedSlotId) };
}

export async function escalateSlot(slotId: string, reason = "Escalated to receptionist") {
  const normalizedSlotId = normalizeSlotId(slotId);
  await updateSlot(normalizedSlotId, {
    status: "ESCALATED",
    needs_attention: true,
    last_event: reason,
  });
  return { ok: true, slot: await requireSlot(normalizedSlotId) };
}

export async function cancelAndReopen(slotId: string) {
  const normalizedSlotId = normalizeSlotId(slotId);
  const state = await readDbState();
  const activeBooking = state.bookings.find(
    (booking) => booking.slot_id === normalizedSlotId && booking.status === "ACTIVE",
  );

  if (activeBooking) {
    const cancelledAt = new Date().toISOString();
    await supabase
      .from("bookings")
      .update({
        status: "CANCELLED",
        cancelled_reason: "Receptionist cancelled and reopened slot",
        cancelled_at: cancelledAt,
      })
      .eq("id", activeBooking.id);
    if (activeBooking.waitlist_entry_id) {
      await supabase
        .from("waitlist_entries")
        .update({ status: "active" })
        .eq("id", activeBooking.waitlist_entry_id);
    }
  }

  await updateSlot(normalizedSlotId, {
    status: "OPEN",
    booked_patient_id: null,
    recovered_min_before_start: null,
    needs_attention: false,
    last_event: "Booking cancelled, slot reopened",
  });

  return { ok: true, slot: await requireSlot(normalizedSlotId) };
}

async function readDbState(): Promise<DbState> {
  const [patients, providers, services, slots, waitlistEntries, callAttempts, bookings] =
    await Promise.all([
      selectRows<DbPatient>("patients", "*", "created_at"),
      selectRows<DbProvider>("providers", "*", "created_at"),
      selectRows<DbService>("services", "*", "created_at"),
      selectRows<DbSlot>("slots", "*", "starts_at"),
      selectRows<DbWaitlistEntry>("waitlist_entries", "*", "joined_at"),
      selectRows<DbCallAttempt>("call_attempts", "*", "created_at"),
      selectRows<DbBooking>("bookings", "*", "created_at"),
    ]);

  return { patients, providers, services, slots, waitlistEntries, callAttempts, bookings };
}

async function selectRows<T>(table: string, columns: string, orderColumn: string): Promise<T[]> {
  try {
    // Use service role key by creating a direct query without RLS
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderColumn);

    if (error) {
      console.error(`[Supabase] Error selecting from ${table}:`, error);
      throw error;
    }

    return (data ?? []) as T[];
  } catch (err) {
    console.error(`[Supabase] Failed to read ${table}:`, err);
    // Return empty array as fallback to prevent cascade errors
    return [];
  }
}

function mapDbStateToBackendState(state: DbState) {
  return {
    slots: state.slots.map((slot) => mapDbSlotToLegacy(slot, state)),
    waitlist: buildWaitlistForApi(state),
  };
}

function buildWaitlistForApi(state: DbState) {
  const entriesByPatient = new Map<string, DbWaitlistEntry[]>();
  // Only include active waitlist entries (exclude fulfilled, expired)
  for (const entry of state.waitlistEntries.filter(
    (e) => e.status !== "fulfilled" && e.status !== "expired"
  )) {
    entriesByPatient.set(entry.patient_id, [
      ...(entriesByPatient.get(entry.patient_id) ?? []),
      entry,
    ]);
  }
  const callsByPatient = callsThisWeekByPatient(state.callAttempts);
  const servicesById = new Map(state.services.map((service) => [service.id, service]));

  return Array.from(entriesByPatient.entries())
    .map(([patientId, entries]) => {
      const patient = requireRow(
        state.patients.find((item) => item.id === patientId),
        "patient",
        patientId,
      );
      const priorityOverride = Math.max(
        ...entries.map((entry) => entry.priority_score_override ?? 0),
        patient.vip_priority,
      );
      const firstEntry = entries[0];
      const serviceNames = entries
        .map((entry) => {
          const service = servicesById.get(entry.service_id);
          return service?.name ?? "Unknown";
        })
        .filter((name, index, arr) => arr.indexOf(name) === index);

      return {
        id: patient.id,
        name: patient.full_name,
        phone: patient.phone_e164,
        email: patient.email,
        smsConsent: patient.sms_consent,
        preferredTimes: "Stored in preferences",
        serviceTypes: serviceNames,
        waitDays: Math.max(
          ...entries.map((entry) => daysBetween(entry.joined_at, new Date().toISOString())),
        ),
        contactsThisWeek: callsByPatient.get(patient.id) ?? 0,
        contactLimitPerWeek: patient.max_contacts_per_week_override ?? DEFAULT_CONTACT_LIMIT,
        consent: patient.voice_consent,
        lastContacted: formatRelativeContact(patient.last_contacted_at),
        priorityBoost:
          patient.vip_priority > 0
            ? "VIP"
            : priorityOverride >= 35
              ? "Runner-up priority"
              : undefined,
        eligibilityNotes:
          entries.find((entry) => entry.notes)?.notes ?? "Eligibility loaded from Supabase",
        status: toLegacyWaitlistStatus(entries),
        notes: entries.find((entry) => entry.notes)?.notes ?? undefined,
        slotId: firstEntry?.slot_id ?? null,
        hardDeadlineAt: firstEntry?.hard_deadline_at ?? null,
        snoozedUntil: firstEntry?.snoozed_until ?? null,
        recentContacts: state.callAttempts
          .filter((attempt) => attempt.patient_id === patient.id)
          .slice(-4)
          .map((attempt) => {
            const slot = state.slots.find((item) => item.id === attempt.slot_id);
            const service = slot ? servicesById.get(slot.service_id) : null;
            return {
              at: formatRelativeContact(attempt.started_at ?? attempt.created_at) ?? "recently",
              outcome: attempt.outcome,
              slot: slot ? `${formatTime(slot.starts_at)} ${service?.name ?? "Unknown"}` : "Unknown",
            };
          }),
      };
    })
    .sort((a, b) => b.waitDays - a.waitDays);
}

function mapDbSlotToLegacy(slot: DbSlot, state: DbState): Slot {
  const patientsById = new Map(state.patients.map((patient) => [patient.id, patient]));
  const providersById = new Map(state.providers.map((provider) => [provider.id, provider]));
  const servicesById = new Map(state.services.map((service) => [service.id, service]));

  const provider = requireRow(
    providersById.get(slot.provider_id),
    "provider",
    slot.provider_id,
  );
  const service = requireRow(
    servicesById.get(slot.service_id),
    "service",
    slot.service_id,
  );

  const attemptsForSlot = state.callAttempts.filter((attempt) => attempt.slot_id === slot.id);
  const attemptsByWaitlistEntry = new Map<string, DbCallAttempt>();
  for (const attempt of attemptsForSlot) {
    const current = attemptsByWaitlistEntry.get(attempt.waitlist_entry_id);
    if (!current || Date.parse(attempt.created_at) > Date.parse(current.created_at)) {
      attemptsByWaitlistEntry.set(attempt.waitlist_entry_id, attempt);
    }
  }
  const bookedPatient = slot.booked_patient_id ? patientsById.get(slot.booked_patient_id) : null;
  const matchingWaitlist = state.waitlistEntries.filter(
    (entry) => entry.service_id === slot.service_id,
  );
  const callCountByPatient = callsThisWeekByPatient(state.callAttempts);
  const candidates = matchingWaitlist
    .map((entry) => {
      const patient = requireRow(patientsById.get(entry.patient_id), "patient", entry.patient_id);
      const latestAttempt = attemptsByWaitlistEntry.get(entry.id);
      const contactLimit = patient.max_contacts_per_week_override ?? DEFAULT_CONTACT_LIMIT;
      const contactsThisWeek = callCountByPatient.get(patient.id) ?? 0;
      const hasConsent = patient.voice_consent === "granted";
      const isActive = entry.status === "active";
      const eligible = isActive && hasConsent && contactsThisWeek < contactLimit;
      const contactStatus = contactStatusForCandidate({
        slot,
        patient,
        entry,
        latestAttempt,
        eligible,
      });

      return {
        id: entry.id,
        rank: 0,
        name: patient.full_name,
        matchReason: candidateReason(entry, patient, slot, service.name),
        waitDays: daysBetween(entry.joined_at, new Date().toISOString()),
        contactStatus,
        eligible,
        lastContacted: formatRelativeContact(
          latestAttempt?.started_at ?? patient.last_contacted_at,
        ),
        skipReason: !hasConsent
          ? "Consent missing"
          : !isActive
            ? `Waitlist status: ${entry.status}`
            : contactsThisWeek >= contactLimit
              ? "Contact limit reached this week"
              : undefined,
        runnerUpBoost: entry.priority_score_override != null && entry.priority_score_override >= 35,
      };
    })
    .sort((a, b) => scoreCandidate(b) - scoreCandidate(a))
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));

  const ringingCandidates = candidates.filter((candidate) => candidate.contactStatus === "ringing");
  const activeWave =
    slot.status === "OFFERING" && ringingCandidates.length
      ? {
          id: `${slot.id}:active-wave`,
          number: Math.max(attemptsForSlot.length, 1),
          size: ringingCandidates.length,
          timeoutSec: 90,
          candidates: ringingCandidates.map((candidate) => ({
            name: candidate.name,
            state: candidate.contactStatus,
          })),
        }
      : undefined;
  const runnerUps = candidates.filter((candidate) => candidate.contactStatus === "runner_up");

  return {
    id: slot.id,
    timeLabel: formatTime(slot.starts_at),
    startsInMin: minutesUntil(slot.starts_at),
    provider: provider.display_name,
    service: service.name,
    status: slot.status,
    newWavesPaused: slot.new_waves_paused,
    fillMode: "Balanced",
    waveSize: activeWave?.size ?? 0,
    attempts: attemptsForSlot.length,
    attemptsTotal: Math.max(candidates.length, 4),
    lastEvent: slot.last_event ?? "Loaded from Supabase",
    needsAttention: slot.needs_attention,
    bookedCustomer: bookedPatient?.full_name,
    recoveredMinBeforeStart: slot.recovered_min_before_start ?? undefined,
    reasoning:
      slot.reasoning ??
      (slot.status === "OPEN"
        ? "Calling one at a time because there is enough runway."
        : "State loaded from Supabase."),
    qualitative: qualitative(slot.status, candidates),
    activeWave,
    timeline: buildTimeline(slot, attemptsForSlot, patientsById),
    candidates,
    runnerUp: runnerUps.length
      ? {
          winner: bookedPatient?.full_name ?? "Unknown winner",
          runnerUps: runnerUps.map((candidate) => ({
            name: candidate.name,
            messageStatus: "Runner-up priority active",
            priorityActive: true,
          })),
          note: "Runner-up priority applies to the next eligible matching opening.",
        }
      : undefined,
  };
}

function mapDbWaitlistToLegacy(state: DbState): WaitlistEntry[] {
  const entriesByPatient = new Map<string, DbWaitlistEntry[]>();
  for (const entry of state.waitlistEntries) {
    entriesByPatient.set(entry.patient_id, [
      ...(entriesByPatient.get(entry.patient_id) ?? []),
      entry,
    ]);
  }
  const callsByPatient = callsThisWeekByPatient(state.callAttempts);
  const servicesById = new Map(state.services.map((service) => [service.id, service]));

  return Array.from(entriesByPatient.entries())
    .map(([patientId, entries]) => {
      const patient = requireRow(
        state.patients.find((item) => item.id === patientId),
        "patient",
        patientId,
      );
      const priorityOverride = Math.max(
        ...entries.map((entry) => entry.priority_score_override ?? 0),
        patient.vip_priority,
      );
      const firstEntry = entries[0];
      const serviceNames = entries
        .map((entry) => {
          const service = servicesById.get(entry.service_id);
          return service?.name ?? "Unknown service";
        })
        .filter((name, index, arr) => arr.indexOf(name) === index);

      return {
        id: patient.id,
        name: patient.full_name,
        phone: patient.phone_e164,
        email: patient.email,
        smsConsent: patient.sms_consent,
        preferredTimes: "Stored in patient preferences / notes",
        serviceTypes: serviceNames,
        waitDays: Math.max(
          ...entries.map((entry) => daysBetween(entry.joined_at, new Date().toISOString())),
        ),
        contactsThisWeek: callsByPatient.get(patient.id) ?? 0,
        contactLimitPerWeek: patient.max_contacts_per_week_override ?? DEFAULT_CONTACT_LIMIT,
        consent: patient.voice_consent,
        lastContacted: formatRelativeContact(patient.last_contacted_at),
        priorityBoost:
          patient.vip_priority > 0
            ? "VIP"
            : priorityOverride >= 35
              ? "Runner-up priority"
              : undefined,
        eligibilityNotes:
          entries.find((entry) => entry.notes)?.notes ?? "Eligibility loaded from Supabase",
        status: toLegacyWaitlistStatus(entries),
        notes: entries.find((entry) => entry.notes)?.notes ?? undefined,
        slotId: firstEntry?.slot_id ?? null,
        hardDeadlineAt: firstEntry?.hard_deadline_at ?? null,
        snoozedUntil: firstEntry?.snoozed_until ?? null,
        recentContacts: state.callAttempts
          .filter((attempt) => attempt.patient_id === patient.id)
          .slice(-4)
          .map((attempt) => {
            const slot = state.slots.find((item) => item.id === attempt.slot_id);
            const service = slot ? servicesById.get(slot.service_id) : null;
            return {
              at: formatRelativeContact(attempt.started_at ?? attempt.created_at) ?? "recently",
              outcome: attempt.outcome,
              slot: slot ? `${formatTime(slot.starts_at)} ${service?.name ?? "Unknown"}` : "Unknown slot",
            };
          }),
      };
    })
    .sort((a, b) => b.waitDays - a.waitDays);
}

async function resolveCandidate(input: AttemptBookingInput): Promise<ResolvedCandidate> {
  const normalizedSlotId = normalizeSlotId(input.slotId);
  const state = await readDbState();
  const slot = requireDbSlot(state, normalizedSlotId);
  const mappedSlot = mapDbSlotToLegacy(slot, state);

  if (input.candidateId) {
    const waitlistEntry = requireRow(
      state.waitlistEntries.find((entry) => entry.id === input.candidateId),
      "waitlist entry",
      input.candidateId,
    );
    const patient = requireRow(
      state.patients.find((item) => item.id === waitlistEntry.patient_id),
      "patient",
      waitlistEntry.patient_id,
    );
    return { slot, patient, waitlistEntry, mappedSlot };
  }

  if (input.candidateName) {
    const patient =
      state.patients.find(
        (item) => item.full_name.toLowerCase() === input.candidateName?.toLowerCase(),
      ) ?? (await createManualPatient(input.candidateName));
    const waitlistEntry =
      state.waitlistEntries.find(
        (entry) => entry.patient_id === patient.id && entry.service_name === slot.service_name,
      ) ?? (await createManualWaitlistEntry(patient.id, slot.service_name));

    return { slot, patient, waitlistEntry, mappedSlot };
  }

  throw Object.assign(new Error("Candidate is required."), { statusCode: 400 });
}

async function createManualPatient(candidateName: string) {
  const state = await readDbState();
  const clinic = state.providers[0];

  if (!clinic) throw new Error("No clinic found");

  const { data, error } = await supabase
    .from("patients")
    .insert({
      clinic_id: clinic.clinic_id,
      full_name: candidateName,
      phone_e164: deterministicPhone(candidateName),
      sms_consent: "granted",
      voice_consent: "granted",
    })
    .select("*")
    .single();
  throwIfSupabaseError(error, "create manual patient");
  return data as DbPatient;
}

async function createManualWaitlistEntry(patientId: string, serviceName: string) {
  const state = await readDbState();
  const service = state.services.find((s) => s.name === serviceName);
  const clinic = state.providers[0];

  if (!service) throw new Error(`Service "${serviceName}" not found`);
  if (!clinic) throw new Error("No clinic found");

  const { data, error } = await supabase
    .from("waitlist_entries")
    .insert({
      clinic_id: clinic.clinic_id,
      patient_id: patientId,
      service_id: service.id,
      status: "active",
      joined_at: new Date().toISOString(),
      notes: "Created during manual booking",
    })
    .select("*")
    .single();
  throwIfSupabaseError(error, "create manual waitlist entry");
  return data as DbWaitlistEntry;
}

async function requireSlot(slotId: string) {
  const normalizedSlotId = normalizeSlotId(slotId);
  const slot = await getSlot(normalizedSlotId);
  if (!slot) throw Object.assign(new Error(`Slot ${slotId} not found.`), { statusCode: 404 });
  return slot;
}

async function requireMappedSlot(slotId: string) {
  return requireSlot(slotId);
}

async function updateSlot(slotId: string, patch: Partial<DbSlot>) {
  const { error } = await supabase.from("slots").update(patch).eq("id", normalizeSlotId(slotId));
  throwIfSupabaseError(error, "update slot");
}

async function markRunnerUp(slotId: string, waitlistEntryId: string) {
  const state = await readDbState();
  const entry = requireRow(
    state.waitlistEntries.find((item) => item.id === waitlistEntryId),
    "waitlist entry",
    waitlistEntryId,
  );
  const latestAttempt = latestCallAttemptFor(slotId, waitlistEntryId, state);
  if (latestAttempt) {
    await supabase
      .from("call_attempts")
      .update({ outcome: "runner_up", ended_at: new Date().toISOString() })
      .eq("id", latestAttempt.id);
  }
  await supabase
    .from("waitlist_entries")
    .update({ priority_score_override: Math.max(entry.priority_score_override ?? 0, 35) })
    .eq("id", waitlistEntryId);

  return {
    waitlistEntryId,
    messageStatus: "Runner-up priority stored in Supabase",
    priorityActive: true,
  };
}

async function markBookedAttempt(slotId: string, waitlistEntryId: string) {
  const state = await readDbState();
  const latestAttempt = latestCallAttemptFor(slotId, waitlistEntryId, state);
  if (!latestAttempt) {
    console.log(
      `[BOOKING] ℹ️  No call attempt found for this booking (probably manual booking) - skipping`,
    );
    return;
  }
  const { error } = await supabase
    .from("call_attempts")
    .update({ outcome: "booked", ended_at: new Date().toISOString() })
    .eq("id", latestAttempt.id);
  if (error) {
    console.error(`[BOOKING] ❌ Failed to mark call attempt as booked:`, error);
  }
}

async function markOtherAcceptedAsRunnerUp(slotId: string, winnerPatientId: string) {
  const state = await readDbState();
  const accepted = state.callAttempts.filter(
    (attempt) =>
      attempt.slot_id === slotId &&
      attempt.patient_id !== winnerPatientId &&
      attempt.outcome === "accepted",
  );
  await Promise.all(
    accepted.map(async (attempt) => {
      await supabase
        .from("call_attempts")
        .update({ outcome: "runner_up", ended_at: new Date().toISOString() })
        .eq("id", attempt.id);
      await supabase
        .from("waitlist_entries")
        .update({ priority_score_override: 35 })
        .eq("id", attempt.waitlist_entry_id);
    }),
  );
}


function requireDbSlot(state: DbState, slotId: string) {
  return requireRow(
    state.slots.find((slot) => slot.id === slotId),
    "slot",
    slotId,
  );
}

function requireRow<T>(row: T | undefined | null, label: string, id: string): T {
  if (!row) {
    throw Object.assign(new Error(`${label} ${id} not found.`), { statusCode: 404 });
  }
  return row;
}

function latestCallAttemptFor(slotId: string, waitlistEntryId: string, state: DbState) {
  return latestCallAttempt(
    state.callAttempts.filter(
      (attempt) => attempt.slot_id === slotId && attempt.waitlist_entry_id === waitlistEntryId,
    ),
  );
}

function latestCallAttempt(attempts: DbCallAttempt[]) {
  return attempts.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] ?? null;
}

function contactStatusForCandidate({
  slot,
  patient,
  entry,
  latestAttempt,
  eligible,
}: {
  slot: DbSlot;
  patient: DbPatient;
  entry: DbWaitlistEntry;
  latestAttempt?: DbCallAttempt;
  eligible: boolean;
}): CallOutcome {
  if (slot.booked_patient_id === patient.id) return "booked";
  if (latestAttempt) return latestAttempt.outcome;
  if (!eligible || entry.status !== "active") return "skipped";
  return "not_contacted";
}

function candidateReason(
  entry: DbWaitlistEntry,
  patient: DbPatient,
  slot: DbSlot,
  serviceName: string,
) {
  if (entry.priority_score_override != null && entry.priority_score_override >= 35) {
    return "Runner-up priority from previous accepted slot, eligible for this opening";
  }
  if (patient.vip_priority > 0) return "VIP priority, eligible for this opening";
  if (entry.notes) return entry.notes;
  return `Matches ${serviceName} waitlist request`;
}

function scoreCandidate(candidate: Slot["candidates"][number]) {
  if (!candidate.eligible) return -1_000 + candidate.waitDays;
  return (
    candidate.waitDays +
    (candidate.runnerUpBoost ? 100 : 0) +
    (candidate.contactStatus === "not_contacted" ? 10 : 0)
  );
}

function buildTimeline(
  slot: DbSlot,
  attempts: DbCallAttempt[],
  patientsById: Map<string, DbPatient>,
): Slot["timeline"] {
  const events: Slot["timeline"] = [
    {
      id: `${slot.id}-opened`,
      at: formatTime(slot.created_at),
      kind: "slot_opened",
      message: `Slot opened from ${slot.created_from}`,
    },
  ];

  for (const attempt of attempts.sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
  )) {
    const patient = patientsById.get(attempt.patient_id);
    events.push({
      id: attempt.id,
      at: formatTime(attempt.started_at ?? attempt.created_at),
      kind: "call_outcome",
      message: `${patient?.full_name ?? "Candidate"} - ${attempt.outcome.replace("_", " ")}`,
    });
  }

  if (slot.status === "BOOKED") {
    events.push({
      id: `${slot.id}-booked`,
      at: formatTime(slot.updated_at),
      kind: "booked",
      message: slot.last_event ?? "Slot booked",
    });
  }

  if (slot.status === "ESCALATED") {
    events.push({
      id: `${slot.id}-escalated`,
      at: formatTime(slot.updated_at),
      kind: "escalated",
      message: slot.last_event ?? "Escalated to receptionist",
    });
  }

  return events;
}

function callsThisWeekByPatient(callAttempts: DbCallAttempt[]) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const counts = new Map<string, number>();
  for (const attempt of callAttempts) {
    const timestamp = Date.parse(attempt.started_at ?? attempt.created_at);
    if (timestamp < weekAgo) continue;
    counts.set(attempt.patient_id, (counts.get(attempt.patient_id) ?? 0) + 1);
  }
  return counts;
}

function qualitative(status: Slot["status"], candidates: Slot["candidates"]) {
  if (status === "ESCALATED") return { responseRate: "-", fillConfidence: "No candidates" };
  const completed = candidates.filter((candidate) =>
    ["accepted", "booked", "runner_up", "declined", "no_answer"].includes(candidate.contactStatus),
  );
  if (completed.length < 3) return { responseRate: "Cold start", fillConfidence: "On track" };
  return { responseRate: "Normal", fillConfidence: status === "BOOKED" ? "Met" : "On track" };
}

function toLegacyWaitlistStatus(entries: DbWaitlistEntry[]): WaitlistEntry["status"] {
  if (entries.some((entry) => entry.status === "active")) return "active";
  if (entries.some((entry) => entry.status === "snoozed")) return "snoozed";
  return "paused";
}

function toDbBookingSource(source: BookingSource): DbBookingSource {
  return source === "seed" ? "calendar_seed" : source;
}

function minutesUntil(timestamp: string) {
  return Math.round((Date.parse(timestamp) - Date.now()) / 60000);
}

function daysBetween(start: string, end: string) {
  return Math.max(Math.floor((Date.parse(end) - Date.parse(start)) / 86400000), 0);
}


function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("de-AT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function formatRelativeContact(timestamp: string | null) {
  if (!timestamp) return null;
  const diffMin = Math.max(Math.round((Date.now() - Date.parse(timestamp)) / 60000), 0);
  if (diffMin < 2) return "now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffMin < 1440) return `${Math.round(diffMin / 60)}h ago`;
  return `${Math.round(diffMin / 1440)} days ago`;
}

function defaultDurationMin(service: string) {
  if (service.toLowerCase().includes("ct")) return 30;
  if (service.toLowerCase().includes("follow")) return 30;
  return 45;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeSlotId(value: string) {
  if (isUuid(value)) return value;

  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const normalized = hex.join("");

  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(
    12,
    16,
  )}-${normalized.slice(16, 20)}-${normalized.slice(20)}`;
}

function deterministicPhone(value: string) {
  const digits = createHash("sha256").update(value).digest("hex").slice(0, 10);
  const numeric = Array.from(digits)
    .map((char) => Number.parseInt(char, 16) % 10)
    .join("");
  return `+1555${numeric}`;
}


function throwIfSupabaseError(error: { message: string } | null, action: string) {
  if (error) {
    if (error.message.toLowerCase().includes("row-level security")) {
      throw new Error(
        `Supabase ${action} failed: RLS blocked this write. Add SUPABASE_SERVICE_ROLE_KEY to .env.local or disable/add write policies for the hackathon tables.`,
      );
    }
    throw new Error(`Supabase ${action} failed: ${error.message}`);
  }
}
