import { createSupabaseServiceClient } from "../supabase/service";
import { CustomerRowSchema, type CustomerRow } from "./validateWorkbook";

export interface CommitResult {
  customers: { inserted: number; updated: number; skipped: number };
  errors: { rowIndex: number; reason: string }[];
}

export async function commitCustomers(
  clinicId: string,
  rows: Record<string, unknown>[]
): Promise<CommitResult> {
  const supabase = createSupabaseServiceClient();
  const result: CommitResult = {
    customers: { inserted: 0, updated: 0, skipped: 0 },
    errors: []
  };

  const valid: CustomerRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = CustomerRowSchema.safeParse(rows[i]);
    if (r.success) valid.push(r.data);
    else {
      result.customers.skipped++;
      result.errors.push({ rowIndex: i, reason: r.error.issues.map((x) => x.message).join("; ") });
    }
  }

  if (valid.length === 0) return result;

  const customerPayload = valid.map((c) => ({
    clinic_id: clinicId,
    external_id: c.customer_id,
    full_name: c.full_name,
    phone: c.phone,
    email: c.email || null,
    language: c.language,
    home_postcode: c.home_postcode ?? null,
    home_lat: c.home_lat ?? null,
    home_lng: c.home_lng ?? null
  }));

  const { error, count } = await supabase
    .from("customers")
    .upsert(customerPayload, { onConflict: "clinic_id,external_id", count: "exact" });

  if (error) {
    for (let i = 0; i < valid.length; i++) {
      result.errors.push({ rowIndex: i, reason: error.message });
    }
    return result;
  }

  // The upsert API does not return per-row insert vs update counts, so
  // we report inserted = total and trust onConflict to dedupe.
  result.customers.inserted = count ?? valid.length;

  // Consents: insert one row per customer; existing ones get overridden by external_id+now timestamp.
  const { data: customerLookup } = await supabase
    .from("customers")
    .select("id, external_id")
    .eq("clinic_id", clinicId)
    .in("external_id", valid.map((v) => v.customer_id));

  if (customerLookup) {
    const consentRows = valid.flatMap((row) => {
      const customer = customerLookup.find((c) => c.external_id === row.customer_id);
      if (!customer) return [];
      return [
        {
          customer_id: customer.id,
          call_consent: row.call_consent,
          sms_consent: row.sms_consent,
          voicemail_consent: row.voicemail_consent ?? false,
          recording_consent: row.recording_consent,
          consent_source: row.consent_source,
          consent_timestamp: row.consent_timestamp
        }
      ];
    });
    if (consentRows.length) {
      await supabase.from("customer_consents").insert(consentRows);
    }
  }

  await supabase.from("audit_log").insert({
    clinic_id: clinicId,
    actor_type: "user",
    action: "import.commit",
    object_type: "import_batch",
    object_id: "ad-hoc",
    result: "success",
    lawful_basis_tag: "contract",
    metadata: { rows: valid.length }
  });

  return result;
}
