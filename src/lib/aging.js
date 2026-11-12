// Aging = jarak waktu dari date_pick (ISO) ke sekarang. Satuan 0 disembunyiin.
export function fmtAging(iso, now = Date.now()) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  let s = Math.max(0, Math.floor((now - t) / 1000))
  const d = Math.floor(s / 86400)
  s -= d * 86400
  const h = Math.floor(s / 3600)
  s -= h * 3600
  const m = Math.floor(s / 60)
  s -= m * 60
  const parts = []
  if (d) parts.push(`${d} Hari`)
  if (h) parts.push(`${h} Jam`)
  if (m) parts.push(`${m} Menit`)
  if (s || parts.length === 0) parts.push(`${s} Detik`)
  return parts.join(' ')
}
