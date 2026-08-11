-- Despesas de cartão: o vencimento (due_date) guarda o vencimento da FATURA, e
-- purchase_date guarda a data em que a compra foi feita. Só despesas de cartão
-- usam purchase_date; fica nulo para as demais. A competência financeira segue
-- usando payment_date (pago) ou due_date (vencimento) — nada muda aí.
alter table public.expenses add column if not exists purchase_date date;
