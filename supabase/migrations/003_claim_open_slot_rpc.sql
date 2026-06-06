-- claim_open_slot: the atomic lock. The first caller wins; the second gets slot_not_available.
-- Called by /api/fonio/post-call when extraction.slotAccepted === true.
-- Returns jsonb {ok: bool, reason: text, slot_id: uuid?, customer_id: uuid?}.

create or replace function public.claim_open_slot(
  p_slot_id uuid,
  p_customer_id uuid,
  p_offer_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.slots%rowtype;
  v_customer public.customers%rowtype;
begin
  -- Lock the slot row for update — anything else racing will block here.
  select * into v_slot from public.slots where id = p_slot_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'slot_not_found');
  end if;

  if v_slot.status not in ('open','calling','held') then
    return jsonb_build_object('ok', false, 'reason', 'slot_not_available', 'current_status', v_slot.status);
  end if;

  -- Sanity-check the customer's consent before committing.
  select * into v_customer from public.customers where id = p_customer_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'customer_not_found');
  end if;

  if not exists (
    select 1 from public.customer_consents
    where customer_id = p_customer_id
      and call_consent = true
      and withdrawn_at is null
  ) then
    return jsonb_build_object('ok', false, 'reason', 'consent_missing');
  end if;

  update public.slots
  set status = 'filled',
      current_customer_id = p_customer_id,
      lock_version = lock_version + 1
  where id = p_slot_id;

  update public.call_attempts
  set status = 'accepted'
  where offer_id = p_offer_id;

  insert into public.audit_log (
    clinic_id, actor_type, action, object_type, object_id, result, lawful_basis_tag, metadata
  ) values (
    v_slot.clinic_id, 'system', 'booking.confirmed', 'slot',
    p_slot_id::text, 'success', 'contract',
    jsonb_build_object('customer_id', p_customer_id, 'offer_id', p_offer_id)
  );

  return jsonb_build_object('ok', true, 'reason', 'slot_claimed', 'slot_id', p_slot_id, 'customer_id', p_customer_id);
end;
$$;

grant execute on function public.claim_open_slot(uuid, uuid, text) to service_role;
