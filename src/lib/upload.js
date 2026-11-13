import { supabase } from './supabase.js'

const TABLES = { packing: 'packing_reports', scale: 'scale_transactions' }

// packing = snapshot penuh (hapus lama, tulis baru); scale = upsert per internal_id, tanpa delete
const REPLACE_TABLES = new Set(['packing_reports'])
const UPSERT_KEYS = { scale_transactions: 'internal_id' }

// wajib sama persis dengan DDL kolom di migrasi
const NUMBERS = {
  packing_reports: ['wave_number', 'line_number', 'internal_shipment_line_number', 'internal_shipment_number', 'total_qty', 'weight'],
  scale_transactions: ['internal_id', 'quantity'],
}
const DATES = {
  packing_reports: [],
  scale_transactions: ['activity_date_time'],
}

// CHUNK 1000 + kirim paralel: jauh di bawah statement_timeout 8s koneksi PostgREST lama
const CHUNK = 1000
const PARALLEL = 6

const toColumn = (h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

const number = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).trim())
  return Number.isFinite(n) ? n : null
}

const date = (v) => {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date) return v.toISOString()
  return String(v).trim()
}

const text = (v) => {
  if (v === null || v === undefined) return null
  return String(v)
}

export async function processUpload(files) {
  if (!files || files.length === 0) throw new Error('Tidak ada file untuk diproses.')

  const kinds = []
  const groups = {}
  for (const f of files) {
    if (!TABLES[f.kind]) throw new Error('Jenis file tidak dikenali.')
    if (!groups[f.kind]) {
      groups[f.kind] = { kind: f.kind, headers: f.headers, rows: [] }
      kinds.push(f.kind)
    }
    groups[f.kind].rows = groups[f.kind].rows.concat(f.rows)
  }

  const results = []
  for (const kind of kinds) {
    const { headers, rows } = groups[kind]
    const table = TABLES[kind]

    if (REPLACE_TABLES.has(table)) {
      const { error: delError } = await supabase.from(table).delete().not('id', 'is', null)
      if (delError) throw new Error('Gagal menghapus data lama di ' + table + ': ' + delError.message)
    }

    const cols = headers.map(toColumn)
    const numbers = new Set(NUMBERS[table])
    const dates = new Set(DATES[table])
    const coerce = (col, v) => (numbers.has(col) ? number(v) : dates.has(col) ? date(v) : text(v))

    const { data } = await supabase.auth.getSession()
    const created_by = data.session?.user?.id ?? null

    const mapped = rows.map((row) => {
      const out = {}
      headers.forEach((h, i) => {
        out[cols[i]] = coerce(cols[i], row[h])
      })
      out.created_by = created_by
      return out
    })

    // pool worker: beberapa chunk jalan bareng, urutan tidak penting
    const offsets = []
    for (let o = 0; o < mapped.length; o += CHUNK) offsets.push(o)
    let cursor = 0
    const worker = async () => {
      while (cursor < offsets.length) {
        const offset = offsets[cursor++]
        const chunk = mapped.slice(offset, offset + CHUNK)
        const key = UPSERT_KEYS[table]
        const { error } = key
          ? await supabase.from(table).upsert(chunk, { onConflict: key })
          : await supabase.from(table).insert(chunk)
        if (error) throw new Error('Upload ' + table + ' gagal di baris ' + (offset + 1) + ': ' + error.message)
      }
    }
    await Promise.all(Array.from({ length: Math.min(PARALLEL, offsets.length) }, worker))

    results.push({ table, kind, inserted: rows.length })
  }

  return results
}
