# Supabase Data Model

This document defines the database shape we need when replacing the current in-memory mock store
with Supabase/Postgres.

The database must support:

- appointment slots opened by calendar cancellations
- waitlist ranking and call waves
- atomic booking attempts from both Fonio webhooks and receptionist actions
- duplicate webhook/event dedupe
- runner-up priority after double accepts
- upgrade flow: a patient with a later booked slot can accept an earlier opening, then their old
  slot is released back to the waitlist

## Naming Rule

Do not create a public `users` table. Supabase already has `auth.users`.

Use:

- `profiles` for app login/role data linked to `auth.users`
- `patients` for appointment customers
- `bookings` for confirmed appointment ownership

## Recommended Enums

```sql
create type app_role as enum ('owner', 'receptionist', 'integration');
create type slot_status as enum ('OPEN', 'OFFERING', 'BOOKED', 'ESCALATED', 'EXPIRED', 'PAUSED_NEW_WAVES');
create type fill_mode as enum ('Patient', 'Balanced', 'Aggressive');
create type booking_status as enum ('ACTIVE', 'CANCELLED', 'REPLACED_BY_UPGRADE', 'COMPLETED', 'NO_SHOW');
create type booking_source as enum ('calendar_seed', 'call_webhook', 'manual', 'upgrade');
create type waitlist_status as enum ('active', 'paused', 'snoozed', 'fulfilled', 'expired');
create type consent_status as enum ('granted', 'pending', 'revoked');
create type call_outcome as enum ('not_contacted', 'ringing', 'no_answer', 'declined', 'accepted', 'runner_up', 'booked', 'skipped');
create type offer_type as enum ('waitlist', 'upgrade');
create type offer_status as enum ('queued', 'calling', 'accepted', 'declined', 'timed_out', 'lost_conflict', 'cancelled');
create type priority_reason as enum ('runner_up', 'upgrade_wait', 'vip', 'manual');
create type integration_event_status as enum ('received', 'processed', 'duplicate', 'failed');
```

## Core Tables

### `clinics`

Tenant/business boundary. Almost every table should reference `clinic_id`.

| Field                               | Type          | Required | Notes                                    |
| ----------------------------------- | ------------- | -------- | ---------------------------------------- |
| `id`                                | `uuid`        | yes      | Primary key, default `gen_random_uuid()` |
| `name`                              | `text`        | yes      | Clinic/business name                     |
| `timezone`                          | `text`        | yes      | Example: `Europe/Vienna`                 |
| `fill_mode_default`                 | `fill_mode`   | yes      | Default `Balanced`                       |
| `quiet_hours_start`                 | `time`        | no       | Contact guardrail                        |
| `quiet_hours_end`                   | `time`        | no       | Contact guardrail                        |
| `max_contacts_per_patient_per_week` | `int`         | yes      | Anti-harassment cap                      |
| `created_at`                        | `timestamptz` | yes      | Default `now()`                          |
| `updated_at`                        | `timestamptz` | yes      | Maintain with trigger                    |

### `profiles`

Logged-in staff accounts. Links Supabase auth to a clinic.

| Field          | Type          | Required | Notes                                     |
| -------------- | ------------- | -------- | ----------------------------------------- |
| `id`           | `uuid`        | yes      | Primary key, references `auth.users(id)`  |
| `clinic_id`    | `uuid`        | yes      | References `clinics(id)`                  |
| `role`         | `app_role`    | yes      | `owner`, `receptionist`, or `integration` |
| `display_name` | `text`        | yes      | Staff-facing name                         |
| `email`        | `text`        | yes      | Copy from auth user for display/search    |
| `created_at`   | `timestamptz` | yes      | Default `now()`                           |
| `updated_at`   | `timestamptz` | yes      | Maintain with trigger                     |

### `providers`

Doctors, scanners, rooms, or any schedulable resource.

| Field                  | Type          | Required | Notes                       |
| ---------------------- | ------------- | -------- | --------------------------- |
| `id`                   | `uuid`        | yes      | Primary key                 |
| `clinic_id`            | `uuid`        | yes      | References `clinics(id)`    |
| `external_provider_id` | `text`        | no       | Calendar/provider-system id |
| `display_name`         | `text`        | yes      | Example: `Dr. Weber`        |
| `active`               | `boolean`     | yes      | Default `true`              |
| `created_at`           | `timestamptz` | yes      | Default `now()`             |
| `updated_at`           | `timestamptz` | yes      | Maintain with trigger       |

