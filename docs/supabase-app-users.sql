-- app_users + create_app_user — salin ke SQL Editor project owkvioooumcipiyldnmx
-- Membuat file baru; tidak mengganti/mengubah apapun yang sudah ada.

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
begin
  -- email_confirmed_at diisi: skip konfirmasi email. Kolom nullable yang lebih baru
  -- (confirmation_token, dll) sengaja tidak diisi.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    extensions.uuid_nil(),
    gen_random_uuid(),
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

  insert into public.app_users (email, password) values (p_email, p_password);
end;
$$;

revoke execute on function public.create_app_user(text, text) from anon;
grant execute on function public.create_app_user(text, text) to authenticated;
