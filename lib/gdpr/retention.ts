// Default retention policy. Centralised so we can show it on /compliance + Academy.

export type LawfulBasis =
  | "contract"
  | "consent"
  | "legitimate_interest"
  | "vital_interest"
  | "legal_obligation"
  | "public_task";

export interface RetentionRule {
  category: string;
  description: string;
  defaultDays: number;
  legalReference: string;
  notes?: string;
}

export const DEFAULT_RETENTION: RetentionRule[] = [
  {
    category: "Call audio recordings",
    description: "Voice recordings of outbound calls.",
    defaultDays: 30,
    legalReference: "GDPR Art. 5(1)(e), 25",
    notes: "Off by default. Only enabled if recording_consent is true at call time."
  },
  {
    category: "Call transcripts",
    description: "Text transcripts of outbound calls.",
    defaultDays: 30,
    legalReference: "GDPR Art. 5(1)(e)"
  },
  {
    category: "Structured call outcomes",
    description: "Variable extraction outputs: slotAccepted, identityConfirmed, etc.",
    defaultDays: 730,
    legalReference: "GDPR Art. 6(1)(b) contract performance"
  },
  {
    category: "Audit log",
    description: "Who did what to which object and why.",
    defaultDays: 365 * 6,
    legalReference: "GDPR Art. 30, statutory bookkeeping retention"
  },
  {
    category: "Consent proof",
    description: "Source, timestamp, and text of every consent.",
    defaultDays: 365 * 10,
    legalReference: "GDPR Art. 7(1): controller must be able to demonstrate consent"
  },
  {
    category: "Import workbooks (Storage)",
    description: "Original Excel/CSV file uploaded via /data.",
    defaultDays: 7,
    legalReference: "GDPR Art. 5(1)(c) minimization"
  },
  {
    category: "Google OAuth tokens",
    description: "Encrypted access + refresh tokens for the clinic's calendar.",
    defaultDays: 0, // until disconnect
    legalReference: "GDPR Art. 5(1)(e), 32: encrypted at rest"
  }
];
