-- app_users + create_app_user — salin ke SQL Editor project owkvioooumcipiyldnmx
-- Membuat file baru; tidak mengganti/mengubah apapun yang sudah ada.
-- Sudah dijalankan di project (2026-11-15): termasuk fix auth.identities.

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password text not null, -- plaintext per product requirement
  created_at timestamptz not null default now()
);

alter table public.app_users enable row level security;

create policy "app_users read" on public.app_users for select to authenticated using (true);
-- tanpa policy insert/update/delete: client hanya bisa membaca.

-- security definer: insert ke auth.users tidak mungkin dari client.
create or replace function public.create_app_user(p_email text, p_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  v_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    extensions.uuid_nil(),
    v_id,
    'authenticated',
    'authenticated',
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

  -- login GoTrue join auth.identities; tanpa baris ini error "Database error querying schema"
  -- kolom email di identities generated dari identity_data, jangan diisi eksplisit
  insert into auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    v_id, v_id,
    jsonb_build_object('sub', v_id, 'email', p_email, 'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  );

  insert into public.app_users (email, password) values (p_email, p_password);
end;
$$;

revoke execute on function public.create_app_user(text, text) from anon;
grant execute on function public.create_app_user(text, text) to authenticated;

-- backfill: user yang dibuat function lama (identities kosong)
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id, u.id,
  jsonb_build_object('sub', u.id, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  'email', now(), now(), now()
from auth.users u
where not exists (select 1 from auth.identities i where i.user_id = u.id);
