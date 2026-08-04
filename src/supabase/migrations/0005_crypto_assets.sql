-- Item 11: ativos de criptomoeda com atualização automática de valor.
--   crypto_symbol: sigla da moeda suportada (ex.: 'BTC').
--   crypto_amount: quantidade que o usuário possui (ex.: 0.5).
-- Quando os dois estão preenchidos, o valor do ativo é recalculado pela cotação
-- ao vivo (o value_cents guardado vira apenas um último-valor de fallback).
-- Moedas cadastradas manualmente ("outra") deixam essas colunas nulas.
alter table public.assets
  add column if not exists crypto_symbol text,
  add column if not exists crypto_amount numeric;
