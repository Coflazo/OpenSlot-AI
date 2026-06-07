-- enforce_consent_before_call: trigger that hard-blocks call attempts when consent is missing/withdrawn.
-- GDPR Article 7(3): withdrawal must be as easy as giving consent. This trigger enforces it at the DB level.

create or replace function public.enforce_consent_before_call()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_consent boolean;
begin
  if new.direction = 'inbound' or new.call_type = 'test_call' then
    return new;
  end if;
  if new.customer_id is null then
    return new;
  end if;

  select exists (
    select 1 from public.customer_consents
    where customer_id = new.customer_id
      and call_consent = true
      and withdrawn_at is null
  ) into v_has_consent;

  if not v_has_consent then
    raise exception 'consent_missing: cannot create outbound call attempt for customer %', new.customer_id
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_consent_before_call on public.call_attempts;
create trigger trg_enforce_consent_before_call
  before insert on public.call_attempts
  for each row execute function public.enforce_consent_before_call();

-- GDPR Article 17 helper: anonymize_audit_for_customer
-- Used by /api/dsar/{customerId}/delete — preserves the audit trail integrity
-- by replacing the customer reference with a redacted_<short_hash> string.

create or replace function public.anonymize_audit_for_customer(p_customer_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_redacted text;
begin
  v_redacted := 'redacted_' || substring(md5(p_customer_id::text) for 8);
  update public.audit_log
  set metadata = jsonb_set(metadata, '{customer_id}', to_jsonb(v_redacted))
  where metadata ? 'customer_id' and metadata->>'customer_id' = p_customer_id::text;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
grant execute on function public.anonymize_audit_for_customer(uuid) to service_role;

-- Token-from-URL signature check for Fonio webhooks (used by API routes).
-- We compare the ?token=... query value to FONIO_WEBHOOK_TOKEN env in the route handler;
-- this function is here as a fallback if you want to also validate at the DB layer.
create or replace function public.fonio_token_valid(p_token text, p_expected text)
returns boolean
language sql
immutable
as $$
  select p_token is not null and p_expected is not null and p_token = p_expected;
$$;
