import { supabase } from './supabase.js'
import { fmtAging } from './aging.js'
import { taskFilterState } from './taskFilterState.js'
import * as XLSX from 'xlsx'

// urutan kolom: list (STORE/TR/QTY/AGING) + detail (NO ITEM/ITEM NAME/LOCATION/QTY) + field sisa
const HEADERS = ['STORE', 'TR', 'QTY', 'AGING', 'NO ITEM', 'ITEM NAME', 'LOCATION', 'QTY', 'TYPE TR', 'DK/LK', 'TYPE KIRIM', 'USER', 'COMMENT']

// query + group per TR sama dengan Task.svelte; detail per item + location sama dengan TaskDetail.svelte
export async function buildTaskExport() {
  const pack = await supabase
    .from('packing_reports')
    .select(
      'shipment_id, to_site_name, total_qty, status1, wave_number, comment, type_tr, lottable_2, to_site_id, item, description'
    )
    .order('created_at', { ascending: false })
  if (pack.error) throw new Error(pack.error.message)

  // lookup dibatasi TR di list saja: select tanpa filter kena cap 1000 baris PostgREST
  const keys = [...new Set((pack.data ?? []).map((r) => r.shipment_id).filter(Boolean))]
  const [look, locs, sites] = await Promise.all([
    keys.length
      ? supabase.from('task_lookup').select('reference_id, user_name, date_pick').in('reference_id', keys)
      : { data: [], error: null },
    keys.length
      ? supabase
          .from('scale_transactions')
          .select('reference_id, item, transaction_type, location')
          .in('reference_id', keys)
          .in('transaction_type', ['Pick confirmation', 'Pick & Put confirmation'])
      : { data: [], error: null },
    supabase.from('mtrx-store').select('"Code Site", "DK/LK", "Type Kirim"')
  ])
  if (look.error) throw new Error(look.error.message)
  if (locs.error) throw new Error(locs.error.message)
  if (sites.error) throw new Error(sites.error.message)

  const lookByTr = new Map()
  for (const l of look.data ?? []) lookByTr.set(l.reference_id, l)

  // group per TR: Qty = SUM total_qty, field lain = baris pertama per TR; detail per item dijumlah
  const byTr = new Map()
  for (const r of pack.data ?? []) {
    const key = r.shipment_id ?? ''
    let g = byTr.get(key)
    if (g) {
      g.qty += Number(r.total_qty) || 0
    } else {
      g = {
        shipment_id: r.shipment_id,
        store: r.to_site_name,
        qty: Number(r.total_qty) || 0,
        comment: r.comment,
        type_tr: r.type_tr,
        to_site_id: r.to_site_id,
        details: new Map()
      }
      byTr.set(key, g)
    }
    const ik = r.item ?? ''
    const d = g.details.get(ik)
    if (d) d.qty += Number(r.total_qty) || 0
    else g.details.set(ik, { item: r.item, description: r.description, qty: Number(r.total_qty) || 0 })
  }
  for (const [key, g] of byTr) {
    const l = lookByTr.get(key)
    if (l) {
      g.user_name = l.user_name
      g.date_pick = l.date_pick
    }
  }

  // locations per (TR, item) dari scale_transactions; hygiene + prioritas Pick sama dengan TaskDetail.svelte
  // Pick confirmation menang penuh; semua location Pick kosong/blank → pakai Pick & Put confirmation (tanpa campur)
  const byTrItem = new Map() // tr -> item -> { pick: [], alt: [] }
  for (const l of locs.data ?? []) {
    const loc = String(l.location ?? '').trim()
    if (!loc || loc.startsWith('-') || loc === 'PACK01') continue
    const tr = l.reference_id ?? ''
    let byItem = byTrItem.get(tr)
    if (!byItem) {
      byItem = new Map()
      byTrItem.set(tr, byItem)
    }
    const item = l.item ?? ''
    let m = byItem.get(item)
    if (!m) {
      m = { pick: [], alt: [] }
      byItem.set(item, m)
    }
    const arr = l.transaction_type === 'Pick confirmation' ? m.pick : m.alt
    if (!arr.includes(loc)) arr.push(loc)
  }
  const nonBlank = (arr) => (arr ?? []).filter((x) => String(x ?? '').trim() !== '')
  const locByKey = new Map()
  for (const [tr, byItem] of byTrItem) {
    for (const [item, m] of byItem) {
      const pick = nonBlank(m.pick)
      locByKey.set(JSON.stringify([tr, item]), pick.length ? pick : nonBlank(m.alt))
    }
  }

  // vlookup mtrx-store via packing_reports.to_site_id → Code Site
  const siteByCode = new Map()
  for (const s of sites.data ?? []) siteByCode.set(String(s['Code Site'] ?? ''), s)

  const now = Date.now()
  const out = []
  for (const g of byTr.values()) {
    const site = siteByCode.get(String(g.to_site_id ?? ''))
    const base = {
      STORE: g.store ?? '',
      TR: g.shipment_id ?? '',
      QTY: g.qty,
      AGING: fmtAging(g.date_pick, now),
      'TYPE TR': g.type_tr ?? '',
      'DK/LK': site?.['DK/LK'] ?? '',
      'TYPE KIRIM': site?.['Type Kirim'] ?? '',
      USER: g.user_name ?? '',
      COMMENT: g.comment ?? ''
    }
    for (const d of g.details.values()) {
      const locs = locByKey.get(JSON.stringify([g.shipment_id ?? '', d.item ?? ''])) ?? []
      // satu baris per location; tanpa location tetap satu baris kosong
      const outLocs = locs.length ? locs : ['']
      for (const loc of outLocs) {
        out.push({ ...base, 'NO ITEM': d.item ?? '', 'ITEM NAME': d.description ?? '', LOCATION: loc, QTY: d.qty })
      }
    }
  }

  // ikut filter + search Task page (sudah termasuk di visibleIds); null = Task belum tampil → semua baris
  const vis = taskFilterState.visibleIds
  if (vis) {
    const set = vis instanceof Set ? vis : new Set(vis)
    return out.filter((r) => set.has(r.TR ?? ''))
  }
  return out
}

function csvCell(v) {
  const s = v == null ? '' : String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function dateStamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// UTF-8 + BOM supaya Excel membuka CSV dengan benar
export function downloadTaskCsv(rows) {
  const lines = [HEADERS.join(',')]
  for (const r of rows) lines.push(HEADERS.map((h) => csvCell(r[h])).join(','))
  const blob = new Blob(['\uFEFF' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `task-export-${dateStamp()}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function downloadTaskXlsx(rows) {
  const data = rows.map((r) => Object.fromEntries(HEADERS.map((h) => [h, r[h] ?? ''])))
  const ws = XLSX.utils.json_to_sheet(data, { header: HEADERS })
  ws['!cols'] = HEADERS.map((h) => {
    let max = h.length
    for (const d of data) {
      const len = String(d[h] ?? '').length
      if (len > max) max = len
    }
    return { wch: Math.min(40, max) }
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Task')
  XLSX.writeFile(wb, `task-export-${dateStamp()}.xlsx`)
}
