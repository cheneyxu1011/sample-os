alter table public.styles add column if not exists sample_variants jsonb not null default '[]'::jsonb;
alter table public.styles add column if not exists quantity integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'styles_quantity_positive'
      and conrelid = 'public.styles'::regclass
  ) then
    alter table public.styles
      add constraint styles_quantity_positive check (quantity > 0) not valid;
  end if;
end $$;

alter table public.styles validate constraint styles_quantity_positive;
