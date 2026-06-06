# Supabase setup for OpenSlot AI

1. Create a project at https://supabase.com.
2. Copy `.env.example` → `.env.local` and paste:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public key)
   - `SUPABASE_SERVICE_ROLE_KEY` (service role key — server-only, never expose)
   - `TOKEN_ENCRYPTION_KEY` (`openssl rand -hex 32`)
3. Run migrations:
   - SQL editor option: paste each `migrations/00*.sql` file in numerical order and run.
   - CLI option: `supabase link --project-ref <ref>` then `supabase db push`.
4. Create the first clinic + member rows manually for now:

   ```sql
   insert into public.clinics (id, name, legal_name, timezone)
   values (gen_random_uuid(), 'Vienna Private Imaging', 'Vienna Private Imaging GmbH', 'Europe/Vienna')
   returning id;
   -- copy the returned id, then:
   insert into public.clinic_members (clinic_id, user_id, role)
   values ('<paste clinic id>', auth.uid(), 'owner');
   ```

5. Create the Storage bucket for Excel imports: name `imports`, public off, file-size limit 10 MB.

The recovery loop runs as the **service role** (`SUPABASE_SERVICE_ROLE_KEY`), bypassing RLS.
All read paths on behalf of the user use the anon key + cookies via `@supabase/ssr`.
