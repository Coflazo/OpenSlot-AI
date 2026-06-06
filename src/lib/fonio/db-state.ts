import { initialSlots, initialWaitlist } from "./mock-data";
import type {
  BookingRow,
  BookingView,
  CallAttemptRow,
  CallOutcome,
  Candidate,
  CandidateView,
  ClinicRow,
  OpenSlotDbState,
  PatientRow,
  PriorityBumpRow,
  ProviderRow,
  ServiceRow,
  Slot,
  SlotOfferRow,
  SlotRow,
  SlotTimelineEventRow,
  SlotView,
  SlotWaveRow,
  SlotWaveView,
  WaitlistEntry,
  WaitlistEntryRow,
  WaitlistView,
} from "./types";

const CLINIC_ID = "clinic-radiology-group-vienna";
const DB_NOW = "2026-06-06T10:18:00+02:00";
const CREATED_AT = "2026-06-06T08:00:00+02:00";

export function createOpenSlotDbFromLegacy(
  slots: Slot[] = initialSlots,
  waitlist: WaitlistEntry[] = initialWaitlist,
): OpenSlotDbState {
  const providers = uniqueRows(
    slots.map((slot) => ({
      id: providerId(slot.provider),
      clinic_id: CLINIC_ID,
      external_provider_id: null,
      display_name: slot.provider,
      active: true,
      created_at: CREATED_AT,
      updated_at: CREATED_AT,
    })),
  );
  const services = uniqueRows(
    [
      ...slots.flatMap((slot) => [slot.service]),
      ...waitlist.flatMap((entry) => entry.serviceTypes),
    ].map((service) => ({
      id: serviceId(service),
      clinic_id: CLINIC_ID,
      name: service,
      duration_min: service === "CT Scan" ? 30 : 45,
      value_cents: service === "CT Scan" ? 22000 : null,
      active: true,
      created_at: CREATED_AT,
      updated_at: CREATED_AT,
    })),
  );
  const patientNames = Array.from(
    new Set([
      ...waitlist.map((entry) => entry.name),
      ...slots.flatMap((slot) => [
        ...slot.candidates.map((candidate) => candidate.name),
        slot.bookedCustomer,
        ...(slot.runnerUp?.runnerUps.map((runnerUp) => runnerUp.name) ?? []),
      ]),
    ]),
  ).filter(Boolean) as string[];
  const waitlistByName = new Map(waitlist.map((entry) => [entry.name, entry]));
  const patients = patientNames.map((name, index): PatientRow => {
    const waitlistEntry = waitlistByName.get(name);
    return {
      id: patientId(name),
      clinic_id: CLINIC_ID,
      external_patient_id: null,
      full_name: name,
      phone_e164: `+155501${String(index + 1).padStart(4, "0")}`,
      email: null,
      sms_consent: waitlistEntry?.consent ?? "granted",
      voice_consent: waitlistEntry?.consent ?? "granted",
      vip_priority: waitlistEntry?.priorityBoost?.startsWith("VIP") ? 50 : 0,
      max_contacts_per_week_override: waitlistEntry?.contactLimitPerWeek ?? null,
      last_contacted_at: toContactTimestamp(waitlistEntry?.lastContacted ?? null),
      created_at: CREATED_AT,
      updated_at: CREATED_AT,
    };
  });
  const waitlistRows = waitlist.flatMap((entry): WaitlistEntryRow[] =>
    entry.serviceTypes.map((service) => ({
      id: `${entry.id}-${slug(service)}`,
      clinic_id: CLINIC_ID,
      patient_id: patientId(entry.name),
      service_id: serviceId(service),
      preferred_provider_id: null,
      status: entry.status,
      joined_at: daysBeforeNow(entry.waitDays),
      hard_deadline_at: null,
      snoozed_until: entry.status === "snoozed" ? "2026-06-08T08:00:00+02:00" : null,
      priority_score_override: entry.priorityBoost ? 35 : null,
      notes: entry.notes ?? entry.eligibilityNotes,
      created_at: daysBeforeNow(entry.waitDays),
      updated_at: CREATED_AT,
    })),
  );

  const slotRows: SlotRow[] = [];
  const bookingRows: BookingRow[] = [];
  const waveRows: SlotWaveRow[] = [];
  const offerRows: SlotOfferRow[] = [];
  const callAttemptRows: CallAttemptRow[] = [];
  const priorityBumps: PriorityBumpRow[] = [];
  const timelineRows: SlotTimelineEventRow[] = [];

  for (const slot of slots) {
    const activeWaveId = slot.activeWave
      ? (slot.activeWave.id ?? `${slot.id}:wave:${slot.activeWave.number}`)
      : null;
    const bookedPatientId = slot.bookedCustomer ? patientId(slot.bookedCustomer) : null;
    const bookingId = bookedPatientId ? `booking-${slot.id}` : null;

    slotRows.push({
      id: slot.id,
      clinic_id: CLINIC_ID,
      provider_id: providerId(slot.provider),
      service_id: serviceId(slot.service),
      external_calendar_event_id: slot.id,
      starts_at: slotStart(slot.timeLabel),
      ends_at: addMinutes(slotStart(slot.timeLabel), 30),
      status: slot.status,
      fill_mode: slot.fillMode,
      active_wave_id: activeWaveId,
      booked_booking_id: bookingId,
      new_waves_paused: slot.newWavesPaused ?? false,
      needs_attention: slot.needsAttention,
      last_event: slot.lastEvent,
      reasoning: slot.reasoning,
      recovered_min_before_start: slot.recoveredMinBeforeStart ?? null,
      created_from: "calendar_cancellation",
      created_at: CREATED_AT,
      updated_at: CREATED_AT,
    });

    if (bookedPatientId && bookingId) {
      bookingRows.push({
        id: bookingId,
        clinic_id: CLINIC_ID,
        patient_id: bookedPatientId,
        slot_id: slot.id,
        service_id: serviceId(slot.service),
        status: "ACTIVE",
        source: "call_webhook",
        external_calendar_event_id: null,
        preference_fit: "acceptable",
        upgrade_opt_in: true,
        replaced_by_booking_id: null,
        cancelled_reason: null,
        booked_at: CREATED_AT,
        cancelled_at: null,
        created_at: CREATED_AT,
        updated_at: CREATED_AT,
      });
    }

    if (slot.activeWave && activeWaveId) {
      waveRows.push({
        id: activeWaveId,
        clinic_id: CLINIC_ID,
        slot_id: slot.id,
        wave_number: slot.activeWave.number,
        wave_size: slot.activeWave.size,
        p_estimate: 0.3,
        target_fill_probability:
          slot.fillMode === "Aggressive" ? 0.92 : slot.fillMode === "Patient" ? 0.65 : 0.8,
        k_needed: Math.max(slot.attemptsTotal, 1),
        waves_possible: Math.max(Math.floor(slot.startsInMin / 7), 0),
        timeout_at: addSeconds(DB_NOW, slot.activeWave.timeoutSec),
        status: "active",
        created_at: CREATED_AT,
      });
    }

    slot.timeline.forEach((event) => {
      timelineRows.push({
        id: `${slot.id}-${event.id}`,
        clinic_id: CLINIC_ID,
        slot_id: slot.id,
        kind: event.kind,
        message: event.message,
        metadata: { legacy_at: event.at },
        created_at: event.at === "now" ? DB_NOW : `2026-06-06T${event.at}:00+02:00`,
      });
    });

    slot.candidates.forEach((candidate) => {
      const patient_id = patientId(candidate.name);
      const waveCandidate = slot.activeWave?.candidates.find(
        (item) => item.name === candidate.name,
      );
      const wave_id = waveCandidate && activeWaveId ? activeWaveId : null;
      const offerId = `${slot.id}-offer-${candidate.id}`;
      const waitlist_entry_id = waitlistRows.find(
        (entry) => entry.patient_id === patient_id && entry.service_id === serviceId(slot.service),
      )?.id;

      offerRows.push({
        id: offerId,
        clinic_id: CLINIC_ID,
        slot_id: slot.id,
        wave_id,
        patient_id,
        waitlist_entry_id: waitlist_entry_id ?? null,
        current_booking_id: null,
        offer_type: "waitlist",
        status: offerStatus(candidate.contactStatus),
        rank: candidate.rank,
        score: Math.max(100 - candidate.rank * 7 + candidate.waitDays, 1),
        score_breakdown: {
          wait: candidate.waitDays,
          acceptance: candidate.contactStatus === "no_answer" ? 4 : 12,
          priority: candidate.runnerUpBoost ? 35 : 0,
          preference: candidate.matchReason.toLowerCase().includes("preference") ? 16 : 10,
          cooldownPenalty: candidate.skipReason ? 30 : 0,
        },
        reason: candidate.matchReason,
        expires_at: waveCandidate ? addSeconds(DB_NOW, slot.activeWave?.timeoutSec ?? 90) : null,
        accepted_at:
          candidate.contactStatus === "accepted" || candidate.contactStatus === "booked"
            ? DB_NOW
            : null,
        created_at: CREATED_AT,
        updated_at: CREATED_AT,
      });

      if (candidate.contactStatus !== "not_contacted" && candidate.contactStatus !== "skipped") {
        callAttemptRows.push({
          id: `${offerId}-call`,
          clinic_id: CLINIC_ID,
          slot_offer_id: offerId,
          provider: "fonio",
          provider_call_id: null,
          provider_event_id: `${offerId}-event`,
          outcome: candidate.contactStatus,
          started_at:
            candidate.lastContacted === "now"
              ? DB_NOW
              : toContactTimestamp(candidate.lastContacted),
          ended_at: null,
          transcript_url: null,
          raw_payload: null,
          created_at: CREATED_AT,
          updated_at: CREATED_AT,
        });
      }

      if (candidate.runnerUpBoost) {
        priorityBumps.push(priorityBump(patient_id, serviceId(slot.service), slot.id, "runner_up"));
      }
    });

    slot.runnerUp?.runnerUps.forEach((runnerUp) => {
      priorityBumps.push(
        priorityBump(patientId(runnerUp.name), serviceId(slot.service), slot.id, "runner_up"),
      );
    });
  }

  waitlist.forEach((entry) => {
    if (entry.priorityBoost?.startsWith("VIP")) {
      priorityBumps.push(priorityBump(patientId(entry.name), null, null, "vip"));
    }
  });

  const clinic: ClinicRow = {
    id: CLINIC_ID,
    name: "Radiology Group Vienna",
    timezone: "Europe/Vienna",
    fill_mode_default: "Balanced",
    quiet_hours_start: "20:00",
    quiet_hours_end: "08:00",
    max_contacts_per_patient_per_week: 2,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
  };

  return {
    now: DB_NOW,
    clinics: [clinic],
    providers,
    services,
    patients,
    patient_preferences: [],
    slots: slotRows,
    bookings: bookingRows,
    waitlist_entries: waitlistRows,
    slot_waves: waveRows,
    slot_offers: offerRows,
    call_attempts: callAttemptRows,
    booking_attempts: [],
    priority_bumps: uniqueRows(priorityBumps),
    priority_rules: [],
    integration_events: [],
    slot_timeline_events: timelineRows,
  };
}

