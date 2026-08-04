-- Recorrência personalizada de assinaturas: intervalo livre em dias.
-- Preenchido só quando frequency = 'personalizada' (ex.: 7, 15, 60, 90, 180…).
-- Mensal/anual mantêm a lógica de mês/ano e deixam esta coluna nula.
alter table public.subscriptions
  add column if not exists interval_days integer;
