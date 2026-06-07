// Single-tenant clinic resolver. Final-branch backend hardcoded one UUID; we
// expose the same default but allow it to be overridden via env so the same
// build can target a different Supabase project without a code change.
//
// When auth lands, this is the seam: read clinic_id from session/membership
// instead of env, and route handlers don't need to change.

const FALLBACK_CLINIC_ID = "59f9d6c2-a9d2-4817-ae73-40b36cb5a9fd";

export function getClinicId(): string {
  return process.env.CLINIC_ID || FALLBACK_CLINIC_ID;
}