export function buildSlotViews(db: OpenSlotDbState): SlotView[] {
  return db.slots.map((row) => {
    const provider = requireRow(
      db.providers.find((item) => item.id === row.provider_id),
      "provider",
      row.provider_id,
    );
    const service = requireRow(
      db.services.find((item) => item.id === row.service_id),
      "service",
      row.service_id,
    );
    const offers = db.slot_offers.filter((offer) => offer.slot_id === row.id);
    const callAttemptsByOffer = new Map(
      db.call_attempts.map((attempt) => [attempt.slot_offer_id, attempt]),
    );
    const candidates = offers
      .map((offer): CandidateView => {
        const patient = requireRow(
          db.patients.find((item) => item.id === offer.patient_id),
          "patient",
          offer.patient_id,
        );
        const waitlistEntry = db.waitlist_entries.find(
          (entry) => entry.id === offer.waitlist_entry_id,
        );
        const callAttempt = callAttemptsByOffer.get(offer.id);
        return {
          offer,
          patient,
          waitlistEntry,
          callAttempt,
          id: patient.id,
          name: patient.full_name,
          rank: offer.rank,
          matchReason: offer.reason,
          waitDays: waitlistEntry ? daysBetween(waitlistEntry.joined_at, db.now) : 0,
          contactStatus: callAttempt?.outcome ?? contactStatusFromOffer(offer.status),
          eligible: offer.status !== "cancelled" && offer.status !== "lost_conflict",
          lastContacted: formatRelativeContact(
            callAttempt?.started_at ?? patient.last_contacted_at,
          ),
          skipReason: offer.status === "cancelled" ? "Offer cancelled" : undefined,
          runnerUpBoost: db.priority_bumps.some(
            (bump) => bump.active && bump.reason === "runner_up" && bump.patient_id === patient.id,
          ),
        };
      })
      .sort((a, b) => a.offer.rank - b.offer.rank);

    const activeWaveRow = row.active_wave_id
      ? db.slot_waves.find((wave) => wave.id === row.active_wave_id)
      : undefined;
    const activeWave = activeWaveRow
      ? buildWaveView(
          activeWaveRow,
          candidates.filter((candidate) => candidate.offer.wave_id === activeWaveRow.id),
        )
      : undefined;
    const booking = row.booked_booking_id
      ? db.bookings.find((item) => item.id === row.booked_booking_id)
      : undefined;
    const bookedBooking: BookingView | undefined = booking
      ? {
          booking,
          patient: requireRow(
            db.patients.find((item) => item.id === booking.patient_id),
            "patient",
            booking.patient_id,
          ),
        }
      : undefined;
    const timeline = db.slot_timeline_events
      .filter((event) => event.slot_id === row.id)
      .map((event) => ({
        id: event.id,
        at: formatTime(event.created_at),
        kind: event.kind,
        message: event.message,
      }));
    const runnerBumps = db.priority_bumps.filter(
      (bump) => bump.active && bump.reason === "runner_up" && bump.source_slot_id === row.id,
    );

    return {
      row,
      provider,
      service,
      bookedBooking,
      id: row.id,
      timeLabel: formatTime(row.starts_at),
      startsInMin: Math.round((Date.parse(row.starts_at) - Date.parse(db.now)) / 60000),
      status: row.status,
      newWavesPaused: row.new_waves_paused,
      fillMode: row.fill_mode,
      waveSize: activeWave?.size ?? 0,
      attempts: db.call_attempts.filter((attempt) =>
        offers.some((offer) => offer.id === attempt.slot_offer_id),
      ).length,
      attemptsTotal: Math.max(offers.length, 4),
      lastEvent: row.last_event ?? "",
      needsAttention: row.needs_attention,
      bookedCustomer: bookedBooking?.patient,
      recoveredMinBeforeStart: row.recovered_min_before_start ?? undefined,
      reasoning: row.reasoning ?? "",
      qualitative: qualitative(row.status, candidates),
      activeWave,
      timeline,
      candidates,
      runnerUp: runnerBumps.length
        ? {
            winner: bookedBooking?.patient ?? null,
            runnerUps: runnerBumps.map((bump) => ({
              patient: requireRow(
                db.patients.find((item) => item.id === bump.patient_id),
                "patient",
                bump.patient_id,
              ),
              messageStatus: "Runner-up message queued",
              priorityActive: bump.active,
            })),
            note: "Runner-up priority applies to the next eligible matching opening.",
          }
        : undefined,
    };
  });
}

