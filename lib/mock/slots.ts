import type { Slot, ServiceCode } from "../types";

// Build a deterministic schedule rooted at today
const ANCHOR = new Date();
ANCHOR.setHours(8, 0, 0, 0);

function at(daysOffset: number, hour: number, minute: number) {
  const d = new Date(ANCHOR);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const baseReq = {
  safetyForm: true,
  referral: true,
  paymentReady: true,
  contrast: false
};

const serviceMeta: Record<ServiceCode, { duration: number; value: number; contrast: boolean }> = {
  "MRI Knee": { duration: 45, value: 420, contrast: false },
  "MRI Brain": { duration: 45, value: 520, contrast: false },
  "MRI Spine": { duration: 60, value: 640, contrast: false },
  "CT Chest": { duration: 30, value: 380, contrast: true },
  "CT Abdomen": { duration: 30, value: 410, contrast: true },
  Ultrasound: { duration: 25, value: 180, contrast: false },
  "X-ray": { duration: 15, value: 120, contrast: false }
};

const LOC = "Vienna Private Imaging — Innere Stadt";
const LOC2 = "Vienna Private Imaging — Mariahilf";

function mk(
  id: string,
  service: ServiceCode,
  daysOffset: number,
  hour: number,
  minute: number,
  customerId: string | undefined,
  status: Slot["status"] = "booked",
  location = LOC
): Slot {
  const m = serviceMeta[service];
  return {
    id,
    service,
    location,
    startTime: at(daysOffset, hour, minute),
    durationMinutes: m.duration,
    estimatedValue: m.value,
    status,
    requirements: { ...baseReq, contrast: m.contrast },
    customerId,
    origin: "manual_opening",
    cascadeDepth: 0
  };
}

export const slots: Slot[] = [
  // Today — the cancellation hero slot
  mk("slot_today_1630", "MRI Knee", 0, 16, 30, "cust_lena", "booked"),

  // Today's other booked slots (calendar context)
  mk("slot_today_0900", "MRI Brain", 0, 9, 0, "cust_helena", "booked"),
  mk("slot_today_1015", "CT Chest", 0, 10, 15, "cust_tobias", "booked"),
  mk("slot_today_1130", "Ultrasound", 0, 11, 30, "cust_emma", "booked"),
  mk("slot_today_1400", "X-ray", 0, 14, 0, "cust_david", "booked", LOC2),
  mk("slot_today_1500", "MRI Spine", 0, 15, 0, "cust_paul", "booked"),
  mk("slot_today_1715", "CT Abdomen", 0, 17, 15, "cust_clara", "booked"),
  mk("slot_today_1800", "MRI Brain", 0, 18, 0, "cust_finn", "booked"),

  // Tomorrow
  mk("slot_tmrw_0900", "MRI Knee", 1, 9, 0, "cust_isabella", "booked"),
  mk("slot_tmrw_1030", "MRI Brain", 1, 10, 30, "cust_anna", "booked"),
  mk("slot_tmrw_1200", "CT Chest", 1, 12, 0, "cust_kerem", "booked"),
  mk("slot_tmrw_1400", "MRI Spine", 1, 14, 0, "cust_yusuf", "booked", LOC2),

  // Future booked — the cascade upgrade candidates
  mk("slot_alex_jul20", "MRI Knee", 44, 11, 0, "cust_alex", "booked"),
  mk("slot_sara_jul25", "MRI Knee", 49, 9, 30, "cust_sara", "booked"),
  mk("slot_jonas_aug2", "MRI Knee", 57, 14, 0, "cust_jonas", "booked", LOC2),

  // Recently filled (for analytics)
  mk("slot_y1", "MRI Knee", -1, 10, 0, "cust_helena", "filled"),
  mk("slot_y2", "CT Abdomen", -2, 14, 30, "cust_clara", "filled"),
  mk("slot_y3", "MRI Spine", -3, 11, 0, "cust_paul", "filled"),
  // A historical expired slot for "needs attention" demo
  { ...mk("slot_expired_yest", "MRI Brain", -1, 17, 0, undefined, "expired"), origin: "patient_cancellation" }
];

export function getSlot(id: string): Slot | undefined {
  return slots.find((s) => s.id === id);
}

export const HERO_SLOT_ID = "slot_today_1630";
