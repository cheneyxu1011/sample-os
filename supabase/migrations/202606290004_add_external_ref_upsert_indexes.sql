create unique index if not exists styles_org_external_ref_upsert_key
  on public.styles(org_id, external_ref);

create unique index if not exists samples_org_external_ref_upsert_key
  on public.samples(org_id, external_ref);

create unique index if not exists reviews_org_external_ref_upsert_key
  on public.reviews(org_id, external_ref);

create unique index if not exists issues_org_external_ref_upsert_key
  on public.issues(org_id, external_ref);
