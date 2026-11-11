-- DDL upload tables — salin ke SQL Editor project owkvioooumcipiyldnmx
-- Sumber: skema project xuyzgdiwevfudttuxhrj (migration create_upload_tables + add_delete_policies_reupload)

create table if not exists public.packing_reports (
  id uuid primary key default gen_random_uuid(),
  wave_number bigint,
  line_number bigint,
  internal_shipment_line_number bigint,
  internal_shipment_number bigint,
  shipment_id text,
  type_tr text,
  status1 text,
  trailing_sts text,
  leading_sts text,
  to_site_id text,
  to_site_name text,
  item text,
  description text,
  lottable_2 text,
  total_qty numeric,
  uom text,
  weight numeric,
  comment text,
  from_site_id text,
  from_site_name text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create table if not exists public.scale_transactions (
  id uuid primary key default gen_random_uuid(),
  internal_id bigint,
  reference_id text,
  activity_date_time timestamptz,
  work_group text,
  transaction_type text,
  location text,
  item text,
  company text,
  lot text,
  quantity numeric,
  quantity_um text,
  direction text,
  work_type text,
  lp_container_id text,
  internal_key_id text,
  work_unit text,
  user_name text,
  work_team text,
  equipment_type text,
  warehouse text,
  history_quality_reason text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

alter table public.packing_reports enable row level security;
alter table public.scale_transactions enable row level security;

create policy "packing read" on public.packing_reports for select to authenticated using (true);
create policy "packing insert" on public.packing_reports for insert to authenticated with check (true);
create policy "packing delete" on public.packing_reports for delete to authenticated using (true);

create policy "scale read" on public.scale_transactions for select to authenticated using (true);
create policy "scale insert" on public.scale_transactions for insert to authenticated with check (true);
create policy "scale delete" on public.scale_transactions for delete to authenticated using (true);
