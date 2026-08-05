-- Observações opcionais para Metas e Limites de gastos. Ficam ocultas nos
-- cards; só aparecem quando o usuário clica para ver as observações.
alter table public.goals   add column if not exists notes text;
alter table public.budgets add column if not exists notes text;
