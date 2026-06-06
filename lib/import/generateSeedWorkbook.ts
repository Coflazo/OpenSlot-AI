// Generates /public/OpenSlot_AI_mock_database.xlsx with sheets matching the Supabase schema.
// Run with: npm run seed:xlsx

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

const dashboardRow = {
  metric: "Recovered revenue (mo)",
  value: 12_840,
  unit: "EUR",
  trend: "+18% vs last month"
};
addSheet("Dashboard", [
  dashboardRow,
  { metric: "Slots saved", value: 38, unit: "count", trend: "this month" },
  { metric: "Avg time to fill", value: "7m 42s", unit: "duration", trend: "median" },
  { metric: "Consent-safe calls", value: 100, unit: "%", trend: "no blocked calls" }
]);

addSheet(
  "Customers",
  customers.map((c) => ({
    customer_id: c.id,
    full_name: c.name,
    phone: c.phone,
    email: c.email,
    language: c.language,
    requested_service: c.requestedService ?? "",
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
    consent_source: "import",
    consent_timestamp: new Date().toISOString()
  }))
);

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
    current_customer_id: s.customerId ?? ""
  }))
);

addSheet(
  "Waitlist",
  customers
    .filter((c) => !c.currentBookingId && !c.optedOut)
    .map((c) => ({
      customer_id: c.id,
      service: c.requestedService ?? "",
      type: "pure_waitlist",
      urgency_score: 0.5,
      business_priority: c.businessPriority,
      preference_match: 0.5,
      waiting_since: c.waitingSince ?? "",
      status: "active"
    }))
);

addSheet(
  "Eligibility",
  customers.flatMap((c) =>
    [c.requestedService ?? "MRI Knee"].map((svc) => ({
      customer_id: c.id,
      service: svc,
      safety_form_complete: c.eligibility.safetyForm,
      referral_received: c.eligibility.referral,
      payment_ready: c.eligibility.paymentReady,
      authorization_approved: c.eligibility.authorization,
      contrast_status: c.eligibility.contrastStatus,
      can_arrive_same_day: c.preferences.sameDay
    }))
  )
);

addSheet(
  "Calls",
  [
    {
      offer_id: "demo_alex_1",
      customer_id: "cust_alex",
      slot_id: "slot_today_1630",
      call_type: "upgrade_offer",
      status: "accepted",
      duration_seconds: 78
    },
    {
      offer_id: "demo_mia_1",
      customer_id: "cust_mia",
      slot_id: "slot_alex_jul20",
      call_type: "waitlist_offer",
      status: "accepted",
      duration_seconds: 64
    }
  ]
);

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
    max_cascade_depth: 5
  }
]);

addSheet("Supabase_Mapping", [
  { sheet: "Customers", supabase_table: "customers + customer_consents + customer_eligibility" },
  { sheet: "Slots", supabase_table: "slots" },
  { sheet: "Waitlist", supabase_table: "waitlist_entries" },
  { sheet: "Eligibility", supabase_table: "customer_eligibility" },
  { sheet: "Calls", supabase_table: "call_attempts" },
  { sheet: "Audit_Log", supabase_table: "audit_log" },
  { sheet: "Rules", supabase_table: "algorithm_rules" }
]);

addSheet("Import_Readme", [
  { step: 1, instruction: "Open /data in OpenSlot AI" },
  { step: 2, instruction: "Drop this file or click 'Use sample workbook'" },
  { step: 3, instruction: "Validate — fix any cells marked sienna" },
  { step: 4, instruction: "Sync to Supabase" },
  { step: 5, instruction: "Check the audit log on /compliance" }
]);

addSheet("Sources", [
  { source: "Google Calendar", populates: "Slots" },
  { source: "Excel upload", populates: "Customers, Waitlist, Eligibility" },
  { source: "Manual entry", populates: "Customers (single-row form on /customers)" }
]);

mkdirSync(dirname(OUT), { recursive: true });
const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
writeFileSync(OUT, buffer);
console.log(`Wrote ${OUT}`);