### `services`

Appointment/service types.

| Field          | Type          | Required | Notes                              |
| -------------- | ------------- | -------- | ---------------------------------- |
| `id`           | `uuid`        | yes      | Primary key                        |
| `clinic_id`    | `uuid`        | yes      | References `clinics(id)`           |
| `name`         | `text`        | yes      | Example: `CT Scan`, `Consultation` |
| `duration_min` | `int`         | yes      | Used for slot end time             |
| `value_cents`  | `int`         | no       | Optional owner analytics           |
| `active`       | `boolean`     | yes      | Default `true`                     |
| `created_at`   | `timestamptz` | yes      | Default `now()`                    |
| `updated_at`   | `timestamptz` | yes      | Maintain with trigger              |

### `patients`

Appointment customers. This is the main customer table.

| Field                            | Type             | Required | Notes                                |
| -------------------------------- | ---------------- | -------- | ------------------------------------ |
| `id`                             | `uuid`           | yes      | Primary key                          |
| `clinic_id`                      | `uuid`           | yes      | References `clinics(id)`             |
| `external_patient_id`            | `text`           | no       | Calendar/CRM id                      |
| `full_name`                      | `text`           | yes      | Display and call scripts             |
| `phone_e164`                     | `text`           | yes      | Required for Fonio calls             |
| `email`                          | `text`           | no       | Optional notifications               |
| `sms_consent`                    | `consent_status` | yes      | Default `pending`                    |
| `voice_consent`                  | `consent_status` | yes      | Default `pending`                    |
| `vip_priority`                   | `int`            | yes      | Default `0`; owner/business priority |
| `max_contacts_per_week_override` | `int`            | no       | Null means use clinic default        |
| `last_contacted_at`              | `timestamptz`    | no       | Fast guardrail check                 |
| `created_at`                     | `timestamptz`    | yes      | Default `now()`                      |
| `updated_at`                     | `timestamptz`    | yes      | Maintain with trigger                |

Recommended constraints:

- Unique `(clinic_id, phone_e164)` where phone is known.
- Optional unique `(clinic_id, external_patient_id)` when imported from a source system.

### `patient_preferences`

Structured scheduling preferences. Keep this separate from patients so preferences can evolve.

| Field                    | Type          | Required | Notes                                        |
| ------------------------ | ------------- | -------- | -------------------------------------------- |
| `id`                     | `uuid`        | yes      | Primary key                                  |
| `clinic_id`              | `uuid`        | yes      | References `clinics(id)`                     |
| `patient_id`             | `uuid`        | yes      | References `patients(id)`                    |
| `service_id`             | `uuid`        | no       | Null means general preference                |
| `provider_id`            | `uuid`        | no       | Null means any provider                      |
| `preferred_weekdays`     | `int[]`       | no       | `1` to `7`; ISO weekday                      |
| `preferred_time_windows` | `jsonb`       | no       | Example: `[{"start":"08:00","end":"12:00"}]` |
| `avoid_time_windows`     | `jsonb`       | no       | Optional hard avoids                         |
| `notes`                  | `text`        | no       | Human-readable reason                        |
| `created_at`             | `timestamptz` | yes      | Default `now()`                              |
| `updated_at`             | `timestamptz` | yes      | Maintain with trigger                        |

## Scheduling Tables

### `slots`

Calendar openings and appointment slots controlled by the booking algorithm.

| Field                        | Type          | Required | Notes                                                              |
| ---------------------------- | ------------- | -------- | ------------------------------------------------------------------ |
| `id`                         | `uuid`        | yes      | Primary key                                                        |
| `clinic_id`                  | `uuid`        | yes      | References `clinics(id)`                                           |
| `provider_id`                | `uuid`        | yes      | References `providers(id)`                                         |
| `service_id`                 | `uuid`        | yes      | References `services(id)`                                          |
| `external_calendar_event_id` | `text`        | no       | Calendar event/source id                                           |
| `starts_at`                  | `timestamptz` | yes      | Absolute start time                                                |
| `ends_at`                    | `timestamptz` | yes      | Absolute end time                                                  |
| `status`                     | `slot_status` | yes      | Default `OPEN`                                                     |
| `fill_mode`                  | `fill_mode`   | yes      | Default from clinic                                                |
| `active_wave_id`             | `uuid`        | no       | References `slot_waves(id)`                                        |
| `booked_booking_id`          | `uuid`        | no       | References `bookings(id)`                                          |
| `new_waves_paused`           | `boolean`     | yes      | Default `false`                                                    |
| `needs_attention`            | `boolean`     | yes      | Default `false`                                                    |
| `last_event`                 | `text`        | no       | Dashboard summary                                                  |
| `reasoning`                  | `text`        | no       | Explainability copy                                                |
| `recovered_min_before_start` | `int`         | no       | Analytics                                                          |
| `created_from`               | `text`        | yes      | Example: `calendar_cancellation`, `manual_open`, `upgrade_release` |
| `created_at`                 | `timestamptz` | yes      | Default `now()`                                                    |
| `updated_at`                 | `timestamptz` | yes      | Maintain with trigger                                              |

