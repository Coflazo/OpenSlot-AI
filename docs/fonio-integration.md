# Fonio Integration Guide

This document explains how Fonio outbound calls are integrated with OpenSlot-AI.

## Architecture

The Fonio integration consists of three main components:

### 1. Fonio Client (`src/lib/fonio/backend/fonio-client.server.ts`)

**Responsibilities:**
- Makes actual HTTP calls to Fonio API
- Handles authentication with API key
- Constructs call payloads with context variables
- Parses transcriptions to determine accept/decline (Phase 1: placeholder)

**Key Functions:**
- `makeOutboundCall(toNumber, candidateName, slotDetails)` - Initiates a call via Fonio
- `parseCallTranscription(transcription)` - Analyzes call transcription (Phase 1: keyword-based)

### 2. Call Orchestrator (`src/lib/fonio/backend/call-orchestrator.server.ts`)

**Responsibilities:**
- Orchestrates the complete call workflow
- Dispatches waves from the queue
- Coordinates sequential calls to candidates
- Records call outcomes in the system
- Stops calling once a candidate accepts

**Key Functions:**
- `orchestrateCallWave(request)` - Main entry point
- `callCandidate(candidate, slot)` - Single candidate call

### 3. Backend Router (`src/lib/fonio/backend/router.server.ts`)

**New Endpoint:**

```http
POST /api/calls/orchestrate
Content-Type: application/json

{
  "slotId": "slot-123",
  "waveSize": 3
}
```

## Workflow

### When a Slot is Cancelled

1. **Calendar/Web App** calls `POST /api/slots/opened` with slot details
2. **Optional:** Call `POST /api/calls/orchestrate` to start automated calling
3. **Orchestrator:**
   - Dispatches a wave of candidates
   - Makes Fonio calls to each candidate
   - Records outcomes automatically
   - Stops when someone accepts

### Call Flow for Each Candidate

```
Orchestrator → Dispatch Wave → Get Candidates
             ↓
        For Each Candidate:
             ↓
    Make Fonio Call (Real Time)
             ↓
    Fonio Calls Candidate (Ring/Connect/Hangup)
             ↓
    Get Transcription (When Available)
             ↓
    Analyze Decision (Accept/Decline)
             ↓
    Record Outcome in System
             ↓
    If Accepted → Stop
    If Declined → Try Next
```

## Environment Variables

Add these to `.env.local`:

```env
FONIO_API_KEY=fonio_xxxxxxxxxxxxxxxxxxxxxxxx
FONIO_FROM_NUMBER=+34667889775
FONIO_AGENT_ID=5e3bbca9-8456-4030-95da-6b104262aab6
```

## Current Limitations (Phase 1)

- ✅ Real Fonio calls are made
- ⏳ Decision is **RANDOM** (50/50 accept/decline)
- ⏳ Transcription analysis is a **PLACEHOLDER** (keyword-based)
- ⏳ No retry mechanism yet
- ⏳ No advanced scheduling

## Frontend Integration

Use the API client from the UI:

```typescript
import { fonioApi } from "@/lib/fonio/api-client";

// Start call wave for a slot
const result = await fonioApi.orchestrateCallWave("slot-123", 3);
// Returns: { success, slotId, candidatesCalled, callResults, message }
```

## Next Phases

### Phase 2: Smart Decision Making
- Replace random decision with transcription analysis
- Use ML to detect acceptance/decline keywords in multiple languages
- Implement confidence scoring

### Phase 3: Advanced Features
- Automated retry with exponential backoff
- Priority-based candidate ordering
- Contact frequency limits per candidate
- Do-not-call list management
- Analytics on call outcomes by provider/service

### Phase 4: Production Ready
- Database persistence for call logs
- Webhook from Fonio for call completion events
- Real-time call status tracking
- Recording and storage of transcriptions
- Integration with Google Calendar for booking confirmations

## Testing

### Manual Test Flow

1. Create a slot:
```bash
curl -X POST http://localhost:8080/api/slots/opened \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-slot-1",
    "timeLabel": "14:00",
    "startsInMin": 60,
    "provider": "Dr. Smith",
    "service": "Consultation",
    "fillMode": "Balanced"
  }'
```

2. Start call wave:
```bash
curl -X POST http://localhost:8080/api/calls/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "slotId": "test-slot-1",
    "waveSize": 2
  }'
```

3. Check results in the UI or API response

## Troubleshooting

### "Fonio credentials not configured"
- Check `.env.local` file
- Ensure all three variables are set: `FONIO_API_KEY`, `FONIO_FROM_NUMBER`, `FONIO_AGENT_ID`

### "No valid phone number found"
- Phone numbers are extracted from waitlist `eligibilityNotes` field
- Format must be: `+CC123456789` (with + and country code)
- Improve in Phase 2 by adding dedicated `phone` field to waitlist

### Call not connecting
- Verify `FONIO_FROM_NUMBER` is a valid outbound number configured in Fonio
- Check that the `toNumber` is in a supported country
- Fonio has restrictions on international calls from some numbers

## Code Structure

```
src/lib/fonio/backend/
├── algorithm.ts              (ranking, wave size logic)
├── store.server.ts           (in-memory state)
├── router.server.ts          (HTTP endpoints) ← Updated
├── fonio-client.server.ts    (Fonio API client) ← New
└── call-orchestrator.server.ts (call workflow) ← New

src/lib/fonio/
└── api-client.ts             (Frontend API helpers) ← Updated
```

## Future: Google Calendar Integration

Once call orchestration is working, integrate with Google Calendar:

1. On call acceptance, create calendar event
2. Send confirmation to customer
3. Update CRM with booking status
4. Send reminder to coverage person

See: `docs/friend-integration-contract.md` for calendar integration details.
