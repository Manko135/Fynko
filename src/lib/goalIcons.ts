import {
  Briefcase,
  Car,
  GraduationCap,
  Heart,
  Home,
  PiggyBank,
  Plane,
  Smartphone,
  Star,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

/** Curated, manually-chosen icons for goals (never auto-picked by name). */
export const GOAL_ICONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'target', label: 'Meta geral', Icon: Target },
  { key: 'wallet', label: 'Dinheiro', Icon: Wallet },
  { key: 'investments', label: 'Investimentos', Icon: TrendingUp },
  { key: 'home', label: 'Casa', Icon: Home },
  { key: 'car', label: 'Carro', Icon: Car },
  { key: 'travel', label: 'Viagem', Icon: Plane },
  { key: 'health', label: 'Saúde', Icon: Heart },
  { key: 'studies', label: 'Estudos', Icon: GraduationCap },
  { key: 'business', label: 'Empresa', Icon: Briefcase },
  { key: 'reserve', label: 'Reserva', Icon: PiggyBank },
  { key: 'tech', label: 'Eletrônicos', Icon: Smartphone },
  { key: 'star', label: 'Objetivo', Icon: Star },
]

export const DEFAULT_GOAL_ICON = 'target'

/** Resolve an icon key to a component (falls back to the default Target). */
export function goalIcon(key: string | null | undefined): LucideIcon {
  return GOAL_ICONS.find((i) => i.key === key)?.Icon ?? Target
}
