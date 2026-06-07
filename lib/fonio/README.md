# Fonio Adapter

The frontend talks to the voice provider exclusively through the `FonioAdapter` interface defined in `types.ts`.

Today the active implementation is `mockAdapter.ts`, which produces scripted call sessions in front of the UI.
When wiring the real backend, implement `FonioAdapter` against the Fonio REST API + Webhook events
(https://www.fonio.ai), then call `setFonio(new RealFonioAdapter(...))` once at app boot.

The contract:

- `startCall(req)` returns a `callId` after the call has been queued.
- `onCallEvent(handler)` lets the UI subscribe to lifecycle events
  (`ringing`, `in_progress`, `transcript_turn`, `completed`).
- The completed event carries the final `status`, transcript turns, structured `extraction`,
  and an optional `recordingUrl`.

Environment variables expected by the production adapter:

- `FONIO_API_KEY`
- `FONIO_BASE_URL` (defaults to `https://api.fonio.ai`)
- `FONIO_WEBHOOK_SECRET` for verifying inbound webhooks

The webhook payloads the rest of the app expects are documented on the Integrations page
inside the dashboard (`/integrations`).
