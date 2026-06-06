# Friend Integration Contract

This document defines what the calendar/calling integration owner should build, and what they
should not build.

The product is now split like this:

- **OpenSlot AI frontend/backend scaffold** owns slot state, ranking, wave sizing, booking
  attempts, runner-up handling, and receptionist UI.
- **Integration layer** owns calendar plumbing and calling-provider plumbing.

The integration layer should treat this app as the booking brain.

It may report external events, but it should not decide who wins a slot.

## 1. Your Friend Owns

### External DB / Mock Data Boundary

For now, this repo uses an in-memory mock backend. There is no production database yet.

Current mock state lives in:

```text
src/lib/fonio/backend/store.server.ts
src/lib/fonio/mock-data.ts
```

Your friend should not write directly to this mock store. They should only use the `/api/*`
endpoints. This keeps the eventual switch to Supabase/Postgres simple.

For the hackathon, treat the backend as if it were the real database API:

- `GET /api/slots` reads current slots.
- `GET /api/waitlist` reads mock candidates.
- `POST /api/slots/opened` creates a slot from the calendar integration.
- `POST /api/waves/dispatch` creates an offering wave.
- `POST /api/calls/outcome` records Fonio/calling outcomes.
- `POST /api/bookings/attempt` is the only booking decision point.

Production DB tables will likely map to:

```text
slots
waitlist_entries
slot_waves
call_attempts
booking_attempts
priority_bumps
integration_events
```

The integration owner only needs to think in terms of endpoint payloads, not direct table writes.

### Calendar Adapter

Build the code that detects appointment openings from the calendar system.

Responsibilities:

- Detect cancellations, no-shows, manual openings, or changed appointment availability.
- Normalize the external calendar event into an OpenSlot slot.
- Call `POST /api/slots/opened`.
- Avoid sending duplicate slot-open events, or reuse the same external slot id when retrying.
- Later, when a booking succeeds, update the real calendar with the booked customer.

### Calling Adapter

Build the code that starts outbound calls through the calling provider.

Responsibilities:

- Receive a wave from `POST /api/waves/dispatch`.
- Call the selected candidates through the calling provider.
- Attach metadata to each call:
  - `slotId`
  - `candidateId`
  - `waveId`
  - provider call id
- Convert provider webhooks into normalized call outcomes.
- Call `POST /api/calls/outcome`.
- Send runner-up/customer messages if the provider owns messaging, after the backend says a
  candidate is runner-up.

### Scheduling / Timeout Adapter

Build the simple timing loop that asks for the next wave after a wave times out.

Responsibilities:

- After dispatching a wave, wait for call timeout plus buffer.
- Re-check slot state.
- If the slot is still not booked, call `POST /api/waves/dispatch` again.
- Stop when the backend returns escalation, booked, expired, or no eligible candidates.

## 2. Your Friend Does Not Own

They should not implement:

- Candidate scoring.
- Wave-size math.
- Fairness vs. urgency decisions.
- Booking winner selection.
- Runner-up priority rules.
- Manual booking conflict logic.
- Slot state machine rules.

Those belong to this repo.

## 3. Core Rule

The integration layer can say:

> This candidate accepted.

Only this backend can say:

> This candidate won the booking.

Every acceptance, whether from a phone call or receptionist manual action, must go through:

```http
POST /api/bookings/attempt
```

or through:

```http
POST /api/calls/outcome
```

with:

```json
{
  "outcome": "accepted"
}
```

The backend then performs the booking attempt.

## 4. Happy Path Flow

### Step 1: Calendar opening detected

Integration calls:

```http
POST /api/slots/opened
Content-Type: application/json

{
  "id": "calendar-slot-abc123",
  "timeLabel": "15:30",
  "startsInMin": 120,
  "provider": "Dr. Weber",
  "service": "CT Scan",
  "fillMode": "Balanced"
}
```

Backend returns the normalized slot.

### Step 2: Integration asks backend to dispatch a wave

Integration calls:

```http
POST /api/waves/dispatch
Content-Type: application/json

{
  "slotId": "calendar-slot-abc123"
}
```

Backend returns:

- slot state
- selected wave
- wave id
- wave size
- candidates to call
- algorithm recommendation

The integration layer should call only the candidates selected by the backend.

### Step 3: Calling provider starts outbound calls

For every candidate in the returned wave, the calling adapter starts a call.

