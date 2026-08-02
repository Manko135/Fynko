import { centsToReais } from '@/lib/money'
import type { ReportRow } from '@/hooks/useReportData'

const HEADERS = ['Tipo', 'Data', 'Descrição', 'Categoria', 'Origem', 'Status', 'Valor']

function toMatrix(rows: ReportRow[]): (string | number)[][] {
  return rows.map((r) => [
    r.kind,
    r.date,
    r.description,
    r.category,
    r.origin,
    r.status,
    centsToReais(r.amountCents),
  ])
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportCSV(rows: ReportRow[], name: string) {
  const escape = (v: string | number) => {
    const s = String(v)
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [HEADERS, ...toMatrix(rows)].map((row) => row.map(escape).join(';'))
  // BOM so Excel opens UTF-8 correctly.
  download(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }), `${name}.csv`)
}

export async function exportExcel(rows: ReportRow[], name: string) {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...toMatrix(rows)])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório')
  XLSX.writeFile(wb, `${name}.xlsx`)
}

const brl = (cents: number) => centsToReais(cents).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Fynko palette (RGB) for the PDF.
const GREEN: [number, number, number] = [10, 122, 77]
const RED: [number, number, number] = [187, 48, 24]
const GOLD: [number, number, number] = [181, 130, 12]
const INK: [number, number, number] = [22, 48, 42]
const MUTED: [number, number, number] = [110, 120, 116]

export type PdfReport = {
  rows: ReportRow[]
  fileName: string
  periodLabel: string
  userName: string
  indicators: { label: string; value: string; tone?: 'pos' | 'neg' | 'neutral' }[]
  categories: { name: string; despesa: number; color: string }[]
}

export async function exportPDF(report: PdfReport) {
  const { default: jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF()
  const W = doc.internal.pageSize.getWidth()

  // ── Branded header band ───────────────────────────────────────────────
  doc.setFillColor(11, 31, 26)
  doc.rect(0, 0, W, 30, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...GOLD)
  doc.text('Fynko', 14, 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(200, 210, 205)
  doc.text('Controle Financeiro Pessoal', 14, 22)
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text('Relatório Financeiro', W - 14, 15, { align: 'right' })
  doc.setFontSize(9)
  doc.setTextColor(200, 210, 205)
  doc.text(report.periodLabel, W - 14, 22, { align: 'right' })

  // ── Meta line ─────────────────────────────────────────────────────────
  doc.setTextColor(...MUTED)
  doc.setFontSize(9)
  const gen = new Date().toLocaleString('pt-BR')
  doc.text(`${report.userName}`, 14, 40)
  doc.text(`Gerado em ${gen}`, W - 14, 40, { align: 'right' })

  // ── Summary boxes ─────────────────────────────────────────────────────
  const boxW = (W - 28 - 3 * 4) / 4
  report.indicators.slice(0, 4).forEach((ind, i) => {
    const x = 14 + i * (boxW + 4)
    doc.setFillColor(245, 247, 245)
    doc.roundedRect(x, 46, boxW, 20, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text(ind.label.toUpperCase(), x + 4, 53)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    const c = ind.tone === 'pos' ? GREEN : ind.tone === 'neg' ? RED : INK
    doc.setTextColor(...c)
    doc.text(ind.value, x + 4, 61)
    doc.setFont('helvetica', 'normal')
  })

  // ── Category bar chart ────────────────────────────────────────────────
  let y = 76
  const cats = report.categories.filter((c) => c.despesa > 0).slice(0, 6)
  if (cats.length) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INK)
    doc.text('Gastos por categoria', 14, y)
    doc.setFont('helvetica', 'normal')
    y += 6
    const max = Math.max(...cats.map((c) => c.despesa))
    const barMaxW = W - 28 - 55
    for (const c of cats) {
      const hex = c.color.replace('#', '')
      const rgb: [number, number, number] = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
      doc.setFontSize(8)
      doc.setTextColor(...INK)
      doc.text(c.name.slice(0, 22), 14, y + 3.5)
      doc.setFillColor(...rgb)
      doc.roundedRect(70, y, Math.max(2, (c.despesa / max) * barMaxW), 5, 1, 1, 'F')
      doc.setTextColor(...MUTED)
      doc.text(brl(c.despesa), W - 14, y + 3.5, { align: 'right' })
      y += 8
    }
    y += 4
  }

  // ── Transactions table (colored amounts) ──────────────────────────────
  autoTable(doc, {
    head: [HEADERS],
    body: report.rows.map((r) => [r.kind, r.date, r.description, r.category, r.origin, r.status, brl(r.amountCents)]),
    startY: y,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [16, 42, 36], textColor: 255 },
    alternateRowStyles: { fillColor: [247, 249, 247] },
    didParseCell: (d: any) => {
      if (d.section === 'body' && d.column.index === 6) {
        const kind = report.rows[d.row.index]?.kind
        d.cell.styles.textColor = kind === 'Receita' ? GREEN : RED
        d.cell.styles.fontStyle = 'bold'
        d.cell.styles.halign = 'right'
      }
    },
  })

  // ── Footer with pagination ────────────────────────────────────────────
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    const H = doc.internal.pageSize.getHeight()
    doc.setDrawColor(220)
    doc.line(14, H - 12, W - 14, H - 12)
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text('Fynko · Controle Financeiro Pessoal', 14, H - 7)
    doc.text(`Página ${p} de ${pages}`, W - 14, H - 7, { align: 'right' })
  }

  doc.save(`${report.fileName}.pdf`)
}
