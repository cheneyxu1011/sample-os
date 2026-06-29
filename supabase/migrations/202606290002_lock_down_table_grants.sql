revoke all privileges on
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
from anon, authenticated;

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
  public.sample_location_events
to authenticated;

grant select on public.audit_events to authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon;
