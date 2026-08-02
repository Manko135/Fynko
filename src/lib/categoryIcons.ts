import {
  Briefcase,
  Car,
  CreditCard,
  DollarSign,
  Dumbbell,
  Film,
  Fuel,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Landmark,
  PawPrint,
  Plane,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  TrendingUp,
  Utensils,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react'

/** Curated icon set for categories (same Lucide library used across the app). */
export const CATEGORY_ICONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'tag', label: 'Geral', Icon: Tag },
  { key: 'cart', label: 'Compras', Icon: ShoppingCart },
  { key: 'bag', label: 'Mercado', Icon: ShoppingBag },
  { key: 'food', label: 'Alimentação', Icon: Utensils },
  { key: 'home', label: 'Casa', Icon: Home },
  { key: 'car', label: 'Transporte', Icon: Car },
  { key: 'fuel', label: 'Combustível', Icon: Fuel },
  { key: 'health', label: 'Saúde', Icon: Heart },
  { key: 'gym', label: 'Academia', Icon: Dumbbell },
  { key: 'studies', label: 'Educação', Icon: GraduationCap },
  { key: 'travel', label: 'Viagem', Icon: Plane },
  { key: 'fun', label: 'Lazer', Icon: Film },
  { key: 'energy', label: 'Energia', Icon: Zap },
  { key: 'internet', label: 'Internet', Icon: Wifi },
  { key: 'phone', label: 'Telefone', Icon: Smartphone },
  { key: 'card', label: 'Cartão', Icon: CreditCard },
  { key: 'taxes', label: 'Impostos', Icon: Receipt },
  { key: 'pets', label: 'Pets', Icon: PawPrint },
  { key: 'gift', label: 'Presentes', Icon: Gift },
  { key: 'work', label: 'Trabalho', Icon: Briefcase },
  { key: 'salary', label: 'Salário', Icon: DollarSign },
  { key: 'invest', label: 'Investimentos', Icon: TrendingUp },
  { key: 'bank', label: 'Banco', Icon: Landmark },
  { key: 'bonus', label: 'Bônus', Icon: Sparkles },
]

export const DEFAULT_CATEGORY_ICON = 'tag'

export function categoryIcon(key: string | null | undefined): LucideIcon {
  return CATEGORY_ICONS.find((i) => i.key === key)?.Icon ?? Tag
}
