-- Item 1 (atualização): título opcional para identificar cada limite de gastos.
-- Ex.: "Mercado", "Gastos com carro", "Contas da casa". Coluna anulável, então
-- os limites já existentes continuam válidos (ficam sem título).
alter table public.budgets
  add column if not exists title text;
