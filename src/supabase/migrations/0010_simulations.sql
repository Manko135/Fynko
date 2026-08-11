-- Simulações financeiras ("e se eu gastar R$ X no dia Y?"). São apenas
-- previsões — NÃO viram despesa real até o usuário escolher converter. Os itens
-- do gasto ficam em JSONB (lista simples de {description, amount_cents,
-- category_id, icon, notes}). converted_at marca quando/se virou lançamento real.
-- Reaproveita public.set_updated_at() (criada na 0001).

create table if not exists public.simulations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  icon          text,
  target_date   date not null,
  items         jsonb not null default '[]'::jsonb,
  notes         text,
  converted_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists simulations_user_id_idx on public.simulations(user_id);
create trigger simulations_updated_at before update on public.simulations
  for each row execute function public.set_updated_at();

alter table public.simulations enable row level security;
create policy "simulations_own" on public.simulations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
