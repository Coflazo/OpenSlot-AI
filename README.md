# OpenSlot AI

Automated appointment slot recovery for medical clinics. When a patient cancels or no-shows, OpenSlot AI immediately calls the most suitable person on the waitlist — and keeps calling until the slot is filled.

Built at **Vienna StartHacks 2026**.

---

## The Problem

A clinic with four providers loses roughly 35 slots per week to cancellations and no-shows. Staff manually work through a printed list, one call at a time. By the time someone picks up, the slot is often gone. Revenue is lost, patients wait longer than they need to.

## What OpenSlot AI Does

1. A cancellation is detected in the calendar
2. The algorithm scores and ranks every eligible waitlisted patient for that specific slot
3. It calls the top candidate via an AI voice agent (Fonio)
4. If no answer or declined, it widens to parallel calls as urgency increases
5. The first patient to accept is booked atomically — no double-booking possible
6. Runner-up patients who accepted but lost the race get guaranteed priority on the next matching slot

The receptionist dashboard shows everything in real time. If the system cannot fill automatically, it escalates with a ranked shortlist.

---

## The Algorithm

The core insight: fairness and efficiency are not always equally important. With three days to fill a slot, call one person at a time. With ten minutes left, call in parallel.

### Candidate Scoring

```
score = 0.30 × normalized_wait_time
      + 0.35 × preference_match        (saved weekday / time preferences)
      + 0.25 × priority_boost          (VIP flag or runner-up status)
      − 0.10 × cooldown_penalty        (recently contacted)
```

Ineligible candidates are filtered before scoring: no consent, weekly contact limit reached, or inside quiet hours.

### Wave Sizing

```
K_needed        = ⌈ log(1 − target_fill) / log(1 − p) ⌉
waves_possible  = ⌊ time_left / (call_timeout + buffer) ⌋

wave_size = 1                               if waves_possible ≥ K_needed
wave_size = ⌈ K_needed / waves_possible ⌉   otherwise
```

The clinic sets one of three modes — **Patient** (65% target), **Balanced** (80%), **Aggressive** (92%). The algorithm translates that into a concrete wave size per slot. No manual tuning.

### Upgrade Cascade

Booked patients who indicated they want an earlier appointment are offered newly-opened slots. When one accepts, their original slot is released back into the fill pipeline — recovering two slots from one outreach action. 39% of upgrade offers were accepted in simulation.

### Slot State Machine

```
OPEN  →  OFFERING  →  BOOKED
                   →  ESCALATED   (no eligible candidates)
                   →  EXPIRED     (slot started unfilled)
```

Atomic booking prevents double-booking even if multiple patients accept in the same wave.

---

## Simulation Results

50 independent Monte Carlo trials, 5-week horizon each, seeds 2026–2075.
Four providers, 180-patient starting waitlist, realistic cancellation distributions.
Baseline: naive FIFO, wave size always 1, no upgrade cascade.

| Metric | OpenSlot AI | FIFO Baseline |
|---|---|---|
| Mean fill rate | **85.6%** | 80.9% |
| Lost slots per 5 weeks | **25.8** | 34.5 |
| Reduction in empty slots | **−25%** | — |
| Double-bookings | **0** | 0 |
| Runner-up honor rate | **46.5%** | 0% |
| Upgrade acceptance rate | **39.0%** | 0% |

90% confidence range across all trials: **78.1% – 94.4%**

Full numbers: [`lib/sim-results.ts`](lib/sim-results.ts)

---

## Try the Algorithm

```bash
npm run demo                         # Balanced mode, 45 min lead time, seed 7
npm run demo -- --mode=Aggressive    # wider waves earlier
npm run demo -- --lead=10            # urgent slot — immediate parallel calls
npm run demo -- --seed=42            # different patient draw
```

Runs a single cancellation through the real algorithm — scoring, wave sizing, fill loop — and prints every decision to the terminal. No server, no database required.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (Turbopack), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4, Outfit (Google Fonts) |
| Database | Supabase (PostgreSQL) |
| AI Voice | Fonio.ai (outbound call agent) |
| Icons | Lucide React |

---

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in your keys (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
FONIO_API_KEY=
FONIO_FROM_NUMBER=
FONIO_AGENT_ID=
FONIO_CLINIC_NAME=
```

---

## Project Structure

```
app/
  overview/           Dashboard — KPIs, activity feed, simulation preview strip
  analytics/          Monte Carlo results — histogram, percentile scenarios, methodology
  calendar/           Weekly view — live slot states, auto-triggers Fonio calls
  waitlist/           Patient waitlist with search and service filters
  customers/          Patient management
  api/                REST endpoints (slots, waitlist, offerings, Fonio webhooks)

lib/
  sim-results.ts      Typed static export of real 50-trial simulation data
  fonio/client.ts     Fonio outbound call client

src/lib/fonio/
  types.ts                    Shared types (FillMode, Candidate, Slot, CallOutcome)
  backend/algorithm.ts        Core algorithm — rankCandidates, calculateWaveSize,
                              estimateSlotCallSuccess, eligibleForNextWave

scripts/
  algo-demo.ts        Standalone terminal demo (npm run demo)
```

---

## How the Live Dashboard Works

**Calendar** polls Supabase every 3 seconds. When a slot becomes `OPEN`, it waits 5 seconds then moves it to `OFFERING` and fires a Fonio call to the top-ranked patient. If the patient declines or does not answer, the Fonio webhook triggers the next candidate automatically. The receptionist sees the live state without touching anything.

**Waitlist** updates every 3 seconds. Filterable by service. Status badges reflect `active`, `paused`, `fulfilled`, and `expired`.

**Analytics** is fully static — seeded from `lib/sim-results.ts`. The data comes from the companion simulation repo (`OpenSlot-AI-sim`), which runs the same algorithm implementation against a full seeded clinic model over 50 trials.

---

## Companion Repo

The simulation that produced these results lives in `../OpenSlot-AI-sim`. It imports the algorithm directly from this repo (`src/lib/fonio/backend/algorithm.ts`) and runs it against a full event-driven clinic model with real-time slot management, patient waitlists, upgrade cascades, and invariant checking.

To re-run the 50 trials:

```bash
cd ../OpenSlot-AI-sim
npm run simulate:many
```