Provider metadata should include:

```json
{
  "slotId": "calendar-slot-abc123",
  "candidateId": "c1",
  "waveId": "calendar-slot-abc123:wave:1"
}
```

### Step 4: Calling provider sends webhook

The integration maps provider-specific states into OpenSlot outcomes:

| Provider event                     | OpenSlot outcome                             |
| ---------------------------------- | -------------------------------------------- |
| call answered and customer accepts | `accepted`                                   |
| customer declines                  | `declined`                                   |
| timeout / voicemail / no pickup    | `no_answer`                                  |
| call started/ringing               | `ringing`                                    |
| provider cannot call               | `no_answer` or escalate, depending on reason |

Integration calls:

```http
POST /api/calls/outcome
Content-Type: application/json

{
  "slotId": "calendar-slot-abc123",
  "candidateId": "c1",
  "waveId": "calendar-slot-abc123:wave:1",
  "outcome": "accepted",
  "providerEventId": "provider-event-789"
}
```

If the outcome is `accepted`, the backend attempts booking.

### Step 5: Booking result

If backend returns:

```json
{
  "booking": {
    "ok": true,
    "code": "BOOKED"
  }
}
```

Integration should:

- stop starting new calls for that slot
- update external calendar
- optionally notify the winner if the call flow has not already confirmed it
- let the frontend show the booked state

If backend returns:

```json
{
  "booking": {
    "ok": false,
    "code": "BOOKING_CONFLICT"
  }
}
```

Integration should:

- treat the accepting candidate as a runner-up
- send the runner-up message if messaging lives in the calling provider
- not update the external calendar for that candidate

## 5. Timeout Flow

After a wave dispatch:

1. Wait `call_timeout + buffer`.
2. Fetch the slot or dispatch the next wave.
3. If backend returns `ok: true`, call the next wave.
4. If backend returns no candidates or escalated, stop automated calling.

The integration layer should not calculate wave size itself.

It should repeatedly ask:

```http
POST /api/waves/dispatch
```

The backend decides whether the next wave should be size 1, 2, 5, or escalation.

## 6. Error Handling Contract

### Duplicate Provider Webhooks

Always pass a stable `providerEventId`.

The backend dedupes repeated provider events.

### Provider Call Fails

If the provider cannot start a call:

- Record the failed attempt as `no_answer`, or
- Escalate if the failure is systemic.

Use:

```http
POST /api/calls/outcome
```

or:

```http
POST /api/slots/escalate
```

### Backend Says Slot Is Already Booked

Do not retry booking as a workaround.

Treat the candidate as runner-up if the backend response says so.

### Backend Is Unavailable

The integration should retry with backoff.

Do not call more candidates while the backend is unavailable, because the backend owns wave
selection and booking safety.

## 7. Required Metadata

Every external call should carry:

```json
{
  "slotId": "string",
  "candidateId": "string",
  "waveId": "string",
  "providerCallId": "string"
}
```

Every provider webhook sent back to the backend should include:

```json
{
  "slotId": "string",
  "candidateId": "string",
  "waveId": "string",
  "providerEventId": "string",
  "outcome": "accepted | declined | no_answer | ringing"
}
```

## 8. Open Data Question

The current UI mock candidates have ids and names, but not real phone numbers.

Before the calling adapter can make real calls, we need one of these:

1. Add `phoneE164` to backend candidate records, or
2. Let the calling adapter own a lookup table from `candidateId` to phone number.

Preferred for the demo:

```text
backend candidate records include phoneE164, but the UI does not display it by default
```

## 9. Demo Acceptance Criteria

Your friend's integration is demo-ready when it can show:

1. A calendar opening creates a slot via `POST /api/slots/opened`.
2. The integration asks the backend for a wave via `POST /api/waves/dispatch`.
3. The calling provider receives selected candidates with `slotId`, `candidateId`, and `waveId`.
4. A provider webhook with `accepted` books the slot through backend logic.
5. Two acceptances for the same slot produce one winner and one runner-up.
6. Duplicate provider webhooks do not create duplicate bookings.
7. If no one accepts before timeout, the integration asks for another wave instead of choosing candidates itself.

## 10. One-Sentence Contract

The integration layer moves events between calendar/calling systems and OpenSlot AI; OpenSlot AI
chooses waves, owns booking safety, and decides the winner.
