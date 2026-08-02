-- ============================================================================
-- Fynko — Migration 0001: núcleo do schema
-- ----------------------------------------------------------------------------
-- Cria: profiles, accounts, cards, categories, incomes, expenses, goals,
--       goal_contributions. Ativa Row Level Security (RLS) em tudo, para que
--       cada usuário só enxergue os próprios dados.
--
-- Dinheiro é sempre guardado em CENTAVOS inteiros (bigint) — nunca em decimal,
-- para não acumular erro de arredondamento. Datas são do tipo `date`.
--
-- Como aplicar: cole este arquivo inteiro no SQL Editor do Supabase e clique
-- em Run. É seguro rodar em um projeto novo e vazio.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Utilitário: mantém a coluna updated_at sempre atualizada
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — dados do usuário além do e-mail (nome, foto, moeda)
-- Criado automaticamente quando alguém se cadastra (trigger abaixo).
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  currency    text not null default 'BRL',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o profile automaticamente no cadastro, puxando o nome informado.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- accounts — contas bancárias, carteiras, dinheiro em espécie
-- ---------------------------------------------------------------------------
create table public.accounts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  name                  text not null,
  bank                  text,
  type                  text not null default 'corrente'
                          check (type in ('corrente','poupanca','carteira','investimento','dinheiro','outro')),
  color                 text,
  initial_balance_cents bigint not null default 0,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index accounts_user_id_idx on public.accounts(user_id);
create trigger accounts_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- cards — cartões de crédito
-- ---------------------------------------------------------------------------
create table public.cards (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  brand        text,
  limit_cents  bigint not null default 0,
  closing_day  int not null check (closing_day between 1 and 31),
  due_day      int not null check (due_day between 1 and 31),
  color        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index cards_user_id_idx on public.cards(user_id);
create trigger cards_updated_at before update on public.cards
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- categories — categorias de receita e de despesa
-- ---------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  kind        text not null check (kind in ('income','expense')),
  color       text,
  icon        text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, kind, name)
);
create index categories_user_id_idx on public.categories(user_id);

-- ---------------------------------------------------------------------------
-- incomes — receitas
-- ---------------------------------------------------------------------------
create table public.incomes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  description  text not null,
  category_id  uuid references public.categories(id) on delete set null,
  account_id   uuid references public.accounts(id) on delete set null,
  amount_cents bigint not null check (amount_cents >= 0),
  date         date not null,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index incomes_user_id_idx on public.incomes(user_id);
create index incomes_date_idx on public.incomes(user_id, date);
create trigger incomes_updated_at before update on public.incomes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- expenses — despesas (inclui parcelas)
-- payment_date NULO = ainda não paga. Essa data é a base de TODO cálculo
-- financeiro (regra de caixa): o valor impacta o mês do pagamento.
-- ---------------------------------------------------------------------------
create table public.expenses (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  description        text not null,
  category_id        uuid references public.categories(id) on delete set null,
  account_id         uuid references public.accounts(id) on delete set null,
  card_id            uuid references public.cards(id) on delete set null,
  amount_cents       bigint not null check (amount_cents >= 0),
  due_date           date not null,
  payment_date       date,
  type               text not null default 'variavel'
                       check (type in ('fixa','variavel','parcelada')),
  installment_group  uuid,            -- agrupa as parcelas de uma mesma compra
  installment_index  int,             -- 3 em "3/12"
  installment_count  int,             -- 12 em "3/12"
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index expenses_user_id_idx on public.expenses(user_id);
create index expenses_due_date_idx on public.expenses(user_id, due_date);
create index expenses_payment_date_idx on public.expenses(user_id, payment_date);
create index expenses_card_id_idx on public.expenses(card_id);
create index expenses_group_idx on public.expenses(installment_group);
create trigger expenses_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- goals — metas financeiras. O valor acumulado é a SOMA dos aportes abaixo
-- (não é guardado numa coluna, para nunca ficar dessincronizado).
-- ---------------------------------------------------------------------------
create table public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  target_cents bigint not null check (target_cents >= 0),
  due_date     date,
  color        text,
  icon         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index goals_user_id_idx on public.goals(user_id);
create trigger goals_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

create table public.goal_contributions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  goal_id      uuid not null references public.goals(id) on delete cascade,
  amount_cents bigint not null,        -- positivo = aporte, negativo = retirada
  date         date not null default current_date,
  note         text,
  created_at   timestamptz not null default now()
);
create index goal_contributions_goal_idx on public.goal_contributions(goal_id);

-- ============================================================================
-- Row Level Security — cada usuário só acessa as próprias linhas
-- ============================================================================
alter table public.profiles           enable row level security;
alter table public.accounts           enable row level security;
alter table public.cards              enable row level security;
alter table public.categories         enable row level security;
alter table public.incomes            enable row level security;
alter table public.expenses           enable row level security;
alter table public.goals              enable row level security;
alter table public.goal_contributions enable row level security;

-- profiles: a linha é identificada por id (= auth.uid())
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Demais tabelas: dono é user_id. Uma policy "all" cobre select/insert/update/delete.
create policy "accounts_own" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cards_own" on public.cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_own" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "incomes_own" on public.incomes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "expenses_own" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals_own" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goal_contributions_own" on public.goal_contributions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Fim da migration 0001.