export function buildWaitlistViews(db: OpenSlotDbState): WaitlistView[] {
  return db.patients
    .map((patient) => {
      const entries = db.waitlist_entries.filter((entry) => entry.patient_id === patient.id);
      if (!entries.length) return null;
      const priority = db.priority_bumps.find(
        (bump) => bump.active && bump.patient_id === patient.id,
      );
      const serviceTypes = entries.map(
        (entry) =>
          requireRow(
            db.services.find((service) => service.id === entry.service_id),
            "service",
            entry.service_id,
          ).name,
      );

      return {
        patient,
        entries,
        id: patient.id,
        name: patient.full_name,
        preferredTimes: "Stored in patient_preferences",
        serviceTypes,
        waitDays: Math.max(...entries.map((entry) => daysBetween(entry.joined_at, db.now))),
        contactsThisWeek: db.call_attempts.filter((attempt) => {
          const offer = db.slot_offers.find((item) => item.id === attempt.slot_offer_id);
          return offer?.patient_id === patient.id;
        }).length,
        contactLimitPerWeek:
          patient.max_contacts_per_week_override ?? db.clinics[0].max_contacts_per_patient_per_week,
        consent: patient.voice_consent,
        lastContacted: formatRelativeContact(patient.last_contacted_at),
        priorityBoost:
          priority?.reason === "vip"
            ? "VIP"
            : priority?.reason === "runner_up"
              ? "Runner-up priority"
              : undefined,
        eligibilityNotes: "Eligibility stored in waitlist_entries and patient_preferences",
        status: entries.some((entry) => entry.status === "active")
          ? "active"
          : entries.some((entry) => entry.status === "snoozed")
            ? "snoozed"
            : "paused",
        notes: entries.find((entry) => entry.notes)?.notes ?? undefined,
      } satisfies WaitlistView;
    })
    .filter(Boolean)
    .sort((a, b) => b.waitDays - a.waitDays);
}

