-- ============================================================================
-- Fynko — Migration 0002: tabelas dos módulos novos
-- ----------------------------------------------------------------------------
-- Cria: transfers, subscriptions (+ coluna expenses.subscription_id), budgets,
--       assets, liabilities, attachments. RLS em tudo (cada usuário só vê o
--       que é seu). Dinheiro em CENTAVOS (bigint). Datas em `date`.
--
-- Como aplicar: cole este arquivo inteiro no SQL Editor do Supabase e Run.
-- Seguro rodar depois da 0001. Reaproveita a função public.set_updated_at().
-- ============================================================================

-- ---------------------------------------------------------------------------
-- transfers — transferências entre contas (não altera o patrimônio total)
-- ---------------------------------------------------------------------------
create table public.transfers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  from_account_id uuid references public.accounts(id) on delete set null,
  to_account_id   uuid references public.accounts(id) on delete set null,
  amount_cents    bigint not null check (amount_cents > 0),
  date            date not null default current_date,
  note            text,
  created_at      timestamptz not null default now()
);
create index transfers_user_id_idx on public.transfers(user_id);
create index transfers_date_idx on public.transfers(user_id, date);

-- ---------------------------------------------------------------------------
-- subscriptions — assinaturas. Cada assinatura gera despesas vinculadas
-- (expenses.subscription_id abaixo). São duas visões do mesmo dado.
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  category_id  uuid references public.categories(id) on delete set null,
  account_id   uuid references public.accounts(id) on delete set null,
  card_id      uuid references public.cards(id) on delete set null,
  frequency    text not null default 'mensal'
                 check (frequency in ('mensal','anual','personalizada')),
  next_due     date not null,
  status       text not null default 'ativa'
                 check (status in ('ativa','pausada','cancelada')),
  color        text,
  icon         text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index subscriptions_user_id_idx on public.subscriptions(user_id);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Vínculo assinatura -> despesa gerada
alter table public.expenses
  add column subscription_id uuid references public.subscriptions(id) on delete set null;
create index expenses_subscription_idx on public.expenses(subscription_id);

-- ---------------------------------------------------------------------------
-- budgets — Limite de Gastos (por categoria, geral, ou por cartão). Mensal.
-- ---------------------------------------------------------------------------
create table public.budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  scope        text not null check (scope in ('categoria','geral','cartao')),
  category_id  uuid references public.categories(id) on delete cascade,
  card_id      uuid references public.cards(id) on delete cascade,
  amount_cents bigint not null check (amount_cents >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index budgets_user_id_idx on public.budgets(user_id);
create trigger budgets_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- assets / liabilities — Patrimônio (ativos e passivos). Contas bancárias já
-- vêm do módulo Contas; aqui ficam os demais bens e as dívidas.
-- ---------------------------------------------------------------------------
create table public.assets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  category      text not null default 'outro',
  value_cents   bigint not null default 0,
  acquired_date date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index assets_user_id_idx on public.assets(user_id);
create trigger assets_updated_at before update on public.assets
  for each row execute function public.set_updated_at();

create table public.liabilities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  category    text not null default 'outro',
  value_cents bigint not null default 0,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index liabilities_user_id_idx on public.liabilities(user_id);
create trigger liabilities_updated_at before update on public.liabilities
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- attachments — anexos de receitas/despesas. O arquivo em si fica no Storage;
-- aqui guardamos os metadados. created_at é a base da retenção de 90 dias;
-- `expired` marca quando o arquivo foi removido pela rotina agendada.
-- ---------------------------------------------------------------------------
create table public.attachments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  expense_id   uuid references public.expenses(id) on delete cascade,
  income_id    uuid references public.incomes(id) on delete cascade,
  storage_path text not null,
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint,
  expired      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index attachments_user_id_idx on public.attachments(user_id);
create index attachments_expense_idx on public.attachments(expense_id);
create index attachments_income_idx on public.attachments(income_id);
create index attachments_created_idx on public.attachments(created_at);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.transfers     enable row level security;
alter table public.subscriptions enable row level security;
alter table public.budgets       enable row level security;
alter table public.assets        enable row level security;
alter table public.liabilities   enable row level security;
alter table public.attachments   enable row level security;

create policy "transfers_own" on public.transfers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subscriptions_own" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budgets_own" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "assets_own" on public.assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "liabilities_own" on public.liabilities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "attachments_own" on public.attachments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Fim da migration 0002.
