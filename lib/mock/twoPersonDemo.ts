import type { Customer, ServiceCode, Slot } from "../types";

const ANCHOR = new Date();
ANCHOR.setHours(8, 0, 0, 0);

function at(daysOffset: number, hour: number, minute: number) {
  const d = new Date(ANCHOR);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function days(d: number) {
  return new Date(Date.now() - d * 86400000).toISOString();
}

export const TWO_PERSON_CAGAN_SLOT_ID = "demo_slot_cagan_tmrw_1400";

const SERVICE: ServiceCode = "MRI Knee";
const LOC = "Vienna Private Imaging, Innere Stadt";

const baseReq = {
  safetyForm: true,
  referral: true,
  paymentReady: true,
  contrast: false
};

export const TWO_PERSON_CUSTOMERS: Customer[] = [
  {
    id: "cust_cagan",
    name: "Çağan Oflazoğlu",
    phone: "+4915510847258",
    email: "cagan04oflazoglu@gmail.com",
    language: "en",
    consent: { call: true, sms: true, voicemail: true, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: true, preferredWindow: "any", maxTravelMinutes: 60 },
    requestedService: SERVICE,
    requestedBodyPart: "Right knee",
    currentBookingId: TWO_PERSON_CAGAN_SLOT_ID,
    bookingSatisfaction: "urgently_wants_earlier",
    earlierOpportunityPreference: "any_earlier",
    cascadeParticipation: "can_move",
    businessPriority: 0.95,
    waitingSince: days(1),
    notes: "Demo persona. Holds the booking OpenSlot manually removes in the one-call demo."
  },
  {
    id: "cust_ash",
    name: "Ash",
    phone: "+49 15510 847258",
    email: "connect.ashu3@gmail.com",
    language: "en",
    consent: { call: true, sms: true, voicemail: true, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: false, preferredWindow: "any", maxTravelMinutes: 60 },
    requestedService: SERVICE,
    requestedBodyPart: "Left knee",
    bookingSatisfaction: "urgently_wants_earlier",
    earlierOpportunityPreference: "any_earlier",
    cascadeParticipation: "can_move",
    businessPriority: 0.85,
    waitingSince: days(3),
    notes: "Demo persona. Only person called in the one-call demo."
  }
];

function mk(
  id: string,
  daysOffset: number,
  hour: number,
  minute: number,
  customerId: string | undefined,
  status: Slot["status"]
): Slot {
  return {
    id,
    service: SERVICE,
    location: LOC,
    startTime: at(daysOffset, hour, minute),
    durationMinutes: 45,
    estimatedValue: 420,
    status,
    requirements: { ...baseReq },
    customerId,
    origin: status === "open" ? "patient_cancellation" : "manual_opening",
    cascadeDepth: 0
  };
}

export const TWO_PERSON_SLOTS: Slot[] = [
  mk(TWO_PERSON_CAGAN_SLOT_ID, 1, 14, 0, "cust_cagan", "booked")
];
