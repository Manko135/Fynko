import {
  ArrowLeftRight,
  CalendarDays,
  Coins,
  CreditCard,
  Gauge,
  LayoutDashboard,
  PiggyBank,
  Repeat,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  History,
  FileBarChart,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  label: string
  path: string
  icon: LucideIcon
  /** Show in the mobile bottom bar (space is limited to ~4 + "Mais"). */
  primary?: boolean
}

/** Single source of truth for navigation — used by Sidebar and BottomNav. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, primary: true },
  { label: 'Receitas', path: '/receitas', icon: TrendingUp },
  { label: 'Despesas', path: '/despesas', icon: TrendingDown, primary: true },
  { label: 'Cartões', path: '/cartoes', icon: CreditCard },
  { label: 'Contas', path: '/contas', icon: Wallet, primary: true },
  { label: 'Metas', path: '/metas', icon: Target },
  { label: 'Assinaturas', path: '/assinaturas', icon: Repeat },
  { label: 'Limite de Gastos', path: '/limites', icon: Gauge },
  { label: 'Calendário', path: '/calendario', icon: CalendarDays },
  { label: 'Patrimônio', path: '/patrimonio', icon: PiggyBank },
  { label: 'Linha do Tempo', path: '/linha-do-tempo', icon: History },
  { label: 'Relatórios', path: '/relatorios', icon: FileBarChart },
  { label: 'Criptomoedas', path: '/criptomoedas', icon: Coins },
]

/** Extra icon exported for the "Transferências" quick action later. */
export { ArrowLeftRight }
