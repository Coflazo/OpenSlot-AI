# How to run OpenSlot AI from zero

## 0. What works without any creds (the default demo)

You can already run the entire product right now without touching `.env`:

```
cd "/Users/pc/Desktop/OpenSlot AI"
npm run dev
```

Open `http://localhost:3000`. Bottom-right Simulation panel → **"Cancel today 16:30"** runs the scripted Alex → Sara → Mia cascade. Every page works. No real calls are placed.

In this mode the product is fully usable as a sales demo, a product walkthrough, and an algorithm visualizer.

---

## 1. To make Fonio actually phone you

Open `/Users/pc/Desktop/OpenSlot AI/.env` and set the Fonio variables:

```
USE_MOCK_FONIO=false                          # ← FLIP THIS to false
FONIO_API_KEY=<paste from app.fonio.ai>
FONIO_BASE_URL=https://app.fonio.ai/api
FONIO_ASSISTANT_ID=<your assistant id>
FONIO_OUTBOUND_NUMBER_ID=<an Import Number id, ~€5/mo>
FONIO_WEBHOOK_TOKEN=<a long random string you choose>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Then in your Fonio dashboard (one-time):

1. **Assistant → Prompt**: paste the **Perfect Fonio Prompt**. Find it on `/integrations` and click "Copy prompt", or open `lib/fonio/prompt.ts`.
2. **Assistant → Webhooks** (Advanced Settings → Content-Type: application/json):
   - Inbound URL: `http://localhost:3000/api/fonio/inbound?token=<FONIO_WEBHOOK_TOKEN>`
   - Mid-call URL: `http://localhost:3000/api/fonio/mid-call?token=<FONIO_WEBHOOK_TOKEN>`
   - Post-call URL: `http://localhost:3000/api/fonio/post-call?token=<FONIO_WEBHOOK_TOKEN>`
   - For Fonio to reach `localhost`, run an ngrok tunnel: `ngrok http 3000` and use the public https URL in place of `http://localhost:3000`.
3. **Assistant → Technical → Variable Extraction Active**: add the 8 fields shown on `/integrations` (slotAccepted, identityConfirmed, askedMedicalQuestion, wantsCallback, voicemail, optOut, customerLanguage, customerPickedAlternateTime).
4. **Post-call actions → Send Email**: configure customer confirmation + clinic ops summary. Whitelist `app@mail.fonio.com` in your SMTP filter.
5. **Phone Numbers → Add Number → Import Number**: register the Austrian outbound number you bought. Copy its id into `FONIO_OUTBOUND_NUMBER_ID`.

Restart dev: `Ctrl+C` then `npm run dev` again.

Now go to `http://localhost:3000`. Bottom-right Simulation panel has two buttons:

- **Call Çağan now** — places a real outbound Fonio call to `+31 6 309 247 15`. Live status panel appears above with status badge, waveform, elapsed timer, and the structured extraction (slotAccepted, voicemail, opt-out, etc.) once the call ends.
- **Cancel today 16:30** — runs the scripted offline cascade as before.

---

## 2. Optional: real Supabase (persistence + auth + audit)

Without Supabase the product runs entirely in-memory (Zustand store + the demo-call in-memory map). With Supabase, the same product also persists customers, slots, audit log, GDPR DSAR exports, etc.

Steps:

1. Create a project at `https://supabase.com`. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service role → `SUPABASE_SERVICE_ROLE_KEY`
2. Generate a token encryption key: `openssl rand -hex 32` → `TOKEN_ENCRYPTION_KEY`.
3. Open Supabase SQL editor and paste each file in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_claim_open_slot_rpc.sql`
   - `supabase/migrations/004_helper_functions.sql`
4. Insert your clinic + member:
   ```sql
   insert into public.clinics (name, legal_name, timezone)
     values ('Vienna Private Imaging', 'Vienna Private Imaging GmbH', 'Europe/Vienna')
     returning id;
   -- copy the id, then:
   insert into public.clinic_members (clinic_id, user_id, role)
     values ('<id>', auth.uid(), 'owner');
   ```
5. Create a Storage bucket named `imports`, private, 10 MB file limit.
6. Restart dev.

Now `/data` can really sync to Supabase. `/compliance → DSAR queue` works. The Fonio post-call webhook writes to `call_attempts` and atomically locks slots via `claim_open_slot()`.

---

## 3. Optional: Google Calendar (not required, ever)

If you want two-way sync with a real Google Calendar:

1. Cloud Console → new project "OpenSlot AI" → enable Google Calendar API.
2. OAuth client → Web. Authorized redirect URI: `http://localhost:3000/api/google/callback`.
3. Paste `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` into `.env`.
4. Visit `/integrations` → Google Calendar card → Connect.

Without these env vars, `/api/google/connect` returns a clear 503 and the Calendar page works fine in standalone mode. **The product never requires Google.**

---

## 4. Things to click, in order