Recommended constraints:

- Unique `(clinic_id, external_calendar_event_id)` where external id is not null.
- Partial unique index: one active booking per slot.
- Check `ends_at > starts_at`.

### `bookings`

Confirmed appointment ownership. This is where the “user booking DB” really lives.

| Field                        | Type             | Required | Notes                                                   |
| ---------------------------- | ---------------- | -------- | ------------------------------------------------------- |
| `id`                         | `uuid`           | yes      | Primary key                                             |
| `clinic_id`                  | `uuid`           | yes      | References `clinics(id)`                                |
| `patient_id`                 | `uuid`           | yes      | References `patients(id)`                               |
| `slot_id`                    | `uuid`           | yes      | References `slots(id)`                                  |
| `service_id`                 | `uuid`           | yes      | Denormalized from slot for constraints and lookup       |
| `status`                     | `booking_status` | yes      | Default `ACTIVE`                                        |
| `source`                     | `booking_source` | yes      | `manual`, `call_webhook`, `upgrade`, etc.               |
| `external_calendar_event_id` | `text`           | no       | Calendar booking id after sync                          |
| `preference_fit`             | `text`           | no       | `ideal`, `acceptable`, `poor`; useful for upgrade logic |
| `upgrade_opt_in`             | `boolean`        | yes      | If true, patient can be offered earlier/better slots    |
| `replaced_by_booking_id`     | `uuid`           | no       | References `bookings(id)` for upgrade cascade           |
| `cancelled_reason`           | `text`           | no       | Human-readable reason                                   |
| `booked_at`                  | `timestamptz`    | yes      | Default `now()`                                         |
| `cancelled_at`               | `timestamptz`    | no       | Set when cancelled/replaced                             |
| `created_at`                 | `timestamptz`    | yes      | Default `now()`                                         |
| `updated_at`                 | `timestamptz`    | yes      | Maintain with trigger                                   |

Recommended constraints:

- Partial unique index on `(slot_id)` where `status = 'ACTIVE'`.
- Partial unique index on `(patient_id, service_id)` where `status = 'ACTIVE'`.

### `waitlist_entries`

People waiting for a slot.

| Field                     | Type              | Required | Notes                      |
| ------------------------- | ----------------- | -------- | -------------------------- |
| `id`                      | `uuid`            | yes      | Primary key                |
| `clinic_id`               | `uuid`            | yes      | References `clinics(id)`   |
| `patient_id`              | `uuid`            | yes      | References `patients(id)`  |
| `service_id`              | `uuid`            | yes      | References `services(id)`  |
| `preferred_provider_id`   | `uuid`            | no       | References `providers(id)` |
| `status`                  | `waitlist_status` | yes      | Default `active`           |
| `joined_at`               | `timestamptz`     | yes      | Fairness/FIFO              |
| `hard_deadline_at`        | `timestamptz`     | no       | Drop/prune after this      |
| `snoozed_until`           | `timestamptz`     | no       | Temporary pause            |
| `priority_score_override` | `int`             | no       | Manual/business boost      |
| `notes`                   | `text`            | no       | Receptionist-visible notes |
| `created_at`              | `timestamptz`     | yes      | Default `now()`            |
| `updated_at`              | `timestamptz`     | yes      | Maintain with trigger      |

Recommended constraints:

- Partial unique `(patient_id, service_id)` where `status in ('active', 'paused', 'snoozed')`.

## Outreach And Algorithm Tables

### `slot_waves`

One dispatch wave for one slot.

