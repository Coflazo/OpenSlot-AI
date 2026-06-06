-- RLS policies. Enable on every clinic-scoped table.
-- Service role bypasses RLS (used for the recovery loop + webhooks).

alter table public.clinics enable row level security;
alter table public.clinic_members enable row level security;
alter table public.locations enable row level security;
alter table public.services enable row level security;
alter table public.customers enable row level security;
alter table public.customer_consents enable row level security;
alter table public.customer_eligibility enable row level security;
alter table public.slots enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.open_slot_events enable row level security;
alter table public.call_attempts enable row level security;
alter table public.algorithm_rules enable row level security;
alter table public.google_calendar_connections enable row level security;
alter table public.import_batches enable row level security;
alter table public.audit_log enable row level security;

-- Helper: does the authenticated user belong to this clinic?
create or replace function public.user_has_clinic_access(p_clinic_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.clinic_members
    where clinic_id = p_clinic_id and user_id = auth.uid()
  );
$$;

-- Helper: is the authenticated user a manager-or-owner in this clinic?
create or replace function public.user_is_clinic_manager(p_clinic_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.clinic_members
    where clinic_id = p_clinic_id
      and user_id = auth.uid()
      and role in ('owner','manager')
  );
$$;

-- Clinics: member can read, owner can modify
create policy clinics_select on public.clinics
  for select using (public.user_has_clinic_access(id));
create policy clinics_modify on public.clinics
  for all using (public.user_is_clinic_manager(id)) with check (public.user_is_clinic_manager(id));

-- Clinic members
create policy clinic_members_select on public.clinic_members
  for select using (public.user_has_clinic_access(clinic_id));
create policy clinic_members_modify on public.clinic_members
  for all using (public.user_is_clinic_manager(clinic_id)) with check (public.user_is_clinic_manager(clinic_id));

-- Locations / services
create policy locations_select on public.locations
  for select using (public.user_has_clinic_access(clinic_id));
create policy locations_modify on public.locations
  for all using (public.user_is_clinic_manager(clinic_id)) with check (public.user_is_clinic_manager(clinic_id));

create policy services_select on public.services
  for select using (public.user_has_clinic_access(clinic_id));
create policy services_modify on public.services
  for all using (public.user_is_clinic_manager(clinic_id)) with check (public.user_is_clinic_manager(clinic_id));

-- Customers + consents + eligibility — read for members, modify for managers
create policy customers_select on public.customers
  for select using (public.user_has_clinic_access(clinic_id));
create policy customers_modify on public.customers
  for all using (public.user_is_clinic_manager(clinic_id)) with check (public.user_is_clinic_manager(clinic_id));

create policy customer_consents_select on public.customer_consents
  for select using (exists (
    select 1 from public.customers c
    where c.id = customer_id and public.user_has_clinic_access(c.clinic_id)
  ));
create policy customer_consents_modify on public.customer_consents
  for all using (exists (
    select 1 from public.customers c
    where c.id = customer_id and public.user_is_clinic_manager(c.clinic_id)
  )) with check (exists (
    select 1 from public.customers c
    where c.id = customer_id and public.user_is_clinic_manager(c.clinic_id)
  ));

create policy customer_eligibility_select on public.customer_eligibility
  for select using (exists (
    select 1 from public.customers c
    where c.id = customer_id and public.user_has_clinic_access(c.clinic_id)
  ));
create policy customer_eligibility_modify on public.customer_eligibility
  for all using (exists (
    select 1 from public.customers c
    where c.id = customer_id and public.user_is_clinic_manager(c.clinic_id)
  )) with check (exists (
    select 1 from public.customers c
    where c.id = customer_id and public.user_is_clinic_manager(c.clinic_id)
  ));

-- Slots, waitlist, recovery, calls, rules — same pattern
create policy slots_select on public.slots
  for select using (public.user_has_clinic_access(clinic_id));
create policy slots_modify on public.slots
  for all using (public.user_is_clinic_manager(clinic_id)) with check (public.user_is_clinic_manager(clinic_id));

create policy waitlist_select on public.waitlist_entries
  for select using (public.user_has_clinic_access(clinic_id));
create policy waitlist_modify on public.waitlist_entries
  for all using (public.user_is_clinic_manager(clinic_id)) with check (public.user_is_clinic_manager(clinic_id));

create policy open_slot_events_select on public.open_slot_events
  for select using (public.user_has_clinic_access(clinic_id));
create policy open_slot_events_modify on public.open_slot_events
  for all using (public.user_is_clinic_manager(clinic_id)) with check (public.user_is_clinic_manager(clinic_id));

create policy call_attempts_select on public.call_attempts
  for select using (public.user_has_clinic_access(clinic_id));
create policy call_attempts_modify on public.call_attempts
  for all using (public.user_is_clinic_manager(clinic_id)) with check (public.user_is_clinic_manager(clinic_id));

create policy algorithm_rules_select on public.algorithm_rules
  for select using (public.user_has_clinic_access(clinic_id));
create policy algorithm_rules_modify on public.algorithm_rules
  for all using (public.user_is_clinic_manager(clinic_id)) with check (public.user_is_clinic_manager(clinic_id));

create policy google_calendar_connections_select on public.google_calendar_connections
  for select using (public.user_has_clinic_access(clinic_id));
create policy google_calendar_connections_modify on public.google_calendar_connections
  for all using (public.user_is_clinic_manager(clinic_id)) with check (public.user_is_clinic_manager(clinic_id));

create policy import_batches_select on public.import_batches
  for select using (public.user_has_clinic_access(clinic_id));
create policy import_batches_modify on public.import_batches
  for all using (public.user_is_clinic_manager(clinic_id)) with check (public.user_is_clinic_manager(clinic_id));

-- Audit log: read for members, write only via service role (no policy for INSERT from anon/auth)
create policy audit_log_select on public.audit_log
  for select using (public.user_has_clinic_access(clinic_id));
