import type {
  BookingRow,
  CallAttemptRow,
  CallOutcome,
  ClinicRow,
  OpenSlotDbState,
  PatientRow,
  ProviderRow,
  ServiceRow,
  SlotOfferRow,
  SlotRow,
  SlotTimelineEventRow,
  SlotWaveRow,
  WaitlistEntryRow,
} from "./types";

const CLINIC_ID = "clinic-radiology-group-vienna";
const SIM_NOW = "2026-06-07T10:30:00+02:00";
const SIM_START = "2026-05-11T08:00:00+02:00";

const providers = [
  "Dr. Weber",
  "Dr. Klein",
  "Dr. Novak",
  "Dr. Steiner",
  "Dr. Gruber",
  "Dr. Fischer",
];

const services = [
  { name: "CT Scan", duration: 30, value: 22000 },
  { name: "MRI", duration: 45, value: 34000 },
  { name: "Ultrasound", duration: 25, value: 15000 },
  { name: "Consultation", duration: 40, value: 12000 },
  { name: "X-ray", duration: 20, value: 9000 },
  { name: "Mammography", duration: 30, value: 18000 },
  { name: "Follow-up", duration: 25, value: 8000 },
];

const patients = [
  "Anna Berger",
  "Tobias Lang",
  "Sophie Huber",
  "Maria Schmidt",
  "Jonas Pirker",
  "Eva Reiter",
  "Daniel Brunner",
  "Linda Vogel",
  "Klara Fuchs",
  "Markus Wolf",
  "Lea Bauer",
  "Nina Hofer",
  "Paul Wagner",
  "Sara Mayer",
  "Oskar Leitner",
  "Felix Haas",
  "Mira Schmid",
  "Theresa Pohl",
  "David Graf",
  "Nora Weiss",
  "Ahmed Yilmaz",
  "Elena Rossi",
  "Martin Koller",
  "Julia Auer",
  "Noah Binder",
  "Maja Frank",
  "Lena Hoelzl",
  "Petra Eder",
  "Simon Brandl",
  "Hanna Fink",
];

const slotTimes = ["08:20", "09:10", "10:00", "10:50", "11:40", "13:10", "14:00", "15:20"];

