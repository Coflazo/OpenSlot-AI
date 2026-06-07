-- OpenSlot AI initial schema
-- Run via: supabase db push (against your hosted project) or psql `cat *.sql`
-- Comments mark GDPR articles where the column is load-bearing.

create extension if not exists "pgcrypto";

-- ============================================================
-- Tenants & access
-- ============================================================

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  timezone text not null default 'Europe/Vienna',
  default_location_id uuid,
  created_at timestamptz not null default now()
);

create table public.clinic_members (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','receptionist','compliance','readonly')),
  academy_progress jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (clinic_id, user_id)
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  address text not null,
  lat double precision,
  lng double precision,
  route_node_id text,
  phone text,
  opening_hours jsonb not null default '{}'::jsonb,
  arrival_buffer_minutes int not null default 15,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  modality text not null,
  body_part text,
  duration_minutes int not null,
  estimated_value_eur numeric(10,2) not null,
  arrival_buffer_minutes int not null default 15,
  requires_safety_form boolean not null default true,
  requires_referral boolean not null default true,
  requires_payment_ready boolean not null default true,
  requires_authorization boolean not null default false,
  requires_contrast_clearance boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Customers — GDPR Article 5 (minimization): no clinical data here
-- ============================================================

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  external_id text,                       -- the spreadsheet's customer_id
  full_name text not null,
  phone text not null,
  email text,
  language text not null default 'en',
  home_postcode text,
  home_lat double precision,
  home_lng double precision,
  route_node_id text,                     -- A* graph anchor
  preferred_call_window text not null default 'any',
  max_travel_minutes int not null default 60,
  last_contacted_at timestamptz,
  pickup_rate numeric(4,3) not null default 0.5,
  business_priority numeric(4,3) not null default 0.5,
  booking_satisfaction text not null default 'neutral'
    check (booking_satisfaction in ('satisfied','neutral','dissatisfied','urgently_wants_earlier')),
  earlier_opportunity_preference text not null default 'any_earlier'
    check (earlier_opportunity_preference in ('none','seven_days_earlier','same_location','any_earlier','same_day')),
  cascade_participation text not null default 'can_move'
    check (cascade_participation in ('can_move','move_once','manual_approval','do_not_move')),
  notes text,
  created_at timestamptz not null default now(),
  unique (clinic_id, external_id)
);

-- GDPR Article 7
create table public.customer_consents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  call_consent boolean not null default false,
  sms_consent boolean not null default false,
  voicemail_consent boolean not null default false,
  recording_consent boolean not null default false,
  consent_source text not null,             -- online_form / phone / paper / import / manual
  consent_timestamp timestamptz not null,
  consent_text text,
  withdrawn_at timestamptz                  -- when set, blocks all outbound (Article 7(3))
);

create table public.customer_eligibility (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  safety_form_complete boolean not null default false,
  referral_received boolean not null default false,
  payment_ready boolean not null default false,
  authorization_approved boolean not null default false,
  contrast_status text not null default 'not_required'
    check (contrast_status in ('not_required','cleared','pending')),
  can_arrive_same_day boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (customer_id, service_id)
);

-- ============================================================
-- Slots & cascade
-- ============================================================

create table public.slots (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  location_id uuid not null references public.locations(id),
  service_id uuid not null references public.services(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null
    check (status in ('booked','open','calling','held','filled','expired','paused','cancelled')),
  original_customer_id uuid references public.customers(id),
  current_customer_id uuid references public.customers(id),
  origin text not null default 'scheduled'
    check (origin in ('scheduled','patient_cancellation','upgrade_cascade','manual_opening')),
  parent_slot_id uuid references public.slots(id),
  cascade_depth int not null default 0,
  google_event_id text,
  lock_version int not null default 0,
  held_until timestamptz,
  created_at timestamptz not null default now()
);

create index slots_clinic_status_start_idx on public.slots(clinic_id, status, start_time);
create index slots_google_event_id_idx on public.slots(google_event_id) where google_event_id is not null;

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_id uuid not null references public.services(id),
  requested_location_id uuid references public.locations(id),
  type text not null check (type in ('upgrade','pure_waitlist')),
  urgency_score numeric(4,3) not null default 0.5,
  preference_match numeric(4,3) not null default 0.5,
  waiting_since timestamptz not null default now(),
  status text not null default 'active' check (status in ('active','contacted','converted','opted_out','archived')),
  created_at timestamptz not null default now()
);