Once `npm run dev` is up at `http://localhost:3000`:

1. **`/overview`** — KPI bento. Watch recovered revenue count up after a cascade.
2. **Simulation panel → Call Çağan now** — your phone rings. Lina greets you in English: "Hi, am I speaking with Çağan?" Say yes; she offers a 16:30 MRI Knee slot, asks if you're available. The live panel shows ringing → talking → final extraction.
3. **`/open-slots`** — click the cancelled row → side drawer with workflow timeline + cascade chain.
4. **`/waitlist`** — switch context slot, see Çağan ranked #1 with score 90+ (urgently_wants_earlier + close + ready). Score breakdown panel on the right.
5. **`/algorithm`** — pick Çağan from the candidate race. Drag the time-left override down to 30 min → see his travel feasibility recompute. Drag a weight slider on `/rules` in a second tab → watch the bars shift instantly.
6. **`/rules`** — eight tabs. Try Ranking → drag a slider. Try Scripts → insert `{{customer_name}}` variable chips.
7. **`/calendar`** — Day / Week / Month toggle. The cancelled 16:30 slot shows peacock (open).
8. **`/calls`** — every Fonio call lands here with transcript + structured extraction + recording waveform player.
9. **`/customers/cust_cagan`** — Çağan's profile: consent / eligibility / preferences / opt-out modal.
10. **`/integrations`** — full Fonio card: prompt + webhook URLs + Variable Extraction + Test call form.
11. **`/data`** — drop `public/OpenSlot_AI_mock_database.xlsx` (or click "Use sample workbook") → editable grid → Validate → Sync.
12. **`/academy`** — 14 chapters, ~90 min total. Setup checklist on the right reads real state.
13. **`/compliance`** — 8 tabs: Consent, Audit log, Data retention (real policy table), Recording, Data map, Lawful basis, DSAR queue, Exports.
14. **`/analytics`** — recharts dashboards.

---

## 5. Build, test, deploy

```
npm run typecheck       # tsc --noEmit
npm run build           # next build → 32 routes
npm run test:algo       # 17 unit assertions
npm run seed:xlsx       # regenerate the mock workbook
```

To deploy to Vercel:
1. Push the repo (the `.env` file is gitignored — only `.env.example` ships).
2. Connect to Vercel.
3. Paste the same env vars into Vercel project settings.
4. Update `NEXT_PUBLIC_APP_URL` + `GOOGLE_REDIRECT_URI` + the three Fonio webhook URLs in the Fonio dashboard to your production domain (no ngrok needed).

---

## 6. Troubleshooting

- **"Call Çağan now" returns `fonio_not_configured`**
  Set `USE_MOCK_FONIO=false` in `.env` and confirm `FONIO_API_KEY`, `FONIO_ASSISTANT_ID`, `FONIO_OUTBOUND_NUMBER_ID` are filled. Restart dev.

- **Fonio webhooks never fire**
  You're on `http://localhost:3000` — Fonio can't reach localhost. Run `ngrok http 3000` and use the https forwarding URL in all 3 webhook fields.

- **"Apologise and end the call: the slot was just taken"**
  That's the mid-call webhook doing its job — the slot was already filled by another path. By design.

- **Google Calendar "503 google_calendar_not_configured"**
  Optional integration. Leave `GOOGLE_CLIENT_ID`/`SECRET` blank and the rest of the product works.

- **`npm run dev` says port 3000 in use**
  `lsof -ti:3000 | xargs kill -9` then `npm run dev` again, or accept the fallback to `:3001` (then update `NEXT_PUBLIC_APP_URL` and the webhook URLs).

- **Build fails on a new file**
  `npx tsc --noEmit` for the exact error. The Phosphor icons import gotcha (`Type 'Icon' is not assignable`) is fixed by `import type { Icon } from "@phosphor-icons/react"`.

---

## 7. One-paragraph reference of the whole thing

OpenSlot AI is an operations dashboard for private MRI/CT clinics built on Next.js 14 + Tailwind + Zustand + Supabase + Fonio. The cancellation engine runs in the order: detect → hard-filter (consent, eligibility, contrast, cooldown, opt-out) → A* route check from the customer's location to the clinic (skip anyone who can't arrive in time after the arrival buffer) → weighted score `0.30 eligibility + 0.20 urgency + 0.15 wait + 0.15 pickup + 0.10 priority + 0.10 preference + 0.25 travel − 0.20 cooldown` → aggression-based concurrent outbound calls via Fonio (calm 1 / focused 2 / aggressive 5 / emergency 10) → transactional Supabase `claim_open_slot` RPC that ensures exactly one customer wins the slot → Google Calendar event update with idempotent `eventId=openslot{slotId}` → audit row with a GDPR lawful_basis_tag → if the accepter had a future booking, that booking becomes the next open slot and the algorithm recurses up to depth 5 → final emit of recovered revenue, scanner time, fill rate to `/analytics` and `/overview`.

That's the whole product.