export function buildFourWeekSimulationState(): OpenSlotDbState {
  const providerRows = providers.map(
    (name): ProviderRow => ({
      id: providerId(name),
      clinic_id: CLINIC_ID,
      external_provider_id: null,
      display_name: name,
      active: true,
      created_at: SIM_START,
      updated_at: SIM_START,
    }),
  );

  const serviceRows = services.map(
    (service): ServiceRow => ({
      id: serviceId(service.name),
      clinic_id: CLINIC_ID,
      name: service.name,
      duration_min: service.duration,
      value_cents: service.value,
      active: true,
      created_at: SIM_START,
      updated_at: SIM_START,
    }),
  );

  const patientRows = patients.map(
    (name, index): PatientRow => ({
      id: patientId(name),
      clinic_id: CLINIC_ID,
      external_patient_id: null,
      full_name: name,
      phone_e164: `+43676${String(4000000 + index * 137).padStart(7, "0")}`,
      email: `${slug(name).replaceAll("-", ".")}@example.test`,
      sms_consent: "granted",
      voice_consent: index % 13 === 0 ? "pending" : "granted",
      vip_priority: index % 11 === 0 ? 50 : 0,
      max_contacts_per_week_override: index % 7 === 0 ? 3 : null,
      last_contacted_at: isoForDay(24 + (index % 4), slotTimes[index % slotTimes.length]),
      created_at: isoForDay(Math.max(0, index - 9), "08:00"),
      updated_at: SIM_NOW,
    }),
  );

  const waitlistRows = patientRows.flatMap((patient, index): WaitlistEntryRow[] => {
    const primaryService = services[index % services.length].name;
    const secondaryService = services[(index + 2) % services.length].name;
    return [primaryService, secondaryService]
      .slice(0, index % 3 === 0 ? 2 : 1)
      .map((service, serviceIndex) => ({
        id: `wait-${slug(patient.full_name)}-${slug(service)}`,
        clinic_id: CLINIC_ID,
        patient_id: patient.id,
        service_id: serviceId(service),
        preferred_provider_id:
          index % 4 === 0 ? providerId(providers[index % providers.length]) : null,
        status: index % 17 === 0 ? "snoozed" : "active",
        joined_at: addDays(SIM_NOW, -(8 + ((index * 5 + serviceIndex * 9) % 36))),
        hard_deadline_at: null,
        snoozed_until: index % 17 === 0 ? addDays(SIM_NOW, 1) : null,
        priority_score_override: patient.vip_priority ? 35 : null,
        notes: index % 5 === 0 ? "Prefers morning slots" : null,
        created_at: addDays(SIM_NOW, -(8 + ((index * 5 + serviceIndex * 9) % 36))),
        updated_at: SIM_NOW,
      }));
  });

  const slots: SlotRow[] = [];
  const bookings: BookingRow[] = [];
  const waves: SlotWaveRow[] = [];
  const offers: SlotOfferRow[] = [];
  const attempts: CallAttemptRow[] = [];
  const timeline: SlotTimelineEventRow[] = [];

  for (let day = 0; day < 28; day += 1) {
    const slotsThisDay = 4 + (day % 3);
    for (let index = 0; index < slotsThisDay; index += 1) {
      const provider = providers[(day + index * 2) % providers.length];
      const service = services[(day * 2 + index) % services.length];
      const startsAt = isoForDay(day, slotTimes[(day + index) % slotTimes.length]);
      const slotId = `sim-slot-${String(day + 1).padStart(2, "0")}-${index + 1}`;
      const status = statusForSlot(day, index);
      const fillMode = index % 5 === 0 ? "Aggressive" : index % 4 === 0 ? "Patient" : "Balanced";
      const openedAt = addMinutes(startsAt, -(90 + ((day + index) % 5) * 18));
      const duration = service.duration;
      const waveSize = Math.min(4, 1 + ((day + index) % 4));
      const activeWaveId = status === "OFFERING" ? `${slotId}-wave-active` : null;
      const candidateCount = 4 + ((day + index) % 4);
      const bookedPatient =
        status === "BOOKED" ? patientRows[(day * 3 + index) % patientRows.length] : null;
      const bookingId = bookedPatient ? `booking-${slotId}` : null;
      const recoveredMin = status === "BOOKED" ? 18 + ((day * 7 + index * 11) % 98) : null;

      slots.push({
        id: slotId,
        clinic_id: CLINIC_ID,
        provider_id: providerId(provider),
        service_id: serviceId(service.name),
        external_calendar_event_id: slotId,
        starts_at: startsAt,
        ends_at: addMinutes(startsAt, duration),
        status,
        fill_mode: fillMode,
        active_wave_id: activeWaveId,
        booked_booking_id: bookingId,
        new_waves_paused: status === "PAUSED_NEW_WAVES",
        needs_attention: status === "OFFERING" && minutesUntil(startsAt) <= 30,
        last_event: lastEventFor(status, bookedPatient?.full_name, provider),
        reasoning: reasoningFor(status, service.name, provider, recoveredMin),
        recovered_min_before_start: recoveredMin,
        created_from: index % 2 === 0 ? "calendar_cancellation" : "reschedule_request",
        created_at: openedAt,
        updated_at:
          status === "BOOKED" ? addMinutes(startsAt, -Math.max(recoveredMin ?? 20, 8)) : openedAt,
      });

      timeline.push(
        event(slotId, "opened", "slot_opened", openedAt, "Slot opened from calendar change"),
      );
      timeline.push(
        event(
          slotId,
          "ranking",
          "ranking",
          addMinutes(openedAt, 1),
          `Ranked waitlist for ${service.name} with ${provider}`,
        ),
      );

      if (bookedPatient && bookingId) {
        bookings.push({
          id: bookingId,
          clinic_id: CLINIC_ID,
          patient_id: bookedPatient.id,
          slot_id: slotId,
          service_id: serviceId(service.name),
          status: "ACTIVE",
          source: "call_webhook",
          external_calendar_event_id: null,
          preference_fit: "good",
          upgrade_opt_in: true,
          replaced_by_booking_id: null,
          cancelled_reason: null,
          booked_at: addMinutes(startsAt, -Math.max(recoveredMin ?? 20, 8)),
          cancelled_at: null,
          created_at: addMinutes(startsAt, -Math.max(recoveredMin ?? 20, 8)),
          updated_at: addMinutes(startsAt, -Math.max(recoveredMin ?? 20, 8)),
        });
      }

      if (activeWaveId) {
        waves.push({
          id: activeWaveId,
          clinic_id: CLINIC_ID,
          slot_id: slotId,
          wave_number: 1 + ((day + index) % 3),
          wave_size: waveSize,
          p_estimate: 0.28 + ((day + index) % 5) * 0.03,
          target_fill_probability:
            fillMode === "Aggressive" ? 0.92 : fillMode === "Patient" ? 0.65 : 0.8,
          k_needed: waveSize,
          waves_possible: Math.max(Math.floor(minutesUntil(startsAt) / 8), 1),
          timeout_at: addMinutes(SIM_NOW, 2 + index),
          status: "active",
          created_at: addMinutes(SIM_NOW, -3 - index),
        });
      }

      for (let rank = 1; rank <= candidateCount; rank += 1) {
        const patient = patientRows[(day * 5 + index * 3 + rank) % patientRows.length];
        const outcome = outcomeFor(status, rank, day + index);
        const offerId = `${slotId}-offer-${rank}`;
        const waitlistEntry = waitlistRows.find(
          (entry) =>
            entry.patient_id === patient.id && entry.service_id === serviceId(service.name),
        );
        const callAt = addMinutes(openedAt, 3 + rank * 6);

        offers.push({
          id: offerId,
          clinic_id: CLINIC_ID,
          slot_id: slotId,
          wave_id: activeWaveId && rank <= waveSize ? activeWaveId : null,
          patient_id: patient.id,
          waitlist_entry_id: waitlistEntry?.id ?? null,
          current_booking_id: null,
          offer_type: "waitlist",
          status: offerStatus(outcome),
          rank,
          score: 110 - rank * 8 + ((day + index) % 9),
          score_breakdown: {
            wait: 8 + ((day + rank) % 30),
            acceptance: outcome === "no_answer" ? 3 : 14,
            priority: patient.vip_priority ? 35 : 0,
            preference: provider === providers[(rank + day) % providers.length] ? 18 : 9,
            cooldownPenalty: outcome === "skipped" ? 30 : 0,
          },
          reason: rank === 1 ? "Best wait time and preference fit" : "Eligible backup candidate",
          expires_at: outcome === "ringing" ? addMinutes(SIM_NOW, 2 + rank) : null,
          accepted_at:
            outcome === "accepted" || outcome === "booked" ? addMinutes(callAt, 3) : null,
          created_at: callAt,
          updated_at: outcome === "ringing" ? SIM_NOW : addMinutes(callAt, 4),
        });

        if (outcome !== "not_contacted" && outcome !== "skipped") {
          attempts.push({
            id: `${offerId}-call`,
            clinic_id: CLINIC_ID,
            slot_offer_id: offerId,
            provider: "fonio",
            provider_call_id: `sim-call-${slotId}-${rank}`,
            provider_event_id: `sim-event-${slotId}-${rank}`,
            outcome,
            started_at: outcome === "ringing" ? addMinutes(SIM_NOW, -1) : callAt,
            ended_at: outcome === "ringing" ? null : addMinutes(callAt, 4),
            transcript_url: null,
            raw_payload: { simulation: true },
            created_at: callAt,
            updated_at: outcome === "ringing" ? SIM_NOW : addMinutes(callAt, 4),
          });
          timeline.push(
            event(
              slotId,
              `call-${rank}`,
              "call_outcome",
              outcome === "ringing" ? addMinutes(SIM_NOW, -1) : addMinutes(callAt, 4),
              `${patient.full_name} - ${outcome.replace("_", " ")}`,
            ),
          );
        }
      }

      if (status === "OFFERING") {
        timeline.push(
          event(
            slotId,
            "wave",
            "wave_dispatched",
            addMinutes(SIM_NOW, -3),
            `Wave active with ${waveSize} candidates`,
          ),
        );
      }
      if (status === "BOOKED" && bookedPatient) {
        timeline.push(
          event(
            slotId,
            "booked",
            "booked",
            addMinutes(startsAt, -Math.max(recoveredMin ?? 20, 8)),
            `${bookedPatient.full_name} booked the slot`,
          ),
        );
      }
    }
  }

  const clinic: ClinicRow = {
    id: CLINIC_ID,
    name: "Radiology Group Vienna",
    timezone: "Europe/Vienna",
    fill_mode_default: "Balanced",
    quiet_hours_start: "20:00",
    quiet_hours_end: "08:00",
    max_contacts_per_patient_per_week: 2,
    created_at: SIM_START,
    updated_at: SIM_NOW,
  };

  return {
    now: SIM_NOW,
    clinics: [clinic],
    providers: providerRows,
    services: serviceRows,
    patients: patientRows,
    patient_preferences: [],
    slots,
    bookings,
    waitlist_entries: waitlistRows,
    slot_waves: waves,
    slot_offers: offers,
    call_attempts: attempts,
    booking_attempts: [],
    priority_bumps: [],
    priority_rules: [],
    integration_events: [],
    slot_timeline_events: timeline,
  };
}