create table public.open_slot_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  slot_id uuid not null references public.slots(id) on delete cascade,
  status text not null check (status in ('detected','ranking','calling','filled','expired','paused','failed')),
  detected_at timestamptz not null default now(),
  filled_at timestamptz,
  recovered_value_eur numeric(10,2),
  notes text
);

-- ============================================================
-- Calls — Fonio-aware
-- ============================================================

create table public.call_attempts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  open_slot_event_id uuid references public.open_slot_events(id) on delete set null,
  slot_id uuid references public.slots(id),
  customer_id uuid references public.customers(id),
  offer_id text not null unique,                  -- idempotency key
  direction text not null default 'outbound' check (direction in ('outbound','inbound')),
  call_type text not null check (call_type in ('upgrade_offer','waitlist_offer','cascade_fill','inbound_triage','test_call')),
  provider_call_id text,                          -- Fonio call id
  status text not null check (status in ('queued','ringing','in_progress','accepted','declined','no_answer','voicemail','failed')),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  transcript text,
  extraction jsonb not null default '{}'::jsonb,  -- the 8 Variable Extraction fields
  recording_url text,
  needs_review boolean not null default false,
  review_reason text,
  created_at timestamptz not null default now()
);

create index call_attempts_clinic_started_idx on public.call_attempts(clinic_id, started_at desc);

-- ============================================================
-- Rules
-- ============================================================

create table public.algorithm_rules (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  eligibility_fit_weight numeric(4,3) not null default 0.30,
  urgency_weight numeric(4,3) not null default 0.20,
  wait_time_weight numeric(4,3) not null default 0.15,
  pickup_probability_weight numeric(4,3) not null default 0.15,
  business_priority_weight numeric(4,3) not null default 0.10,
  preference_match_weight numeric(4,3) not null default 0.10,
  travel_feasibility_weight numeric(4,3) not null default 0.25,
  cooldown_penalty_weight numeric(4,3) not null default 0.20,
  minimum_arrival_buffer_minutes int not null default 15,
  urgent_threshold_minutes int not null default 120,
  max_cascade_depth int not null default 5,
  default_concurrent_calls int not null default 1,
  emergency_concurrent_calls int not null default 10,
  updated_at timestamptz not null default now(),
  unique (clinic_id)
);

-- ============================================================
-- Integrations: Google Calendar
-- ============================================================

create table public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  google_account_email text not null,
  calendar_id text not null,
  access_token_encrypted text not null,         -- GDPR Article 32
  refresh_token_encrypted text not null,
  scope text not null,
  token_expiry timestamptz not null,
  sync_token text,
  watch_channel_id text,
  watch_resource_id text,
  watch_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  unique (clinic_id, calendar_id)
);

-- ============================================================
-- Imports (Excel workbooks)
-- ============================================================

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  uploaded_by uuid references auth.users(id),
  file_name text not null,
  storage_path text,                            -- Supabase Storage path (7-day TTL)
  status text not null check (status in ('uploaded','validated','imported','failed')),
  row_count int not null default 0,
  validation_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Audit — Articles 5(2) and 32; lawful_basis_tag mandatory per Article 6
-- ============================================================

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  actor_type text not null check (actor_type in ('user','system','agent','webhook','dsar')),
  action text not null,
  object_type text not null,
  object_id text not null,
  result text not null check (result in ('success','info','blocked','error')),
  lawful_basis_tag text check (lawful_basis_tag in ('contract','consent','legitimate_interest','vital_interest','legal_obligation','public_task')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_clinic_created_idx on public.audit_log(clinic_id, created_at desc);