| Field                     | Type          | Required | Notes                                     |
| ------------------------- | ------------- | -------- | ----------------------------------------- |
| `id`                      | `uuid`        | yes      | Primary key                               |
| `clinic_id`               | `uuid`        | yes      | References `clinics(id)`                  |
| `slot_id`                 | `uuid`        | yes      | References `slots(id)`                    |
| `wave_number`             | `int`         | yes      | Starts at `1` per slot                    |
| `wave_size`               | `int`         | yes      | Number of offers/calls                    |
| `p_estimate`              | `numeric`     | yes      | Pickup x accept estimate                  |
| `target_fill_probability` | `numeric`     | yes      | From fill mode                            |
| `k_needed`                | `int`         | yes      | Algorithm output                          |
| `waves_possible`          | `int`         | yes      | Algorithm output                          |
| `timeout_at`              | `timestamptz` | yes      | When to close/retry                       |
| `status`                  | `text`        | yes      | `active`, `closed`, `booked`, `cancelled` |
| `created_at`              | `timestamptz` | yes      | Default `now()`                           |

Recommended constraints:

- Unique `(slot_id, wave_number)`.

### `slot_offers`

An offer to one patient for one slot. This handles both waitlist offers and upgrade offers.

| Field                | Type           | Required | Notes                                                      |
| -------------------- | -------------- | -------- | ---------------------------------------------------------- |
| `id`                 | `uuid`         | yes      | Primary key                                                |
| `clinic_id`          | `uuid`         | yes      | References `clinics(id)`                                   |
| `slot_id`            | `uuid`         | yes      | References `slots(id)`                                     |
| `wave_id`            | `uuid`         | no       | References `slot_waves(id)`; null for manual/special offer |
| `patient_id`         | `uuid`         | yes      | References `patients(id)`                                  |
| `waitlist_entry_id`  | `uuid`         | no       | References `waitlist_entries(id)`                          |
| `current_booking_id` | `uuid`         | no       | Required for `offer_type = 'upgrade'`                      |
| `offer_type`         | `offer_type`   | yes      | `waitlist` or `upgrade`                                    |
| `status`             | `offer_status` | yes      | Current offer state                                        |
| `rank`               | `int`          | yes      | Candidate rank at offer time                               |
| `score`              | `numeric`      | yes      | Unified score at offer time                                |
| `score_breakdown`    | `jsonb`        | yes      | Preference/wait/accept/priority/cooldown                   |
| `reason`             | `text`         | yes      | Explainability copy                                        |
| `expires_at`         | `timestamptz`  | no       | Offer timeout                                              |
| `accepted_at`        | `timestamptz`  | no       | Set when patient says yes                                  |
| `created_at`         | `timestamptz`  | yes      | Default `now()`                                            |
| `updated_at`         | `timestamptz`  | yes      | Maintain with trigger                                      |

### `call_attempts`

One outbound phone call attempt. Fonio integration writes here or through API that writes here.

| Field               | Type           | Required | Notes                                        |
| ------------------- | -------------- | -------- | -------------------------------------------- |
| `id`                | `uuid`         | yes      | Primary key                                  |
| `clinic_id`         | `uuid`         | yes      | References `clinics(id)`                     |
| `slot_offer_id`     | `uuid`         | yes      | References `slot_offers(id)`                 |
| `provider`          | `text`         | yes      | Example: `fonio`                             |
| `provider_call_id`  | `text`         | no       | Provider call/session id                     |
| `provider_event_id` | `text`         | no       | Webhook dedupe id                            |
| `outcome`           | `call_outcome` | yes      | Latest normalized outcome                    |
| `started_at`        | `timestamptz`  | no       | Call start                                   |
| `ended_at`          | `timestamptz`  | no       | Call end                                     |
| `transcript_url`    | `text`         | no       | Optional                                     |
| `raw_payload`       | `jsonb`        | no       | Debug only; avoid sensitive data if possible |
| `created_at`        | `timestamptz`  | yes      | Default `now()`                              |
| `updated_at`        | `timestamptz`  | yes      | Maintain with trigger                        |

Recommended constraints:

- Unique `(clinic_id, provider_event_id)` where provider event id is not null.
- Unique `(clinic_id, provider_call_id)` where provider call id is not null.

### `booking_attempts`

Audit log for every booking race, including conflicts.