function buildWaveView(row: SlotWaveRow, candidates: CandidateView[]): SlotWaveView {
  return {
    row,
    id: row.id,
    number: row.wave_number,
    size: row.wave_size,
    timeoutSec: Math.max(Math.round((Date.parse(row.timeout_at) - Date.parse(DB_NOW)) / 1000), 0),
    offers: candidates,
    candidates: candidates.map((candidate) => ({
      name: candidate.patient.full_name,
      state: candidate.contactStatus,
    })),
  };
}

function priorityBump(
  patient_id: string,
  service_id: string | null,
  source_slot_id: string | null,
  reason: "runner_up" | "vip",
): PriorityBumpRow {
  return {
    id: `priority-${reason}-${patient_id}-${source_slot_id ?? "global"}`,
    clinic_id: CLINIC_ID,
    patient_id,
    service_id,
    provider_id: null,
    reason,
    source_slot_id,
    source_booking_attempt_id: null,
    boost_points: reason === "vip" ? 50 : 35,
    active: true,
    expires_at: null,
    created_at: CREATED_AT,
    consumed_at: null,
  };
}

function offerStatus(outcome: CallOutcome): SlotOfferRow["status"] {
  if (outcome === "ringing") return "calling";
  if (outcome === "accepted" || outcome === "booked") return "accepted";
  if (outcome === "declined") return "declined";
  if (outcome === "no_answer") return "timed_out";
  if (outcome === "runner_up") return "lost_conflict";
  if (outcome === "skipped") return "cancelled";
  return "queued";
}

