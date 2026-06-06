# Backend Endpoint Scaffold

This project is now scoped to the frontend plus the booking/ranking algorithm.

Calendar and calling plumbing can be built separately, then connected to these endpoints.

## Ownership Split

- Frontend: Lovable/TanStack UI in `src/components/fonio`.
- Booking algorithm: `src/lib/fonio/backend/algorithm.ts`.
- Live backend state and booking semantics: `src/lib/fonio/backend/supabase-store.server.ts`.
- Deterministic pressure-test backend state: `src/lib/fonio/backend/store.server.ts`.
- HTTP endpoint router: `src/lib/fonio/backend/router.server.ts`.
- Calendar/calling integration: external service or teammate-owned code calls these endpoints.

The live HTTP API is Supabase-backed. Local algorithm pressure tests still use the in-memory store
so race/upgrade scenarios stay deterministic and do not mutate the shared hackathon database.

Server writes require either `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` or permissive RLS write
policies for the hackathon tables. The anon key can read, but it may not be allowed to insert/update.

## Endpoint List

### Health

```http
GET /api/health
```

### Read UI State

```http
GET /api/slots
GET /api/slots/:slotId
GET /api/waitlist
```

### Calendar/Cancellation Integration

Called when your friend's calendar plumbing detects a freed appointment slot.

```http
POST /api/slots/opened
Content-Type: application/json

{
  "id": "external-slot-123",
  "timeLabel": "15:30",
  "startsInMin": 120,
  "provider": "Dr. Weber",
  "service": "CT Scan",
  "fillMode": "Balanced"
}
```

### Algorithm

Use these to keep the scoring/wave logic out of the UI and out of integration plumbing.

```http
POST /api/algorithm/rank
Content-Type: application/json

{
  "slotId": "s-1030"
}
```

```http
POST /api/algorithm/wave-size
Content-Type: application/json

{
  "p": 0.3,
  "usableTimeMin": 40,
  "fillMode": "Balanced",
  "callTimeoutMin": 5,
  "bufferMin": 2
}
```

### Wave Dispatch

This creates an `OFFERING` wave in local state. Your friend's calling plumbing can call the
returned candidates.

```http
POST /api/waves/dispatch
Content-Type: application/json

{
  "slotId": "s-1200"
}
```

Optional:

```json
{
  "slotId": "s-1200",
  "requestedWaveSize": 2
}
```

### Call Outcome Webhook

The calling service should call this when a candidate accepts, declines, no-answers, etc.

```http
POST /api/calls/outcome
Content-Type: application/json

{
  "slotId": "s-1030",
  "candidateId": "c1",
  "waveId": "s-1030:wave:3",
  "outcome": "accepted",
  "providerEventId": "fonio-event-abc"
}
```

Duplicate `providerEventId` values are ignored.

If `outcome` is `accepted`, this endpoint calls the same booking attempt logic used by manual booking.

### Atomic Booking Attempt

Both automated call acceptance and receptionist manual booking should use this endpoint.

```http
POST /api/bookings/attempt
Content-Type: application/json

{
  "slotId": "s-1030",
  "candidateId": "c1",
  "waveId": "s-1030:wave:3",
  "source": "call_webhook"
}
```

Manual booking:

```json
{
  "slotId": "s-1030",
  "candidateName": "Manual Patient",
  "source": "manual"
}
```

If the slot is already booked, the response returns `BOOKING_CONFLICT` and creates runner-up
priority when appropriate.

### Receptionist Actions

```http
POST /api/slots/pause-new-waves
Content-Type: application/json

{
  "slotId": "s-1030",
  "paused": true
}
```

```http
POST /api/slots/escalate
Content-Type: application/json

{
  "slotId": "s-1030",
  "reason": "Receptionist requested manual handling"
}
```

```http
POST /api/slots/cancel-and-reopen
Content-Type: application/json

{
  "slotId": "s-1130"
}
```

## Where Booking Logic Runs

For the demo scaffold, booking logic runs in:

```text
src/lib/fonio/backend/store.server.ts
```

For production, move the same semantics into a database transaction or RPC:

```sql
UPDATE slots
SET status = 'BOOKED',
    booked_candidate_id = :candidate_id
WHERE id = :slot_id
  AND status = 'OFFERING'
  AND active_wave_id = :wave_id;
```

The important rule remains:

> Integrations may report that someone accepted. Only the booking endpoint/database transaction
> decides who actually wins the slot.
