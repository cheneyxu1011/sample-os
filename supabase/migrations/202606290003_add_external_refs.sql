alter table public.styles add column if not exists external_ref text;
alter table public.samples add column if not exists external_ref text;
alter table public.reviews add column if not exists external_ref text;
alter table public.issues add column if not exists external_ref text;

create unique index if not exists styles_org_external_ref_key
  on public.styles(org_id, external_ref)
  where external_ref is not null;

create unique index if not exists samples_org_external_ref_key
  on public.samples(org_id, external_ref)
  where external_ref is not null;

create unique index if not exists reviews_org_external_ref_key
  on public.reviews(org_id, external_ref)
  where external_ref is not null;

create unique index if not exists issues_org_external_ref_key
  on public.issues(org_id, external_ref)
  where external_ref is not null;