function contactStatusFromOffer(status: SlotOfferRow["status"]): CallOutcome {
  if (status === "calling") return "ringing";
  if (status === "accepted") return "accepted";
  if (status === "declined") return "declined";
  if (status === "timed_out") return "no_answer";
  if (status === "lost_conflict") return "runner_up";
  if (status === "cancelled") return "skipped";
  return "not_contacted";
}

function qualitative(status: Slot["status"], candidates: CandidateView[]) {
  if (status === "ESCALATED") return { responseRate: "-", fillConfidence: "No candidates" };
  const completed = candidates.filter((candidate) =>
    ["accepted", "booked", "runner_up", "declined", "no_answer"].includes(candidate.contactStatus),
  );
  if (completed.length < 3) return { responseRate: "Cold start", fillConfidence: "On track" };
  return { responseRate: "Normal", fillConfidence: status === "BOOKED" ? "Met" : "On track" };
}

function providerId(name: string) {
  return `provider-${slug(name)}`;
}

function serviceId(name: string) {
  return `service-${slug(name)}`;
}

function patientId(name: string) {
  return `patient-${slug(name)}`;
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function slotStart(timeLabel: string) {
  return `2026-06-06T${timeLabel}:00+02:00`;
}

function addMinutes(iso: string, minutes: number) {
  return new Date(Date.parse(iso) + minutes * 60000).toISOString();
}

function addSeconds(iso: string, seconds: number) {
  return new Date(Date.parse(iso) + seconds * 1000).toISOString();
}

function daysBeforeNow(days: number) {
  return new Date(Date.parse(DB_NOW) - days * 24 * 60 * 60000).toISOString();
}

function daysBetween(from: string, to: string) {
  return Math.max(Math.round((Date.parse(to) - Date.parse(from)) / (24 * 60 * 60000)), 0);
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Vienna",
  }).format(new Date(iso));
}

function formatRelativeContact(iso: string | null | undefined) {
  if (!iso) return null;
  const diffMin = Math.round((Date.parse(DB_NOW) - Date.parse(iso)) / 60000);
  if (diffMin <= 1) return "now";
  if (diffMin < 60) return `${diffMin} min ago`;
  return `${Math.round(diffMin / 1440)} days ago`;
}

function toContactTimestamp(value: string | null | undefined) {
  if (!value) return null;
  if (value === "now") return DB_NOW;
  if (/^\d{2}:\d{2}$/.test(value)) return `2026-06-06T${value}:00+02:00`;
  if (value.includes("day"))
    return new Date(Date.parse(DB_NOW) - 2 * 24 * 60 * 60000).toISOString();
  return null;
}

function uniqueRows<T extends { id: string }>(rows: T[]) {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values());
}

function requireRow<T>(row: T | undefined, table: string, id: string): T {
  if (!row) throw new Error(`Missing ${table} row ${id}`);
  return row;
}
