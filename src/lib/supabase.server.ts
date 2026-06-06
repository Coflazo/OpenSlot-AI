/**
 * Supabase Client for OpenSlot AI
 * Server-side only (note the .server.ts suffix)
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase credentials. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetch all patients from Supabase
 */
export async function fetchPatients() {
  const { data, error } = await supabase.from("patients").select("*");

  if (error) {
    console.error("[Supabase] Error fetching patients:", error);
    return [];
  }

  return data || [];
}

/**
 * Fetch all slots from Supabase
 */
export async function fetchSlots() {
  const { data, error } = await supabase
    .from("slots")
    .select("*")
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("[Supabase] Error fetching slots:", error);
    return [];
  }

  return data || [];
}

/**
 * Fetch all waitlist entries from Supabase
 */
export async function fetchWaitlistEntries() {
  const { data, error } = await supabase
    .from("waitlist_entries")
    .select("*, patients(*)")
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("[Supabase] Error fetching waitlist:", error);
    return [];
  }

  return data || [];
}

/**
 * Create a booking in Supabase
 */
export async function createBooking(
  patientId: string,
  slotId: string,
  source: string
) {
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      patient_id: patientId,
      slot_id: slotId,
      source: source as any,
      status: "ACTIVE",
    })
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Error creating booking:", error);
    return null;
  }

  return data;
}

/**
 * Record a call attempt in Supabase
 */
export async function recordCallAttempt(
  patientId: string,
  slotId: string,
  waitlistEntryId: string,
  outcome: string
) {
  const { data, error } = await supabase
    .from("call_attempts")
    .insert({
      patient_id: patientId,
      slot_id: slotId,
      waitlist_entry_id: waitlistEntryId,
      outcome: outcome as any,
      provider: "fonio",
    })
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Error recording call attempt:", error);
    return null;
  }

  return data;
}
