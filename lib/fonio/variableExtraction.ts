import { z } from "zod";

const boolFromAny = z
  .union([z.string(), z.boolean(), z.number()])
  .transform((v) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    const s = String(v).trim().toLowerCase();
    return s === "true" || s === "yes" || s === "1";
  });

export const ExtractionSchema = z.object({
  slotAccepted: boolFromAny.default(false),
  identityConfirmed: boolFromAny.default(false),
  askedMedicalQuestion: boolFromAny.default(false),
  wantsCallback: boolFromAny.default(false),
  voicemail: boolFromAny.default(false),
  optOut: boolFromAny.default(false),
  customerLanguage: z.string().optional().default(""),
  customerPickedAlternateTime: z.string().optional().default("")
});

export type Extraction = z.infer<typeof ExtractionSchema>;

export function safeParseExtraction(input: unknown): Extraction {
  const r = ExtractionSchema.safeParse(input ?? {});
  return r.success
    ? r.data
    : {
        slotAccepted: false,
        identityConfirmed: false,
        askedMedicalQuestion: false,
        wantsCallback: false,
        voicemail: false,
        optOut: false,
        customerLanguage: "",
        customerPickedAlternateTime: ""
      };
}
