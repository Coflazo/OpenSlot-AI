// Generates /public/OpenSlot_AI_mock_database.xlsx with sheets matching the Supabase schema.
// Run: npm run seed:xlsx

import * as XLSX from "xlsx";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { customers } from "../mock/customers";
import { slots } from "../mock/slots";
import { seedAuditLog } from "../mock/auditLog";

const ROOT = resolve(process.cwd(), "public");
const OUT = resolve(ROOT, "OpenSlot_AI_mock_database.xlsx");

const wb = XLSX.utils.book_new();

function addSheet<T extends Record<string, unknown>>(name: string, rows: T[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

// ---------- Dashboard ----------
addSheet("Dashboard", [
  { metric: "Recovered revenue (mo)", value: 12_840, unit: "EUR", trend: "+18% vs last month" },
  { metric: "Slots saved", value: 38, unit: "count", trend: "this month" },
  { metric: "Avg time to fill", value: "7m 42s", unit: "duration", trend: "median" },
  { metric: "Consent-safe calls", value: 100, unit: "%", trend: "no blocked calls" },
  { metric: "Scanner time recovered", value: "28h 15m", unit: "duration", trend: "this month" },
  { metric: "Travel-blocked candidates", value: 4, unit: "count", trend: "auto-skipped by A* planner" }
]);

// ---------- Customers ----------
addSheet(
  "Customers",
  customers.map((c) => ({
    customer_id: c.id,
    full_name: c.name,
    phone: c.phone,
    email: c.email,
    language: c.language,
    requested_service: c.requestedService ?? "",
    requested_body_part: c.requestedBodyPart ?? "",
    call_consent: c.consent.call,
    sms_consent: c.consent.sms,
    voicemail_consent: c.consent.voicemail,
    recording_consent: c.consent.recording,
    safety_form_complete: c.eligibility.safetyForm,
    referral_received: c.eligibility.referral,
    payment_ready: c.eligibility.paymentReady,
    authorization_approved: c.eligibility.authorization,
    contrast_status: c.eligibility.contrastStatus,
    home_postcode: "",
    home_lat: "",
    home_lng: "",
    booking_satisfaction: c.bookingSatisfaction,
    earlier_opportunity_preference: c.earlierOpportunityPreference,
    cascade_participation: c.cascadeParticipation,
    business_priority: c.businessPriority,
    waiting_since: c.waitingSince ?? "",
    last_contacted_at: c.lastContactedAt ?? "",
    opted_out: Boolean(c.optedOut),
    notes: c.notes ?? "",
    consent_source: "import",
    consent_timestamp: new Date().toISOString()
  }))
);

// ---------- Slots ----------
addSheet(
  "Slots",
  slots.map((s) => ({
    slot_id: s.id,
    service: s.service,
    location: s.location,
    start_time: s.startTime,
    duration_minutes: s.durationMinutes,
    estimated_value_eur: s.estimatedValue,
    status: s.status,
    origin: s.origin,
    requires_safety_form: s.requirements.safetyForm,
    requires_referral: s.requirements.referral,
    requires_payment_ready: s.requirements.paymentReady,
    requires_contrast: s.requirements.contrast,
    current_customer_id: s.customerId ?? "",
    cascade_depth: s.cascadeDepth,
    parent_slot_id: s.parentSlotId ?? ""
  }))
);

// ---------- Waitlist ----------
addSheet(
  "Waitlist",
  customers
    .filter((c) => !c.currentBookingId && !c.optedOut)
    .map((c, i) => ({
      waitlist_id: `wl_${(i + 1).toString().padStart(3, "0")}`,
      customer_id: c.id,
      customer_name: c.name,
      service: c.requestedService ?? "",
      type: "pure_waitlist",
      urgency_score: c.bookingSatisfaction === "urgently_wants_earlier" ? 0.95 : 0.5,
      business_priority: c.businessPriority,
      preference_match: 0.5,
      waiting_since: c.waitingSince ?? "",
      last_contacted_at: c.lastContactedAt ?? "",
      can_arrive_same_day: c.preferences.sameDay,
      max_travel_minutes: c.preferences.maxTravelMinutes,
      // Travel-feasibility example: cell formula stand-in (we store the value the
      // algorithm would compute; in Excel you can change the columns and the
      // user-facing formula is documented in the Scoring sheet below).
      route_feasible_when_60m_left: c.id === "cust_kerem" ? "FALSE" : "TRUE",
      status: "active"
    }))
);

// ---------- Eligibility ----------
addSheet(
  "Eligibility",
  customers.flatMap((c) =>
    [c.requestedService ?? "MRI Knee"].map((svc) => ({
      customer_id: c.id,
      customer_name: c.name,
      service: svc,
      safety_form_complete: c.eligibility.safetyForm,
      referral_received: c.eligibility.referral,
      payment_ready: c.eligibility.paymentReady,
      authorization_approved: c.eligibility.authorization,
      contrast_status: c.eligibility.contrastStatus,
      can_arrive_same_day: c.preferences.sameDay,
      max_travel_minutes: c.preferences.maxTravelMinutes,
      eligibility_score: [
        c.eligibility.safetyForm,
        c.eligibility.referral,
        c.eligibility.paymentReady,
        c.eligibility.authorization
      ].filter(Boolean).length /
        4
    }))
  )
);

// ---------- Calls ----------
addSheet("Calls", [
  {
    offer_id: "demo_alex_1",
    customer_id: "cust_alex",
    slot_id: "slot_today_1630",
    call_type: "upgrade_offer",
    status: "accepted",
    duration_seconds: 78,
    slot_accepted: true,
    identity_confirmed: true,
    asked_medical_question: false,
    wants_callback: false,
    voicemail: false,
    opt_out: false
  },
  {
    offer_id: "demo_mia_1",
    customer_id: "cust_mia",
    slot_id: "slot_alex_jul20",
    call_type: "waitlist_offer",
    status: "accepted",
    duration_seconds: 64,
    slot_accepted: true,
    identity_confirmed: true,
    asked_medical_question: false,
    wants_callback: false,
    voicemail: false,
    opt_out: false
  }
]);

// ---------- Audit log ----------
addSheet(
  "Audit_Log",
  seedAuditLog.map((a) => ({
    at: a.at,
    actor: a.actor,
    action: a.action,
    object: a.object,
    result: a.result,
    details: a.details ?? "",
    lawful_basis_tag: "contract"
  }))
);

// ---------- Rules ----------
addSheet("Rules", [
  {
    eligibility_fit_weight: 0.3,
    urgency_weight: 0.2,
    wait_time_weight: 0.15,
    pickup_probability_weight: 0.15,
    business_priority_weight: 0.1,
    preference_match_weight: 0.1,
    travel_feasibility_weight: 0.25,
    cooldown_penalty_weight: 0.2,
    minimum_arrival_buffer_minutes: 15,
    max_cascade_depth: 5,
    default_concurrent_calls: 1,
    emergency_concurrent_calls: 10
  }
]);

// ---------- Services ----------
addSheet("Services", [
  { service: "MRI Knee", duration_minutes: 45, value_eur: 420, requires_referral: true, requires_safety_form: true, requires_contrast: false, arrival_buffer_minutes: 15 },
  { service: "MRI Brain", duration_minutes: 45, value_eur: 520, requires_referral: true, requires_safety_form: true, requires_contrast: false, arrival_buffer_minutes: 15 },
  { service: "MRI Spine", duration_minutes: 60, value_eur: 640, requires_referral: true, requires_safety_form: true, requires_contrast: false, arrival_buffer_minutes: 15 },
  { service: "CT Chest", duration_minutes: 30, value_eur: 380, requires_referral: true, requires_safety_form: false, requires_contrast: true, arrival_buffer_minutes: 20 },
  { service: "CT Abdomen", duration_minutes: 30, value_eur: 410, requires_referral: true, requires_safety_form: false, requires_contrast: true, arrival_buffer_minutes: 20 },
  { service: "Ultrasound", duration_minutes: 25, value_eur: 180, requires_referral: false, requires_safety_form: false, requires_contrast: false, arrival_buffer_minutes: 10 },
  { service: "X-ray", duration_minutes: 15, value_eur: 120, requires_referral: true, requires_safety_form: false, requires_contrast: false, arrival_buffer_minutes: 10 }
]);

// ---------- Locations ----------
addSheet("Locations", [
  {
    location_id: "loc_innere_stadt",
    name: "Vienna Private Imaging,Innere Stadt",
    address: "Kärntner Straße 18, 1010 Wien",
    lat: 48.2082,
    lng: 16.3738,
    route_node_id: "clinic_innere_stadt",
    phone: "+43 1 411 88 02",
    arrival_buffer_minutes: 15
  },
  {
    location_id: "loc_mariahilf",
    name: "Vienna Private Imaging,Mariahilf",
    address: "Mariahilfer Straße 88, 1070 Wien",
    lat: 48.1986,
    lng: 16.3478,
    route_node_id: "clinic_mariahilf",
    phone: "+43 1 411 88 03",
    arrival_buffer_minutes: 15
  }
]);

// ---------- Segments ----------
addSheet("Segments", [
  { segment_id: "seg_same_day", name: "Same-day opt-in", criteria: "preferences.same_day = true AND earlier_opportunity_preference != none", avg_acceptance: 0.83, avg_pickup: 0.78 },
  { segment_id: "seg_priority", name: "Priority customers", criteria: "business_priority >= 0.7", avg_acceptance: 0.71, avg_pickup: 0.74 },
  { segment_id: "seg_referral_ready", name: "Referral-ready", criteria: "eligibility.referral = true AND eligibility.safety_form = true", avg_acceptance: 0.66, avg_pickup: 0.62 },
  { segment_id: "seg_close", name: "Lives within 30m travel", criteria: "route.travel_minutes <= 30", avg_acceptance: 0.69, avg_pickup: 0.65 },
  { segment_id: "seg_demo", name: "Demo Çağan", criteria: "customer_id = 'cust_cagan'", avg_acceptance: 0.95, avg_pickup: 0.9 }
]);

// ---------- Scoring (formula reference) ----------
addSheet("Scoring", [
  { step: 1, name: "Hard filters", description: "Consent, eligibility, service, contrast, cooldown, opted out → boolean gates" },
  { step: 2, name: "Route feasibility", description: "travel + buffer ≤ time_left ⇒ feasible; else TRAVEL_BLOCKED" },
  { step: 3, name: "Travel feasibility score", description: "clamp((time_left − buffer − travel) / time_left, 0, 1)" },
  { step: 4, name: "Weighted positives", description: "0.30·eligibility + 0.20·urgency + 0.15·wait + 0.15·pickup + 0.10·business + 0.10·preference + 0.25·travel" },
  { step: 5, name: "Cooldown penalty", description: "− 0.20·cooldown" },
  { step: 6, name: "Final score", description: "100 × clamp(positives − penalty, 0, 1). Zero if blocked or travel-blocked" },
  { step: 7, name: "Aggression", description: "time_left → calm(1) / focused(2) / aggressive(5) / emergency(10) concurrent calls" }
]);

// ---------- Supabase mapping ----------
addSheet("Supabase_Mapping", [
  { sheet: "Customers", supabase_table: "customers + customer_consents + customer_eligibility" },
  { sheet: "Slots", supabase_table: "slots" },
  { sheet: "Waitlist", supabase_table: "waitlist_entries" },
  { sheet: "Eligibility", supabase_table: "customer_eligibility" },
  { sheet: "Calls", supabase_table: "call_attempts" },
  { sheet: "Audit_Log", supabase_table: "audit_log" },
  { sheet: "Rules", supabase_table: "algorithm_rules" },
  { sheet: "Services", supabase_table: "services" },
  { sheet: "Locations", supabase_table: "locations" },
  { sheet: "Segments", supabase_table: "(computed view, not stored)" },
  { sheet: "Scoring", supabase_table: "(read-only reference)" }
]);

// ---------- Import readme ----------
addSheet("Import_Readme", [
  { step: 1, instruction: "Open /data in OpenSlot AI" },
  { step: 2, instruction: "Drop this file or click 'Use sample workbook'" },
  { step: 3, instruction: "Validate. Fix any cells marked sienna" },
  { step: 4, instruction: "Sync to Supabase (or run in demo mode without Supabase)" },
  { step: 5, instruction: "Check the audit log on /compliance" }
]);

// ---------- Sources ----------
addSheet("Sources", [
  { source: "Google Calendar", populates: "Slots", required: "Optional. Connect on /integrations." },
  { source: "Excel upload", populates: "Customers, Waitlist, Eligibility", required: "Recommended for bulk import." },
  { source: "Manual entry", populates: "Customers (single-row form on /customers)", required: "Always available." },
  { source: "Fonio webhooks", populates: "Calls", required: "Required for real voice calling." }
]);

mkdirSync(dirname(OUT), { recursive: true });
const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
writeFileSync(OUT, buffer);
console.log(`Wrote ${OUT}`);
console.log(`Sheets: ${wb.SheetNames.join(", ")}`);