| Field                | Type             | Required | Notes                                            |
| -------------------- | ---------------- | -------- | ------------------------------------------------ |
| `id`                 | `uuid`           | yes      | Primary key                                      |
| `clinic_id`          | `uuid`           | yes      | References `clinics(id)`                         |
| `slot_id`            | `uuid`           | yes      | References `slots(id)`                           |
| `patient_id`         | `uuid`           | yes      | References `patients(id)`                        |
| `slot_offer_id`      | `uuid`           | no       | References `slot_offers(id)`                     |
| `source`             | `booking_source` | yes      | `call_webhook`, `manual`, `upgrade`              |
| `result_code`        | `text`           | yes      | `BOOKED`, `BOOKING_CONFLICT`, `STALE_WAVE`, etc. |
| `won_booking_id`     | `uuid`           | no       | References `bookings(id)`                        |
| `lost_to_booking_id` | `uuid`           | no       | References `bookings(id)`                        |
| `message`            | `text`           | no       | Human-readable result                            |
| `created_at`         | `timestamptz`    | yes      | Default `now()`                                  |

## Priority And Upgrade Tables

### `priority_rules`

Owner/company priority rules configured once, not per slot.

| Field          | Type          | Required | Notes                                                           |
| -------------- | ------------- | -------- | --------------------------------------------------------------- |
| `id`           | `uuid`        | yes      | Primary key                                                     |
| `clinic_id`    | `uuid`        | yes      | References `clinics(id)`                                        |
| `patient_id`   | `uuid`        | no       | References `patients(id)`; null means rule is group/filter only |
| `service_id`   | `uuid`        | no       | Applies only to this service when set                           |
| `provider_id`  | `uuid`        | no       | Applies only to this provider when set                          |
| `label`        | `text`        | yes      | Example: `VIP`, `Dr. Weber priority list`                       |
| `boost_points` | `int`         | yes      | Added to candidate score                                        |
| `active`       | `boolean`     | yes      | Default `true`                                                  |
| `starts_at`    | `timestamptz` | no       | Optional scheduling window                                      |
| `ends_at`      | `timestamptz` | no       | Optional scheduling window                                      |
| `created_at`   | `timestamptz` | yes      | Default `now()`                                                 |
| `updated_at`   | `timestamptz` | yes      | Maintain with trigger                                           |

### `priority_bumps`

Durable priority promises. Used for runner-ups and manual/VIP boosts.

| Field                       | Type              | Required | Notes                             |
| --------------------------- | ----------------- | -------- | --------------------------------- |
| `id`                        | `uuid`            | yes      | Primary key                       |
| `clinic_id`                 | `uuid`            | yes      | References `clinics(id)`          |
| `patient_id`                | `uuid`            | yes      | References `patients(id)`         |
| `service_id`                | `uuid`            | no       | Null means general priority       |
| `provider_id`               | `uuid`            | no       | Null means any provider           |
| `reason`                    | `priority_reason` | yes      | `runner_up`, `vip`, etc.          |
| `source_slot_id`            | `uuid`            | no       | Slot that created the promise     |
| `source_booking_attempt_id` | `uuid`            | no       | Conflict that created the promise |
| `boost_points`              | `int`             | yes      | Algorithm adds this               |
| `active`                    | `boolean`         | yes      | Default `true`                    |
| `expires_at`                | `timestamptz`     | no       | Optional                          |
| `created_at`                | `timestamptz`     | yes      | Default `now()`                   |
| `consumed_at`               | `timestamptz`     | no       | Set when used                     |

### `upgrade_offers`

Optional table if we want explicit tracking for earlier-slot upgrades. You can also represent
these in `slot_offers` with `offer_type = 'upgrade'`. Keep this only if the UI needs a dedicated
upgrade audit trail.

| Field                | Type           | Required | Notes                                   |
| -------------------- | -------------- | -------- | --------------------------------------- |
| `id`                 | `uuid`         | yes      | Primary key                             |
| `clinic_id`          | `uuid`         | yes      | References `clinics(id)`                |
| `patient_id`         | `uuid`         | yes      | References `patients(id)`               |
| `current_booking_id` | `uuid`         | yes      | Booking patient already holds           |
| `target_slot_id`     | `uuid`         | yes      | Earlier/better slot being offered       |
| `status`             | `offer_status` | yes      | `queued`, `accepted`, `declined`, etc.  |
| `reason`             | `text`         | yes      | Example: `Earlier matching slot opened` |
| `expires_at`         | `timestamptz`  | no       | Offer timeout                           |
| `accepted_at`        | `timestamptz`  | no       | Set on accept                           |
| `created_at`         | `timestamptz`  | yes      | Default `now()`                         |
| `updated_at`         | `timestamptz`  | yes      | Maintain with trigger                   |

