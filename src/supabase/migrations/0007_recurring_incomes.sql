-- Receitas fixas (recorrentes): um modelo que gera automaticamente UMA receita
-- por mês (ex.: salário todo dia 5). As receitas geradas ficam vinculadas ao
-- modelo por incomes.recurring_income_id. Espelha a ideia das assinaturas.
-- Seguro rodar depois da 0006. Reaproveita a função public.set_updated_at().

create table if not exists public.recurring_incomes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  description   text not null,
  amount_cents  bigint not null check (amount_cents >= 0),
  category_id   uuid references public.categories(id) on delete set null,
  account_id    uuid references public.accounts(id) on delete set null,
  day_of_month  int not null check (day_of_month between 1 and 31),
  start_date    date not null,
  end_date      date,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists recurring_incomes_user_id_idx on public.recurring_incomes(user_id);
create trigger recurring_incomes_updated_at before update on public.recurring_incomes
  for each row execute function public.set_updated_at();

-- Vínculo modelo -> receitas geradas (evita duplicar e permite cancelar).
alter table public.incomes
  add column if not exists recurring_income_id uuid
    references public.recurring_incomes(id) on delete set null;
create index if not exists incomes_recurring_idx on public.incomes(recurring_income_id);

alter table public.recurring_incomes enable row level security;
create policy "recurring_incomes_own" on public.recurring_incomes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