function statusForSlot(day: number, index: number): SlotRow["status"] {
  if (day === 27) {
    return ["OFFERING", "OPEN", "BOOKED", "PAUSED_NEW_WAVES", "OFFERING", "BOOKED"][
      index % 6
    ] as SlotRow["status"];
  }
  const mod = (day * 7 + index * 3) % 20;
  if (mod < 14) return "BOOKED";
  return "OPEN";
}

function outcomeFor(status: SlotRow["status"], rank: number, seed: number): CallOutcome {
  if (status === "OFFERING" && rank <= 2) return "ringing";
  if (status === "OPEN" || status === "PAUSED_NEW_WAVES")
    return rank === 1 ? "not_contacted" : "skipped";
  if (status === "BOOKED") {
    if (rank === 1) return seed % 3 === 0 ? "no_answer" : "booked";
    if (rank === 2) return seed % 4 === 0 ? "accepted" : "declined";
    return seed % 2 === 0 ? "no_answer" : "declined";
  }
  return rank % 2 === 0 ? "declined" : "no_answer";
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

function lastEventFor(
  status: SlotRow["status"],
  patientName: string | undefined,
  provider: string,
) {
  if (status === "BOOKED") return `Booked ${patientName ?? "patient"} via Fonio`;
  if (status === "OFFERING") return "Simulated active outreach wave";
  if (status === "PAUSED_NEW_WAVES") return "New waves paused for demo";
  return "Open and ready for ranking";
}

function reasoningFor(
  status: SlotRow["status"],
  service: string,
  provider: string,
  recoveredMin: number | null,
) {
  if (status === "BOOKED")
    return `${service} with ${provider} recovered ${recoveredMin ?? 0} minutes before start.`;
  if (status === "OFFERING")
    return "Simulation is showing live-style Fonio outreach without placing real calls.";
  return "Simulation slot remains available for ranking and call wave planning.";
}

function event(
  slotId: string,
  suffix: string,
  kind: SlotTimelineEventRow["kind"],
  createdAt: string,
  message: string,
): SlotTimelineEventRow {
  return {
    id: `${slotId}-${suffix}`,
    clinic_id: CLINIC_ID,
    slot_id: slotId,
    kind,
    message,
    metadata: { simulation: true },
    created_at: createdAt,
  };
}

function isoForDay(day: number, time: string) {
  const date = new Date(Date.parse(SIM_START) + day * 24 * 60 * 60000);
  const [hour, minute] = time.split(":").map(Number);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function addDays(iso: string, days: number) {
  return new Date(Date.parse(iso) + days * 24 * 60 * 60000).toISOString();
}

function addMinutes(iso: string, minutes: number) {
  return new Date(Date.parse(iso) + minutes * 60000).toISOString();
}

function minutesUntil(iso: string) {
  return Math.round((Date.parse(iso) - Date.parse(SIM_NOW)) / 60000);
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