## Integration Tables

### `integration_events`

Dedupe and audit table for calendar/Fonio webhooks.

| Field                | Type                       | Required | Notes                     |
| -------------------- | -------------------------- | -------- | ------------------------- |
| `id`                 | `uuid`                     | yes      | Primary key               |
| `clinic_id`          | `uuid`                     | yes      | References `clinics(id)`  |
| `provider`           | `text`                     | yes      | `calendar`, `fonio`, etc. |
| `provider_event_id`  | `text`                     | yes      | Idempotency key           |
| `event_type`         | `text`                     | yes      | Provider-specific type    |
| `status`             | `integration_event_status` | yes      | Default `received`        |
| `related_slot_id`    | `uuid`                     | no       | References `slots(id)`    |
| `related_patient_id` | `uuid`                     | no       | References `patients(id)` |
| `payload`            | `jsonb`                    | yes      | Raw/normalized payload    |
| `error_message`      | `text`                     | no       | For failed processing     |
| `received_at`        | `timestamptz`              | yes      | Default `now()`           |
| `processed_at`       | `timestamptz`              | no       | Set after success/failure |

Recommended constraints:

- Unique `(clinic_id, provider, provider_event_id)`.

### `slot_timeline_events`

Human-readable event stream for the receptionist detail panel.

| Field        | Type          | Required | Notes                                                       |
| ------------ | ------------- | -------- | ----------------------------------------------------------- |
| `id`         | `uuid`        | yes      | Primary key                                                 |
| `clinic_id`  | `uuid`        | yes      | References `clinics(id)`                                    |
| `slot_id`    | `uuid`        | yes      | References `slots(id)`                                      |
| `kind`       | `text`        | yes      | `slot_opened`, `ranking`, `wave_dispatched`, `booked`, etc. |
| `message`    | `text`        | yes      | Dashboard copy                                              |
| `metadata`   | `jsonb`       | no       | Extra debug/context                                         |
| `created_at` | `timestamptz` | yes      | Default `now()`                                             |

## Critical Transactions / RPCs

These operations should be database transactions or Supabase RPC functions. Do not implement them
as loose client-side multi-step updates.

### `attempt_booking(slot_id, patient_id, source, wave_id, slot_offer_id)`

Rules:

1. Lock the slot row.
2. If slot is already booked, create `booking_attempts` conflict and `priority_bumps` if needed.
3. If source is `call_webhook`, verify `wave_id = slots.active_wave_id`.
4. Insert `bookings(status='ACTIVE')`.
5. Update `slots.status = 'BOOKED'`, `booked_booking_id`, `active_wave_id = null`.
6. Mark winning offer `accepted/booked`.
7. Mark losing accepted offers `lost_conflict` and create runner-up priority.

### `accept_upgrade(patient_id, current_booking_id, target_slot_id)`

Rules:

1. Lock current booking, current slot, and target slot.
2. Confirm current booking is still `ACTIVE` for this patient.
3. Confirm target slot is not booked.
4. Create new active booking on target slot with `source='upgrade'`.
5. Mark old booking `REPLACED_BY_UPGRADE`.
6. Reopen old slot with `created_from='upgrade_release'`.
7. Do not offer old slot to waitlist until the upgrade transaction commits.

### `dispatch_wave(slot_id)`

Rules:

1. Lock slot.
2. Abort if `new_waves_paused`, `BOOKED`, `EXPIRED`, or `ESCALATED`.
3. Rank eligible candidates and/or upgrade candidates.
4. Create `slot_waves`.
5. Create `slot_offers` for selected patients.
6. Update slot to `OFFERING` and set `active_wave_id`.

## Minimum Hackathon Schema

If time is tight, implement only these first:

1. `patients`
2. `patient_preferences`
3. `slots`
4. `bookings`
5. `waitlist_entries`
6. `slot_waves`
7. `slot_offers`
8. `call_attempts`
9. `booking_attempts`
10. `priority_bumps`
11. `priority_rules`
12. `integration_events`

Everything else can be added later.
