# OpenSlot AI

Receptionist-facing dispatch console for filling cancelled appointment slots from a waitlist.

The current app is a local mock UI built from the Fonio dispatch-console concept:

- urgent slots self-surface in an attention rail
- early slots call candidates one at a time
- urgent slots show widened call waves
- double accepts resolve into one winner plus durable runner-up priority
- manual actions use honest language around pause/book/cancel semantics
- owners get an analytics view for fill rate, recovered slots, and contact outcomes

## Run Locally

```bash
npm install
npm run dev
```

The dev server will print the local URL. In this environment it starts at:

```text
http://localhost:8080/
```

## Useful Commands

```bash
npm run build
npm run lint
npm run format
```

`npm run lint` currently reports only fast-refresh warnings from generated shadcn/Lovable UI files.

## Notes

This is frontend-only mock state for now. The main Fonio app state lives in:

```text
src/lib/fonio/store.tsx
src/lib/fonio/mock-data.ts
```

The primary UI components are in:

```text
src/components/fonio/
```

## Backend Scaffold

Local HTTP endpoints are mounted under `/api/*` from:

```text
src/lib/fonio/backend/router.server.ts
```

Frontend fetch helpers for those endpoints live in:

```text
src/lib/fonio/api-client.ts
```

The endpoint contract is documented in:

```text
docs/backend-endpoints.md
```

The teammate-facing calendar/calling contract is documented in:

```text
docs/friend-integration-contract.md
```
