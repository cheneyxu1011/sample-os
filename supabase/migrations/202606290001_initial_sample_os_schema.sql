create extension if not exists pgcrypto with schema extensions;

create table if not exists public.organizations (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  department text,
  role_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (org_id, display_name)
);

create table if not exists public.departments (
  id uuid primary key default extensions.gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  owner_profile_id uuid references public.profiles(id),
  participates_in_review boolean not null default true,
  receives_notification boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists public.styles (
  id uuid primary key default extensions.gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  style_no text not null,
  brand text not null,
  season text,
  style_name text not null,
  category text,
  route text not null,
  current_gate text not null,
  sample_phase text,
  risk_status text not null default 'normal',
  planned_ship_date date,
  gate_owner_id uuid references public.profiles(id),
  final_approver_id uuid references public.profiles(id),
  next_action text,
  blocker_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, style_no)
);

create table if not exists public.samples (
  id uuid primary key default extensions.gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  style_id uuid not null references public.styles(id) on delete cascade,
  sample_phase text not null,
  version_name text not null,
  status text not null,
  location text,
  holder_profile_id uuid references public.profiles(id),
  planned_ship_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  style_id uuid not null references public.styles(id) on delete cascade,
  sample_id uuid not null references public.samples(id) on delete cascade,
  review_no text not null,
  status text not null,
  gate_owner_id uuid references public.profiles(id),
  final_approver_id uuid references public.profiles(id),
  final_decision text not null default 'none',
  exception_reason text,
  exception_risk_note text,
  exception_applicant_id uuid references public.profiles(id),
  exception_approver_id uuid references public.profiles(id),
  exception_approval_status text,
  customer_notified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, review_no)
);

create table if not exists public.review_department_reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  department_id uuid references public.departments(id),
  reviewer_id uuid references public.profiles(id),
  role_name text,
  status text not null default 'pending',
  opinion text,
  focus_tags text[] not null default '{}',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.issues (
  id uuid primary key default extensions.gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  style_id uuid not null references public.styles(id) on delete cascade,
  sample_id uuid references public.samples(id) on delete set null,
  review_id uuid references public.reviews(id) on delete cascade,
  title text not null,
  description text,
  source_department_id uuid references public.departments(id),
  related_area text,
  level text not null,
  shipment_blocking boolean not null default false,
  can_ship_with_note boolean not null default false,
  owner_id uuid references public.profiles(id),
  verifier_id uuid references public.profiles(id),
  due_at timestamptz,
  status text not null default 'not_started',
  evidence_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sample_media (
  id uuid primary key default extensions.gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  style_id uuid not null references public.styles(id) on delete cascade,
  sample_id uuid references public.samples(id) on delete cascade,
  review_id uuid references public.reviews(id) on delete set null,
  issue_id uuid references public.issues(id) on delete set null,
  media_kind text not null check (media_kind in ('photo', 'video', 'document')),
  label text,
  s3_bucket text not null,
  s3_region text not null,
  s3_object_key text not null,
  mime_type text,
  byte_size bigint,
  checksum_sha256 text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (s3_bucket, s3_object_key)
);

create table if not exists public.sample_location_events (
  id uuid primary key default extensions.gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  sample_id uuid not null references public.samples(id) on delete cascade,
  from_location text,
  to_location text not null,
  changed_by uuid references public.profiles(id),
  reason text,
  tracking_no text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_org_id_idx on public.profiles(org_id);
create index if not exists styles_org_id_idx on public.styles(org_id);
create index if not exists samples_style_id_idx on public.samples(style_id);
create index if not exists reviews_sample_id_idx on public.reviews(sample_id);
create index if not exists issues_review_id_idx on public.issues(review_id);
create index if not exists sample_media_sample_id_idx on public.sample_media(sample_id);
create index if not exists sample_location_events_sample_id_idx on public.sample_location_events(sample_id);

create or replace function public.current_profile_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.org_id
  from public.profiles p
  where p.user_id = auth.uid()
$$;

create or replace function public.current_profile_is_admin(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.org_id = target_org_id
      and p.is_admin = true
  )
$$;

revoke execute on function public.current_profile_org_ids() from public;
revoke execute on function public.current_profile_is_admin(uuid) from public;
grant execute on function public.current_profile_org_ids() to authenticated;
grant execute on function public.current_profile_is_admin(uuid) to authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.organizations,
  public.profiles,
  public.departments,
  public.styles,
  public.samples,
  public.reviews,
  public.review_department_reviews,
  public.issues,
  public.sample_media,
  public.sample_location_events,
  public.audit_events
to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.styles enable row level security;
alter table public.samples enable row level security;
alter table public.reviews enable row level security;
alter table public.review_department_reviews enable row level security;
alter table public.issues enable row level security;
alter table public.sample_media enable row level security;
alter table public.sample_location_events enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles can read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "profiles can read org members"
on public.profiles for select
to authenticated
using (org_id in (select public.current_profile_org_ids()));

create policy "profiles can update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()))
with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "admins can manage org profiles"
on public.profiles for all
to authenticated
using (public.current_profile_is_admin(org_id))
with check (public.current_profile_is_admin(org_id));

create policy "members can read their organizations"
on public.organizations for select
to authenticated
using (id in (select public.current_profile_org_ids()));

create policy "members can read departments"
on public.departments for select
to authenticated
using (org_id in (select public.current_profile_org_ids()));

create policy "admins can manage departments"
on public.departments for all
to authenticated
using (public.current_profile_is_admin(org_id))
with check (public.current_profile_is_admin(org_id));

create policy "members can manage styles"
on public.styles for all
to authenticated
using (org_id in (select public.current_profile_org_ids()))
with check (org_id in (select public.current_profile_org_ids()));

create policy "members can manage samples"
on public.samples for all
to authenticated
using (org_id in (select public.current_profile_org_ids()))
with check (org_id in (select public.current_profile_org_ids()));

create policy "members can manage reviews"
on public.reviews for all
to authenticated
using (org_id in (select public.current_profile_org_ids()))
with check (org_id in (select public.current_profile_org_ids()));

create policy "members can manage department reviews"
on public.review_department_reviews for all
to authenticated
using (org_id in (select public.current_profile_org_ids()))
with check (org_id in (select public.current_profile_org_ids()));

create policy "members can manage issues"
on public.issues for all
to authenticated
using (org_id in (select public.current_profile_org_ids()))
with check (org_id in (select public.current_profile_org_ids()));

create policy "members can manage media metadata"
on public.sample_media for all
to authenticated
using (org_id in (select public.current_profile_org_ids()))
with check (org_id in (select public.current_profile_org_ids()));

create policy "members can manage sample location events"
on public.sample_location_events for all
to authenticated
using (org_id in (select public.current_profile_org_ids()))
with check (org_id in (select public.current_profile_org_ids()));

create policy "members can read audit events"
on public.audit_events for select
to authenticated
using (org_id in (select public.current_profile_org_ids()));
