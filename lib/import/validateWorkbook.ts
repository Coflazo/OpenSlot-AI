import { z } from "zod";
import type { ParsedSheet } from "./parseWorkbook";

const trueValues = new Set(["true", "yes", "y", "1", "active"]);
const falseValues = new Set(["false", "no", "n", "0", "inactive"]);

const boolish = z
  .union([z.string(), z.number(), z.boolean()])
  .transform((v) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    const s = String(v).trim().toLowerCase();
    if (trueValues.has(s)) return true;
    if (falseValues.has(s)) return false;
    return undefined as unknown as boolean; // signals "missing"
  })
  .refine((v) => typeof v === "boolean", { message: "expected boolean" });

const numberish = z
  .union([z.string(), z.number()])
  .transform((v) => (v === "" || v == null ? undefined : Number(v)))
  .pipe(z.number().finite().optional());

const phoneRegex = /^\+?[\d\s().-]{6,}$/;

export const CustomerRowSchema = z.object({
  customer_id: z.string().min(1, "required"),
  full_name: z.string().min(1, "required"),
  phone: z.string().regex(phoneRegex, "phone format invalid"),
  email: z.string().email().optional().or(z.literal("")),
  language: z.string().default("en"),
  requested_service: z.enum(["MRI Knee", "MRI Brain", "MRI Spine", "CT Chest", "CT Abdomen", "Ultrasound", "X-ray"]).optional().or(z.literal("")),
  call_consent: boolish,
  sms_consent: boolish,
  voicemail_consent: boolish.optional(),
  recording_consent: boolish,
  safety_form_complete: boolish.optional(),
  referral_received: boolish.optional(),
  payment_ready: boolish.optional(),
  authorization_approved: boolish.optional(),
  home_postcode: z.string().optional(),
  home_lat: numberish,
  home_lng: numberish,
  consent_source: z.string().default("import"),
  consent_timestamp: z.string().default(() => new Date().toISOString())
});

export type CustomerRow = z.infer<typeof CustomerRowSchema>;

export interface ValidationError {
  sheet: string;
  rowIndex: number;
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface SheetValidation {
  sheet: string;
  errors: ValidationError[];
  validCount: number;
  totalCount: number;
}

export function validateCustomersSheet(sheet: ParsedSheet): SheetValidation {
  const errors: ValidationError[] = [];
  let validCount = 0;
  for (let i = 0; i < sheet.rows.length; i++) {
    const row = sheet.rows[i];
    const result = CustomerRowSchema.safeParse(row);
    if (result.success) {
      validCount++;
      // Soft warnings
      if (!result.data.call_consent) {
        errors.push({
          sheet: sheet.sheetName,
          rowIndex: i,
          field: "call_consent",
          message: "Customer has no call consent — they will not be contacted",
          severity: "warning"
        });
      }
      if (result.data.home_lat == null || result.data.home_lng == null) {
        errors.push({
          sheet: sheet.sheetName,
          rowIndex: i,
          field: "home_lat/home_lng",
          message: "Missing coordinates — route feasibility will assume zero travel",
          severity: "warning"
        });
      }
    } else {
      for (const issue of result.error.issues) {
        errors.push({
          sheet: sheet.sheetName,
          rowIndex: i,
          field: String(issue.path[0] ?? "row"),
          message: issue.message,
          severity: "error"
        });
      }
    }
  }
  return { sheet: sheet.sheetName, errors, validCount, totalCount: sheet.rows.length };
}

export function autoFixCommonIssues(rows: Record<string, unknown>[]) {
  return rows.map((r) => {
    const out: Record<string, unknown> = { ...r };
    for (const k of Object.keys(out)) {
      const v = out[k];
      if (typeof v === "string") out[k] = v.trim();
    }
    if (typeof out.email === "string") out.email = (out.email as string).toLowerCase();
    if (typeof out.phone === "string") {
      out.phone = (out.phone as string).replace(/\s+/g, " ").replace(/[^\d+ ()-]/g, "");
    }
    return out;
  });
}
