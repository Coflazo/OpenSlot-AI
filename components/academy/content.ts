export interface AcademyChapter {
  slug: string;
  title: string;
  oneLine: string;
  estimatedMinutes: number;
  body: AcademyBlock[];
  cta?: { label: string; href: string };
}

export type AcademyBlock =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "code"; lang: string; text: string }
  | { kind: "callout"; tone: "info" | "warn" | "success"; text: string }
  | { kind: "kv"; items: { k: string; v: string }[] };

export const chapters: AcademyChapter[] = [
  {
    slug: "what-it-does",
    title: "What OpenSlot AI does",
    oneLine: "The product loop in one paragraph.",
    estimatedMinutes: 4,
    body: [
      {
        kind: "p",
        text: "OpenSlot AI watches your appointment capacity. When a customer cancels, OpenSlot AI identifies the newly opened slot, ranks eligible waitlisted customers, calls the best candidate, confirms the booking, and updates your dashboard."
      },
      { kind: "h", text: "Three promises" },
      {
        kind: "list",
        items: [
          "Recover revenue from cancellations that would otherwise stay empty",
          "Reduce manual receptionist work (no more chasing the waitlist by hand)",
          "Prevent double-booking with a transactional slot lock"
        ]
      },
      {
        kind: "callout",
        tone: "info",
        text: "OpenSlot AI never gives medical advice and never reveals one customer's data to another."
      }
    ]
  },
  {
    slug: "connect-google-calendar",
    title: "Connect Google Calendar",
    oneLine: "OAuth, scopes, sync mode, push channels.",
    estimatedMinutes: 8,
    cta: { label: "Open Integrations", href: "/integrations" },
    body: [
      {
        kind: "p",
        text: "OpenSlot AI is the source of truth for slots. Google Calendar is mirrored: we pull events down and push status updates back. We never use Google Calendar as the primary database."
      },
      { kind: "h", text: "Steps" },
      {
        kind: "list",
        items: [
          "Open Integrations → Google Calendar → Connect",
          "Sign in with the clinic's Google account",
          "Grant calendar.events + calendar.freebusy (narrow scopes — not calendar)",
          "We store the access + refresh tokens encrypted with AES-256-GCM",
          "First sync runs within 5 minutes — verify on /calendar",
          "Cancelling an event in Google triggers a cascade within 5 min (polling), instantly with push channels"
        ]
      },
      {
        kind: "callout",
        tone: "warn",
        text: "Google watch channels expire every 7 days. Refresh them via /api/calendar/watch or a cron. Documented in Settings → Notifications."
      },
      { kind: "h", text: "Idempotency" },
      {
        kind: "p",
        text: "Outbound events use eventId = openslot-{slot_id}. Retries can't double-create. If you delete an OpenSlot-managed event in Google directly, OpenSlot will recreate it on the next push."
      }
    ]
  },
  {
    slug: "import-waitlist",
    title: "Import your waitlist",
    oneLine: "Excel/CSV upload + editable validation.",
    estimatedMinutes: 6,
    cta: { label: "Open Data page", href: "/data" },
    body: [
      {
        kind: "p",
        text: "Upload an Excel or CSV file with customer names, phone numbers, requested service, consent fields, eligibility status, and location data. OpenSlot AI validates the file before importing anything."
      },
      { kind: "h", text: "Required columns" },
      {
        kind: "list",
        items: [
          "customer_id",
          "full_name",
          "phone (E.164 format, e.g. +43 660 123 45 67)",
          "email",
          "requested_service (MRI Knee, MRI Brain, MRI Spine, CT Chest, CT Abdomen, Ultrasound, X-ray)",
          "call_consent, sms_consent, recording_consent (true/false)",
          "safety_form_complete, referral_received, payment_ready, authorization_approved",
          "home_postcode, home_lat, home_lng (route feasibility — fall back to postcode lookup if lat/lng missing)"
        ]
      },
      {
        kind: "callout",
        tone: "info",
        text: "Sample workbook on the Data page → 'Use sample workbook'. It maps 1:1 to Supabase tables (see Supabase_Mapping sheet)."
      }
    ]
  },
  {
    slug: "check-consent",
    title: "Check consent",
    oneLine: "GDPR Article 7 in practice.",
    estimatedMinutes: 5,
    cta: { label: "Open Compliance", href: "/compliance" },
    body: [
      {
        kind: "p",
        text: "OpenSlot AI will not call a customer unless call consent is active. Consent must be specific, recorded, and auditable."
      },
      { kind: "h", text: "Per-customer consent fields" },
      {
        kind: "kv",
        items: [
          { k: "call_consent", v: "explicit yes for outbound voice" },
          { k: "sms_consent", v: "explicit yes for confirmation SMS" },
          { k: "voicemail_consent", v: "may we leave a voicemail" },
          { k: "recording_consent", v: "may the call be recorded (30-day retention)" },
          { k: "consent_source", v: "online form / phone / paper / import" },
          { k: "consent_timestamp", v: "when consent was captured" },
          { k: "withdrawn_at", v: "set on opt-out — irreversible block" }
        ]
      },
      {
        kind: "callout",
        tone: "warn",
        text: "Withdrawal is real. enforce_consent_before_call() is a database trigger — even our backend cannot bypass it."
      }
    ]
  },
  {
    slug: "configure-services",
    title: "Configure services",
    oneLine: "Duration, value, forms, arrival buffer.",
    estimatedMinutes: 4,
    cta: { label: "Open Settings → Services", href: "/settings" },
    body: [
      { kind: "p", text: "Services define slot duration, value, required forms, arrival buffer, and eligibility rules." },
      { kind: "h", text: "Example: MRI Knee" },
      {
        kind: "kv",
        items: [
          { k: "Duration", v: "45 minutes" },
          { k: "Estimated value", v: "€420" },
          { k: "Arrival buffer", v: "15 minutes" },
          { k: "Requires referral", v: "Yes" },
          { k: "Requires safety form", v: "Yes" },
          { k: "Requires contrast clearance", v: "No" }
        ]
      }
    ]
  },
  {
    slug: "configure-rules",
    title: "Configure rules",
    oneLine: "Hard filters + scoring + aggression.",
    estimatedMinutes: 7,
    cta: { label: "Open Rules", href: "/rules" },
    body: [
      { kind: "p", text: "Rules control who gets called first and how aggressively OpenSlot AI moves through the waitlist." },
      { kind: "h", text: "Three layers" },
      {
        kind: "list",
        items: [
          "Hard filters — boolean gates (consent, eligibility, travel, cooldown). Failing any one removes the candidate.",
          "Soft scoring — weighted sum of factors. Tweak weights and the /algorithm page updates instantly.",
          "Aggression — time-left → call concurrency (calm 1 / focused 2 / aggressive 5 / emergency 10)."
        ]
      },
      {
        kind: "callout",
        tone: "info",
        text: "Visit /algorithm side by side with /rules — every slider movement re-ranks candidates and re-paints the score bars."
      }
    ]
  },
  {
    slug: "connect-phone-fonio",
    title: "Connect phone calling (Fonio)",
    oneLine: "Real voice agent setup, end to end.",
    estimatedMinutes: 14,
    cta: { label: "Open Integrations", href: "/integrations" },
    body: [
      {
        kind: "p",
        text: "Fonio runs the voice agent. We talk to it via REST + three webhooks. EU servers, GDPR-compliant, EU AI Act compliant."
      },
      { kind: "h", text: "Setup checklist" },
      {
        kind: "list",
        items: [
          "1. Sign in at app.fonio.ai and create an Assistant.",
          "2. Paste the Perfect Fonio Prompt (next chapter has the exact text) into the Assistant prompt field.",
          "3. Pick the voice ('Multi' for multilingual EN/DE/TR).",
          "4. Buy an Import Number (~€5/mo) for outbound — Fonio Numbers are inbound-only.",
          "5. In the Assistant settings, set Webhook URLs (with ?token=FONIO_WEBHOOK_TOKEN): Inbound → /api/fonio/inbound, Mid-call → /api/fonio/mid-call, Post-call → /api/fonio/post-call.",
          "6. Configure Variable Extraction (Technical → Variable Extraction Active) with: slotAccepted, identityConfirmed, askedMedicalQuestion, wantsCallback, voicemail, optOut, customerLanguage, customerPickedAlternateTime.",
          "7. Configure post-call Send Email actions: confirmation to customer (when slotAccepted), summary to clinic ops always.",
          "8. Whitelist app@mail.fonio.com in your SMTP filter so emails arrive.",
          "9. Paste FONIO_API_KEY, FONIO_ASSISTANT_ID, FONIO_OUTBOUND_NUMBER_ID, FONIO_WEBHOOK_TOKEN into .env.local.",
          "10. Press 'Test call' on /integrations with your own mobile number to verify the full loop."
        ]
      },
      {
        kind: "callout",
        tone: "warn",
        text: "Turn OFF Fonio's built-in scheduler for this assistant. We do the slot lock + Google Calendar write ourselves — letting Fonio also write would create duplicates."
      },
      { kind: "h", text: "Phone numbers" },
      {
        kind: "kv",
        items: [
          { k: "Fonio Number", v: "Included, inbound only" },
          { k: "Import Number", v: "€5/mo, required for outbound branded caller ID" },
          { k: "SIP Number", v: "Included, for existing PBX" }
        ]
      }
    ]
  },
  {
    slug: "first-test-cancellation",
    title: "Run your first test cancellation",
    oneLine: "End-to-end smoke test in 4 minutes.",
    estimatedMinutes: 4,
    cta: { label: "Open Simulation Controls", href: "/overview" },
    body: [
      {
        kind: "p",
        text: "Choose a test appointment, mark it as cancelled, and watch OpenSlot AI rank candidates, call the best match, confirm the booking, and update your dashboard."
      },
      {
        kind: "list",
        items: [
          "Open /overview",
          "Click the Simulation panel (bottom-right) → 'Cancel today 16:30'",
          "Watch the open-slots panel surface the slot",
          "/calls populates with Alex's upgrade-offer call, transcript types out",
          "Slot fills, KPI counts up €420, cascade chain animates in",
          "Sara declines the vacated July 20 slot; Mia accepts from the waitlist",
          "Celebration banner pops on /overview"
        ]
      }
    ]
  },
  {
    slug: "review-calls",
    title: "Review calls",
    oneLine: "Inbox, transcripts, structured outcomes.",
    estimatedMinutes: 5,
    cta: { label: "Open Calls", href: "/calls" },
    body: [
      { kind: "p", text: "Use the Calls page to review transcripts, structured outcomes, voicemail, declined offers, wrong-person answers, and manual follow-ups." },
      { kind: "h", text: "Tabs that matter" },
      {
        kind: "list",
        items: [
          "Needs review — wrong person, medical question, slot already taken, recording consent issue, webhook failed",
          "Voicemail / No answer — fallback flow already handled, but skim for opt-out signals",
          "Accepted — confirm the post-call Send Email actually sent (Calls detail → Email status)"
        ]
      }
    ]
  },
  {
    slug: "edge-cases",
    title: "Fix edge cases",
    oneLine: "What to do when things go sideways.",
    estimatedMinutes: 6,
    body: [
      { kind: "h", text: "Cases and remediations" },
      {
        kind: "kv",
        items: [
          { k: "Customer cannot arrive in time", v: "Algorithm marks TRAVEL_BLOCKED automatically. Re-rank with looser arrival buffer in Rules if a regular customer always trips this." },
          { k: "Customer lacks call consent", v: "Hard-blocked. Send a one-time consent SMS via /customers → profile → 'Request consent'." },
          { k: "Customer asks a medical question", v: "Agent declines per the prompt. Call gets needs_review flag. Receptionist follows up." },
          { k: "Customer says yes but slot was already taken", v: "Mid-call webhook returns proceed=false. Agent apologises and ends. No double-booking ever." },
          { k: "Customer opts out", v: "optOut=true in extraction → withdrawn_at written → enforce_consent_before_call() trigger blocks future calls." }
        ]
      }
    ]
  },
  {
    slug: "analytics",
    title: "Understand analytics",
    oneLine: "Revenue, fill rate, acceptance, expired.",
    estimatedMinutes: 5,
    cta: { label: "Open Analytics", href: "/analytics" },
    body: [
      { kind: "p", text: "Analytics show recovered revenue, recovered appointment hours, fill rate, time to fill, acceptance rate, voicemail rate, and manual intervention rate." },
      {
        kind: "callout",
        tone: "info",
        text: "Acceptance-by-time-left is the dial that drives most ROI. If acceptance falls off a cliff under 30 minutes, you need either more Emergency-aggression concurrent calls or a tighter waitlist."
      }
    ]
  },
  {
    slug: "gdpr",
    title: "GDPR and data safety",
    oneLine: "Article 5/6/7/15/17/25/32/46 in plain language.",
    estimatedMinutes: 10,
    cta: { label: "Open Compliance", href: "/compliance" },
    body: [
      { kind: "p", text: "OpenSlot AI is designed around consent, data minimization, auditability, access controls, and deletion workflows. Real compliance always requires legal review — code can be GDPR-by-default but not GDPR-certified by itself." },
      { kind: "h", text: "What's baked in" },
      {
        kind: "list",
        items: [
          "Article 5 — no diagnosis, no symptoms, no scan results in our DB. Only scheduling + consent + route fields.",
          "Article 6/9 — every audit row carries a lawful_basis_tag (contract / consent / legitimate-interest / vital-interest).",
          "Article 7 — withdrawn_at column triggers a hard block via Postgres trigger.",
          "Article 15 — DSAR export at /api/dsar/{customerId}/export returns a zip of everything touching that customer.",
          "Article 17 — erasure at /api/dsar/{customerId}/delete anonymizes audit history (preserves the trail) and hard-deletes consents.",
          "Article 25 — privacy by design: AES-256-GCM tokens, RLS on every table, no service role key in the browser.",
          "Article 32 — security: encryption at rest, role-based access via clinic_members.role, no plaintext secrets.",
          "Article 46 — international transfer: documented; SCCs are your contractual work with Fonio + Supabase + Google."
        ]
      },
      { kind: "h", text: "Retention defaults" },
      {
        kind: "kv",
        items: [
          { k: "Call audio", v: "off by default; 30 days max via Fonio" },
          { k: "Transcripts", v: "30 days (in our DB)" },
          { k: "Outcome metadata", v: "24 months" },
          { k: "Audit log", v: "6 years" },
          { k: "Consent proof", v: "until customer deletion + statutory hold" },
          { k: "Import files (Storage)", v: "7 days" }
        ]
      }
    ]
  },
  {
    slug: "cascade",
    title: "Advanced slot cascade",
    oneLine: "When one cancellation upgrades multiple customers.",
    estimatedMinutes: 6,
    body: [
      {
        kind: "p",
        text: "A cancellation can trigger a cascade. A customer with a later appointment may move earlier. Their old slot then becomes open. OpenSlot AI continues until the chain ends with a waitlist customer or reaches the maximum cascade depth."
      },
      { kind: "h", text: "Defaults you should know" },
      {
        kind: "kv",
        items: [
          { k: "Call booked customers first", v: "On" },
          { k: "Maximum cascade depth", v: "5" },
          { k: "Minimum earlier gain", v: "1 day" },
          { k: "Skip satisfied customers", v: "On (booking_satisfaction = satisfied → exclude)" },
          { k: "Require earlier-notification opt-in", v: "On" },
          { k: "Ask preference after every successful booking", v: "On" }
        ]
      }
    ]
  },
  {
    slug: "mastery",
    title: "Mastery checklist",
    oneLine: "9 boxes to tick before going live.",
    estimatedMinutes: 3,
    body: [
      {
        kind: "list",
        items: [
          "Calendar connected (Google OAuth complete)",
          "Waitlist imported (≥ 50 customers with consent + eligibility)",
          "Consent reviewed (call_consent ≥ 95%, no expired consents)",
          "Services configured (duration / value / required forms)",
          "Rules reviewed (weights tuned for your service mix)",
          "Phone calling tested (real Fonio call to your own mobile)",
          "First cancellation simulated (Simulation Controls → end-to-end)",
          "Audit log reviewed (lawful_basis_tag on every row)",
          "Analytics understood (acceptance curve baseline noted)"
        ]
      }
    ]
  }
];
