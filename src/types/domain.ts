/** Domain types mirroring the Supabase schema (migration 0001). */

export type AccountType =
  | 'corrente'
  | 'poupanca'
  | 'carteira'
  | 'investimento'
  | 'dinheiro'
  | 'outro'

export type Account = {
  id: string
  user_id: string
  name: string
  bank: string | null
  type: AccountType
  color: string | null
  initial_balance_cents: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type Card = {
  id: string
  user_id: string
  name: string
  brand: string | null
  limit_cents: number
  closing_day: number
  due_day: number
  color: string | null
  created_at: string
  updated_at: string
}

export type CategoryKind = 'income' | 'expense'

export type Category = {
  id: string
  user_id: string
  name: string
  kind: CategoryKind
  color: string | null
  icon: string | null
  is_default: boolean
  created_at: string
}

export type Income = {
  id: string
  user_id: string
  description: string
  category_id: string | null
  account_id: string | null
  amount_cents: number
  date: string
  notes: string | null
  recurring_income_id: string | null
  created_at: string
  updated_at: string
}

export type RecurringIncome = {
  id: string
  user_id: string
  description: string
  amount_cents: number
  category_id: string | null
  account_id: string | null
  day_of_month: number
  start_date: string
  end_date: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export type ExpenseType = 'fixa' | 'variavel' | 'parcelada'

export type Expense = {
  id: string
  user_id: string
  description: string
  category_id: string | null
  account_id: string | null
  card_id: string | null
  amount_cents: number
  due_date: string
  /** Card purchases: when the purchase was made (due_date holds the invoice due). */
  purchase_date: string | null
  payment_date: string | null
  type: ExpenseType
  installment_group: string | null
  installment_index: number | null
  installment_count: number | null
  subscription_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Goal = {
  id: string
  user_id: string
  name: string
  target_cents: number
  due_date: string | null
  color: string | null
  icon: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Asset = {
  id: string
  user_id: string
  name: string
  category: string
  value_cents: number
  crypto_symbol: string | null
  crypto_amount: number | null
  acquired_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Liability = {
  id: string
  user_id: string
  name: string
  category: string
  value_cents: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type SubscriptionFrequency = 'mensal' | 'anual' | 'personalizada'
export type SubscriptionStatus = 'ativa' | 'pausada' | 'cancelada'

export type Subscription = {
  id: string
  user_id: string
  name: string
  amount_cents: number
  category_id: string | null
  account_id: string | null
  card_id: string | null
  frequency: SubscriptionFrequency
  interval_days: number | null
  next_due: string
  status: SubscriptionStatus
  color: string | null
  icon: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type BudgetScope = 'categoria' | 'geral' | 'cartao'

export type Budget = {
  id: string
  user_id: string
  title: string | null
  scope: BudgetScope
  category_id: string | null
  card_id: string | null
  amount_cents: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type Transfer = {
  id: string
  user_id: string
  from_account_id: string | null
  to_account_id: string | null
  amount_cents: number
  date: string
  note: string | null
  created_at: string
}

export type GoalContribution = {
  id: string
  user_id: string
  goal_id: string
  amount_cents: number // positive = aporte, negative = retirada
  date: string
  note: string | null
  created_at: string
}

export type SimulationItem = {
  description: string
  amount_cents: number
  category_id: string | null
  icon: string | null
  notes: string | null
}

export type Simulation = {
  id: string
  user_id: string
  name: string
  icon: string | null
  target_date: string
  items: SimulationItem[]
  notes: string | null
  converted_at: string | null
  created_at: string
  updated_at: string
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  corrente: 'Conta corrente',
  poupanca: 'Poupança',
  carteira: 'Carteira digital',
  investimento: 'Investimento',
  dinheiro: 'Dinheiro em espécie',
  outro: 'Outro',
}
