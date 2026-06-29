create table if not exists public.sample_settings (
  org_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id, key)
);

alter table public.sample_settings enable row level security;

grant select, insert, update, delete on public.sample_settings to authenticated;

drop policy if exists "members can manage sample settings" on public.sample_settings;
create policy "members can manage sample settings"
on public.sample_settings for all
to authenticated
using (org_id in (select public.current_profile_org_ids()))
with check (org_id in (select public.current_profile_org_ids()));

insert into public.sample_settings (org_id, key, value)
select o.id, 'gateRules', jsonb_build_object(
  'preparationGateOwner', 'user_wangbu',
  'sampleReviewGateOwner', 'user_daqian',
  'finalApprover', 'user_yang',
  'bondingDevelopmentOwner', 'user_zhangbu',
  'xinchangjiangDispatcher', 'user_xiahongxia',
  'normalDispatcher', 'user_dadai'
)
from public.organizations o
on conflict (org_id, key) do nothing;
