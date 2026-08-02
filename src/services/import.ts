import { supabase } from '@/services/supabase'
import type { CategoryKind } from '@/types/domain'

type Raw = Record<string, string>

function stripAccents(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}
function normKey(k: string) {
  return stripAccents(k).trim().toLowerCase()
}

/** Parse a CSV string (delimiter auto-detected as ';' or ','). */
function parseCSV(text: string): Raw[] {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []
  const delim = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const split = (line: string) =>
    line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ''))
  const headers = split(lines[0]).map(normKey)
  return lines.slice(1).map((line) => {
    const cells = split(line)
    const row: Raw = {}
    headers.forEach((h, i) => (row[h] = cells[i] ?? ''))
    return row
  })
}

export async function parseFile(file: File): Promise<Raw[]> {
  if (file.name.toLowerCase().endsWith('.csv')) return parseCSV(await file.text())
  const XLSX = await import('xlsx')
  const wb = XLSX.read(await file.arrayBuffer())
  const ws = wb.Sheets[wb.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json<Raw>(ws, { defval: '', raw: false })
  return json.map((r) => {
    const row: Raw = {}
    for (const k of Object.keys(r)) row[normKey(k)] = String((r as Raw)[k])
    return row
  })
}

function parseValor(s: string): number | null {
  let v = (s ?? '').trim().replace(/r\$|\s/gi, '')
  if (!v) return null
  if (v.includes(',') && v.includes('.')) v = v.replace(/\./g, '').replace(',', '.')
  else if (v.includes(',')) v = v.replace(',', '.')
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

function parseData(s: string): string | null {
  const v = (s ?? '').trim()
  let y: number, mo: number, d: number
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    ;[y, mo, d] = v.split('-').map(Number)
  } else {
    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!m) return null
    d = +m[1]
    mo = +m[2]
    y = +m[3]
  }
  // Reject impossible dates (e.g. 32/13) by round-tripping through Date.
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export type ParsedItem = {
  kind: CategoryKind // income | expense
  description: string
  categoryName: string
  amountCents: number
  date: string
  accountName: string
  paid: boolean
}
export type ImportPreview = {
  valid: ParsedItem[]
  errors: { line: number; message: string }[]
}

export function validateRows(rows: Raw[]): ImportPreview {
  const valid: ParsedItem[] = []
  const errors: { line: number; message: string }[] = []

  rows.forEach((r, idx) => {
    const line = idx + 2 // header is line 1
    const tipo = normKey(r['tipo'] ?? '')
    const kind: CategoryKind | null =
      tipo.startsWith('rec') ? 'income' : tipo.startsWith('desp') ? 'expense' : null
    if (!kind) return errors.push({ line, message: 'Tipo deve ser "receita" ou "despesa".' })

    const description = (r['descricao'] ?? '').trim()
    if (!description) return errors.push({ line, message: 'Descrição vazia.' })

    const amountCents = parseValor(r['valor'] ?? '')
    if (amountCents === null || amountCents <= 0)
      return errors.push({ line, message: `Valor inválido: "${r['valor']}".` })

    const date = parseData(r['data'] ?? '')
    if (!date) return errors.push({ line, message: `Data inválida: "${r['data']}" (use AAAA-MM-DD ou DD/MM/AAAA).` })

    valid.push({
      kind,
      description,
      categoryName: (r['categoria'] ?? '').trim(),
      amountCents,
      date,
      accountName: (r['conta'] ?? '').trim(),
      paid: ['sim', 's', 'true', '1', 'pago'].includes(normKey(r['pago'] ?? '')),
    })
  })

  return { valid, errors }
}

/** Insert the validated items, creating any missing categories by name. */
export async function importItems(items: ParsedItem[]): Promise<number> {
  const { data: userData } = await supabase.auth.getUser()
  const user_id = userData.user!.id

  const { data: cats } = await supabase.from('categories').select('id,name,kind')
  const catKey = new Map((cats ?? []).map((c) => [`${c.kind}:${normKey(c.name)}`, c.id]))
  const { data: accs } = await supabase.from('accounts').select('id,name')
  const accByName = new Map((accs ?? []).map((a) => [normKey(a.name), a.id]))

  async function categoryId(name: string, kind: CategoryKind): Promise<string | null> {
    if (!name) return null
    const key = `${kind}:${normKey(name)}`
    let id = catKey.get(key)
    if (!id) {
      const { data } = await supabase
        .from('categories')
        .insert({ user_id, name, kind, color: '#94A3B8', is_default: false })
        .select('id')
        .single()
      id = data!.id
      catKey.set(key, id)
    }
    return id
  }

  const incomes: Record<string, unknown>[] = []
  const expenses: Record<string, unknown>[] = []
  for (const it of items) {
    const category_id = await categoryId(it.categoryName, it.kind)
    const account_id = accByName.get(normKey(it.accountName)) ?? null
    if (it.kind === 'income') {
      incomes.push({ user_id, description: it.description, category_id, account_id, amount_cents: it.amountCents, date: it.date })
    } else {
      expenses.push({ user_id, description: it.description, category_id, account_id, card_id: null, amount_cents: it.amountCents, due_date: it.date, payment_date: it.paid ? it.date : null, type: 'variavel' })
    }
  }
  if (incomes.length) {
    const { error } = await supabase.from('incomes').insert(incomes)
    if (error) throw error
  }
  if (expenses.length) {
    const { error } = await supabase.from('expenses').insert(expenses)
    if (error) throw error
  }
  return incomes.length + expenses.length
}

export function downloadTemplate() {
  const rows = [
    ['tipo', 'descricao', 'categoria', 'valor', 'data', 'conta', 'pago'],
    ['receita', 'Salário', 'Salário', '5000,00', '2026-08-05', 'Nubank', ''],
    ['despesa', 'Mercado', 'Mercado', '350,90', '10/08/2026', 'Nubank', 'sim'],
  ]
  const csv = '﻿' + rows.map((r) => r.join(';')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'fynko-modelo-importacao.csv'
  a.click()
  URL.revokeObjectURL(url)
}
