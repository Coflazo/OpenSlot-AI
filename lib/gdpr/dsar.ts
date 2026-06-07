import { createSupabaseServiceClient } from "../supabase/service";

export interface DSARExport {
  customer: unknown;
  consents: unknown[];
  eligibility: unknown[];
  slots: unknown[];
  waitlistEntries: unknown[];
  callAttempts: unknown[];
  auditLog: unknown[];
  generatedAt: string;
}

export async function exportCustomerDSAR(customerId: string): Promise<DSARExport> {
  const supabase = createSupabaseServiceClient();

  const [customer, consents, eligibility, calls, waitlist] = await Promise.all([
    supabase.from("customers").select("*").eq("id", customerId).single(),
    supabase.from("customer_consents").select("*").eq("customer_id", customerId),
    supabase.from("customer_eligibility").select("*").eq("customer_id", customerId),
    supabase.from("call_attempts").select("*").eq("customer_id", customerId),
    supabase.from("waitlist_entries").select("*").eq("customer_id", customerId)
  ]);

  const slots = await supabase
    .from("slots")
    .select("*")
    .or(`original_customer_id.eq.${customerId},current_customer_id.eq.${customerId}`);

  const auditLog = await supabase
    .from("audit_log")
    .select("*")
    .or(`metadata->>customer_id.eq.${customerId},object_id.eq.${customerId}`)
    .limit(2000);

  return {
    customer: customer.data,
    consents: consents.data ?? [],
    eligibility: eligibility.data ?? [],
    slots: slots.data ?? [],
    waitlistEntries: waitlist.data ?? [],
    callAttempts: calls.data ?? [],
    auditLog: auditLog.data ?? [],
    generatedAt: new Date().toISOString()
  };
}

export async function eraseCustomer(customerId: string) {
  const supabase = createSupabaseServiceClient();

  // 1. Anonymize audit log (preserve trail; remove direct identifier).
  const { data: anonResult } = await supabase.rpc("anonymize_audit_for_customer", {
    p_customer_id: customerId
  });

  // 2. Hard-delete consents and eligibility (cascades on customers).
  await supabase.from("customer_consents").delete().eq("customer_id", customerId);
  await supabase.from("customer_eligibility").delete().eq("customer_id", customerId);

  // 3. Clear personal fields on call_attempts (keep the row for audit integrity).
  await supabase
    .from("call_attempts")
    .update({ transcript: null, recording_url: null, customer_id: null })
    .eq("customer_id", customerId);

  // 4. Delete waitlist entries (no longer relevant once customer is erased).
  await supabase.from("waitlist_entries").delete().eq("customer_id", customerId);

  // 5. Finally delete the customer.
  const { error } = await supabase.from("customers").delete().eq("id", customerId);
  if (error) throw error;

  return { ok: true, anonymizedAuditRows: anonResult ?? 0 };
}
