-- DDL reasons table — salin ke SQL Editor project owkvioooumcipiyldnmx
-- Gaya DDL/RLS ikuti docs/supabase-upload-tables.sql

create table if not exists public.reasons (
  id uuid primary key default gen_random_uuid(),
  shipment_id text,
  store text,
  tr_full text,
  type_tr text,
  no_item text,
  item_name text,
  qty numeric,
  dk_lk text,
  location text,
  user_name text,
  comment text,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (shipment_id, no_item, location)
);

alter table public.reasons enable row level security;

create policy "reasons read" on public.reasons for select to authenticated using (true);
create policy "reasons insert" on public.reasons for insert to authenticated with check (true);
create policy "reasons update" on public.reasons for update to authenticated using (true) with check (true);
create policy "reasons delete" on public.reasons for delete to authenticated using (true);
