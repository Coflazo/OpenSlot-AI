import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS. Server-only. NEVER ship to the browser.
// Used by recovery loop, webhook receivers, and DSAR jobs.

let cached: SupabaseClient | null = null;

export function createSupabaseServiceClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return cached;
}
