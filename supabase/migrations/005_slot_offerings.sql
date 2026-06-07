-- 005_slot_offerings.sql
-- A slot can be offered to multiple waitlist entries simultaneously; the first
-- accept wins, the rest are auto-rejected. Used by /api/slots/offer + /api/slots/call.

create table if not exists public.slot_offerings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.slots(id) on delete cascade,
  waitlist_entry_id uuid not null references public.waitlist_entries(id) on delete cascade,
  status text not null default 'offering'
    check (status in ('offering','accepted','rejected','expired')),
  offered_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (slot_id, waitlist_entry_id)
);

create index if not exists slot_offerings_slot_status_idx
  on public.slot_offerings(slot_id, status);
create index if not exists slot_offerings_waitlist_entry_idx
  on public.slot_offerings(waitlist_entry_id);

-- RLS: enable; permissive policy mirrors the pattern in 002_rls_policies.sql
-- (clinic members can read/write their own clinic's offerings via the slot join).
alter table public.slot_offerings enable row level security;

drop policy if exists slot_offerings_read on public.slot_offerings;
create policy slot_offerings_read on public.slot_offerings
  for select using (
    exists (
      select 1
        from public.slots s
        join public.clinic_members m on m.clinic_id = s.clinic_id
       where s.id = slot_offerings.slot_id
         and m.user_id = auth.uid()
    )
  );

drop policy if exists slot_offerings_write on public.slot_offerings;
create policy slot_offerings_write on public.slot_offerings
  for all using (
    exists (
      select 1
        from public.slots s
        join public.clinic_members m on m.clinic_id = s.clinic_id
       where s.id = slot_offerings.slot_id
         and m.user_id = auth.uid()
         and m.role in ('owner','manager','receptionist')
    )
  ) with check (
    exists (
      select 1
        from public.slots s
        join public.clinic_members m on m.clinic_id = s.clinic_id
       where s.id = slot_offerings.slot_id
         and m.user_id = auth.uid()
         and m.role in ('owner','manager','receptionist')
    )
  );
