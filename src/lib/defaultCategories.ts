import type { CategoryKind } from '@/types/domain'

export type DefaultCategory = { name: string; color: string }

/** Seeded once per user on first load (spec: categorias padrão). */
export const DEFAULT_CATEGORIES: Record<CategoryKind, DefaultCategory[]> = {
  income: [
    { name: 'Salário', color: '#3DD68C' },
    { name: 'Comissão', color: '#2DD4BF' },
    { name: 'Freelance', color: '#4F7CFF' },
    { name: 'Investimentos', color: '#A78BFA' },
    { name: 'Bonificação', color: '#FB7185' },
    { name: 'Reembolso', color: '#67E8DA' },
    { name: 'Vendas', color: '#FFC94D' },
    { name: 'Outros', color: '#94A3B8' },
  ],
  expense: [
    { name: 'Alimentação', color: '#FF7A30' },
    { name: 'Mercado', color: '#3DD68C' },
    { name: 'Moradia', color: '#4F7CFF' },
    { name: 'Água', color: '#2DD4BF' },
    { name: 'Energia', color: '#FFC94D' },
    { name: 'Internet', color: '#A78BFA' },
    { name: 'Telefone', color: '#7DA6FF' },
    { name: 'Transporte', color: '#FB7185' },
    { name: 'Combustível', color: '#C2540E' },
    { name: 'Educação', color: '#2D49B3' },
    { name: 'Saúde', color: '#FF6B5B' },
    { name: 'Lazer', color: '#6D28D9' },
    { name: 'Cartão de Crédito', color: '#BE123C' },
    { name: 'Empréstimos', color: '#A0724F' },
    { name: 'Assinaturas', color: '#0F766E' },
    { name: 'Impostos', color: '#475569' },
    { name: 'Pets', color: '#A0724F' },
    { name: 'Vestuário', color: '#FB7185' },
    { name: 'Presentes', color: '#C4B5FD' },
    { name: 'Outros', color: '#94A3B8' },
  ],
}
