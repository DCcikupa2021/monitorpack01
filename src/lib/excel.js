import * as XLSX from 'xlsx'

// kind detection: header row wajib mengandung keyword ini (packing dicek dulu)
const MARKERS = {
  packing: ['WAVE NUMBER', 'SHIPMENT ID'],
  scale: ['INTERNAL ID', 'REFERENCE ID', 'ACTIVITY DATE TIME'],
}

const cells = (row) => row.map((c) => (c == null ? '' : String(c).trim()))

export async function parseWorkbook(file) {
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const table = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null })

  // auto-detect header row, scan maksimal 15 baris pertama
  let headerIndex = -1
  let kind = ''
  const limit = Math.min(table.length, 15)
  for (let i = 0; i < limit; i++) {
    const text = cells(table[i])
    if (MARKERS.packing.every((m) => text.includes(m))) {
      kind = 'packing'
      headerIndex = i
      break
    }
    if (MARKERS.scale.every((m) => text.includes(m))) {
      kind = 'scale'
      headerIndex = i
      break
    }
  }
  if (headerIndex === -1) {
    throw new Error('Format file tidak dikenali. Hanya RP36 Packing Report atau Report Transaction History SCALE yang didukung.')
  }

  // buang kolom tanpa header (artefak merge, mis. B:C menyisakan C kosong)
  const rawHeaders = table[headerIndex]
  const keep = []
  for (let c = 0; c < rawHeaders.length; c++) {
    if (rawHeaders[c] != null && String(rawHeaders[c]).trim() !== '') keep.push(c)
  }
  const headers = keep.map((c) => String(rawHeaders[c]).trim())

  const rows = []
  for (let r = headerIndex + 1; r < table.length; r++) {
    const row = table[r]
    const values = keep.map((c) => (row[c] === undefined ? null : row[c]))
    if (values.every((v) => v == null || v === '')) continue
    const obj = {}
    headers.forEach((h, i) => {
      obj[h] = values[i]
    })
    rows.push(obj)
  }

  // scale: hanya WORK GROUP "Picking" yang diproses, sisanya dibuang
  const filtered = kind === 'scale' ? rows.filter((r) => String(r['WORK GROUP'] ?? '').trim() === 'Picking') : rows
  if (filtered.length === 0) throw new Error('File terbaca tapi tidak ada data.')

  return { kind, headers, rows: filtered }
}
