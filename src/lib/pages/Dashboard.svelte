<script>
  import { onMount } from 'svelte'
  import { supabase } from '../supabase.js'
  import { fmtAging } from '../aging.js'

  let { email = '' } = $props()

  let rows = $state([])
  let feed = $state([])
  let catSummary = $state([])
  let loading = $state(true)
  let error = $state('')
  let now = $state(Date.now())

  const WD = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  const DONUT_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#0ea5e9', '#dc2626']
  const KIRIM_COLORS = ['#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6', '#f43f5e', '#64748b']

  const hasPick = (r) => !!r.date_pick && !Number.isNaN(Date.parse(r.date_pick))
  const byOldest = (a, b) => Date.parse(a.date_pick) - Date.parse(b.date_pick)
  const fullDays = (r) => Math.floor((now - Date.parse(r.date_pick)) / 86400000)

  onMount(async () => {
    const pack = await supabase
      .from('packing_reports')
      .select(
        'shipment_id, to_site_name, total_qty, status1, wave_number, type_tr, to_site_id, item, description, created_at'
      )
      .order('created_at', { ascending: false })

    if (pack.error) {
      error = pack.error.message
      loading = false
      return
    }

    // lookup dibatasi TR di list saja: select tanpa filter kena cap 1000 baris PostgREST
    const keys = [...new Set((pack.data ?? []).map((r) => r.shipment_id).filter(Boolean))]
    const look = keys.length
      ? await supabase.from('task_lookup').select('reference_id, date_pick').in('reference_id', keys)
      : { data: [], error: null }

    if (look.error) {
      error = look.error.message
      loading = false
      return
    }

    const sites = await supabase.from('mtrx-store').select('"Code Site", "DK/LK", "Type Kirim"')
    if (sites.error) {
      error = sites.error.message
      loading = false
      return
    }
    const siteByCode = new Map()
    for (const s of sites.data ?? []) siteByCode.set(String(s['Code Site']), s)

    const lookByTr = new Map()
    for (const l of look.data ?? []) lookByTr.set(l.reference_id, l)

    // group per TR: Qty = SUM total_qty, field lain = baris pertama per TR
    const byTr = new Map()
    for (const r of pack.data ?? []) {
      const key = r.shipment_id ?? ''
      const g = byTr.get(key)
      if (g) {
        g.qty += Number(r.total_qty) || 0
      } else {
        byTr.set(key, {
          shipment_id: r.shipment_id,
          store: r.to_site_name,
          qty: Number(r.total_qty) || 0,
          status1: r.status1,
          wave_number: r.wave_number,
          type_tr: r.type_tr,
          to_site_id: r.to_site_id,
          created_at: r.created_at
        })
      }
    }
    for (const [, g] of byTr) {
      const l = lookByTr.get(g.shipment_id ?? '')
      if (l) g.date_pick = l.date_pick
      const st = siteByCode.get(String(g.to_site_id ?? ''))
      g.dk_lk = st?.['DK/LK'] ?? ''
      g.type_kirim = st?.['Type Kirim'] ?? ''
    }
    rows = [...byTr.values()]

    // activity feed: tabel besar — wajib order+limit; gagal = panel kosong saja, bukan error halaman
    try {
      const f = await supabase
        .from('scale_transactions')
        .select('transaction_type, work_type, item, quantity, location, reference_id, activity_date_time, user_name')
        .order('activity_date_time', { ascending: false })
        .limit(5)
      feed = f.error ? [] : (f.data ?? [])
    } catch {
      feed = []
    }

    // summary kategori: gagal/kosong = panel kosong saja, bukan error halaman
    try {
      const itemKeys = [...new Set((pack.data ?? []).map((r) => r.item).filter(Boolean))]
      if (itemKeys.length) {
        const cats = await supabase
          .from('item_unit_cost_lookup')
          .select('item_no, unit_cost, category_name')
          .in('item_no', itemKeys)
        if (!cats.error && cats.data?.length) {
          const m = new Map()
          for (const c of cats.data) {
            const name = String(c.category_name ?? '').trim() || 'Tanpa kategori'
            const g = m.get(name) ?? { name, total: 0, items: new Set() }
            g.total += Number(c.unit_cost) || 0
            if (c.item_no) g.items.add(c.item_no)
            m.set(name, g)
          }
          catSummary = [...m.values()]
            .map((g) => ({ name: g.name, total: g.total, count: g.items.size }))
            .sort((a, b) => b.total - a.total)
        }
      }
    } catch {
      catSummary = []
    }

    loading = false
  })

  // aging live tick (60 detik)
  $effect(() => {
    const t = setInterval(() => {
      now = Date.now()
    }, 60000)
    return () => clearInterval(t)
  })

  // TR dengan date_pick, terlama dulu
  let aged = $derived(rows.filter(hasPick).sort(byOldest))

  let kpi = $derived.by(() => {
    const totalTr = rows.length
    const totalQty = rows.reduce((s, r) => s + (Number(r.qty) || 0), 0)
    const selesai = rows.filter((r) => String(r.status1 ?? '').trim().toLowerCase() === 'selesai').length
    const pct = totalTr ? Math.round((selesai / totalTr) * 100) : 0
    const oldest = aged[0]
    return {
      totalTr,
      totalQty: totalQty.toLocaleString('id-ID'),
      selesai,
      selesaiSub: `${pct}% dari TR`,
      aging: oldest ? fmtAging(oldest.date_pick, now) : '—',
      agingSub: oldest ? `TR ${oldest.shipment_id ?? ''} · ${oldest.store ?? ''}` : 'Belum ada data'
    }
  })

  let over7 = $derived(aged.filter((r) => fullDays(r) > 7).length)
  let top5 = $derived(aged.slice(0, 5))

  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

  // TR per hari: 7 hari terakhir termasuk hari ini; fallback date_pick → created_at
  let chart = $derived.by(() => {
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      days.push({ key: dayKey(d), label: WD[d.getDay()], v: 0 })
    }
    const idx = new Map(days.map((x, i) => [x.key, i]))
    for (const r of rows) {
      const ts = r.date_pick ?? r.created_at
      if (!ts) continue
      const d = new Date(ts)
      if (Number.isNaN(d)) continue
      const i = idx.get(dayKey(d))
      if (i !== undefined) days[i].v++
    }
    return { days, max: Math.max(...days.map((x) => x.v), 0) }
  })

  const barCls = (v, max) => {
    if (!v) return 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-700/60 dark:hover:bg-slate-700'
    if (v === max) return 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400'
    return 'bg-blue-300 hover:bg-blue-400 dark:bg-blue-800 dark:hover:bg-blue-700'
  }

  const barH = (v, max) => (v === 0 ? 4 : Math.max(8, Math.round((v / Math.max(max, 1)) * 84)))

  function countsBy(pick) {
    const m = new Map()
    for (const r of rows) {
      const k = String(pick(r) ?? '').trim()
      if (!k) continue
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }))
  }

  let dkLk = $derived(countsBy((r) => r.dk_lk))
  let kirim = $derived(countsBy((r) => r.type_kirim))

  let conic = $derived.by(() => {
    const total = dkLk.reduce((s, x) => s + x.count, 0)
    if (!total) return 'conic-gradient(#cbd5e1 0deg 360deg)'
    let acc = 0
    const parts = dkLk.map((x, i) => {
      const deg = (x.count / total) * 360
      const seg = `${DONUT_COLORS[i % DONUT_COLORS.length]} ${acc}deg ${acc + deg}deg`
      acc += deg
      return seg
    })
    return `conic-gradient(${parts.join(', ')})`
  })

  const pctOf = (c, total) => (total ? Math.round((c / total) * 100) : 0)

  let catTotal = $derived(catSummary.reduce((s, c) => s + c.total, 0))

  function statusCls(s) {
    const k = String(s ?? '').toLowerCase()
    if (k.includes('selesai'))
      return 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300'
    if (k.includes('pick'))
      return 'border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-300'
    return 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300'
  }

  const ageCls = (r) => {
    const d = fullDays(r)
    if (d >= 7) return 'font-bold text-red-600 dark:text-red-400'
    if (d >= 3) return 'font-semibold text-amber-600 dark:text-amber-400'
    return 'font-medium text-gray-700 dark:text-slate-300'
  }

  function openTr(id) {
    location.hash = `/task/detail?id=${encodeURIComponent(id ?? '')}`
  }

  function feedTone(t) {
    const k = String(t ?? '').toLowerCase()
    if (k === 'pick confirmation')
      return {
        dot: 'bg-emerald-500',
        badge: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300'
      }
    if (k.includes('putaway'))
      return {
        dot: 'bg-blue-600',
        badge: 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300'
      }
    return {
      dot: 'bg-amber-500',
      badge: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300'
    }
  }

  const hhmm = (iso) => {
    const d = new Date(iso)
    if (Number.isNaN(d)) return ''
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
</script>

{#snippet panelEmpty(t, s)}
  <div class="rounded-xl border border-gray-100 bg-gray-50 px-6 py-8 text-center dark:border-slate-700/70 dark:bg-slate-800/50">
    <p class="text-sm font-medium text-slate-800 dark:text-slate-100">{t}</p>
    <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">{s}</p>
  </div>
{/snippet}

<div>
  <!-- header sticky di bawah Topbar (h-14) -->
  <header
    class="sticky top-14 z-30 -mx-4 mb-5 border-b border-gray-100 bg-gray-50/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 dark:border-slate-800 dark:bg-slate-900/90 lg:-mx-8 lg:px-8"
  >
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <h1 class="truncate text-lg font-bold tracking-tight text-slate-800 sm:text-2xl dark:text-slate-100">
          Dashboard
        </h1>
        <p class="truncate text-sm text-gray-500 dark:text-slate-400">
          Selamat datang, {email}. Distribusi, aging & aktivitas upload.
        </p>
      </div>
      <span
        class="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >{loading ? '—' : kpi.totalTr} TR</span
      >
    </div>
  </header>

  {#if error}
    <div class="mb-5 rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/40">
      <p class="text-sm font-medium text-red-700 dark:text-red-300">Gagal memuat data</p>
      <p class="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
    </div>
  {/if}

  {#if loading}
    <p class="py-16 text-center text-sm text-gray-500 dark:text-slate-400">Memuat data...</p>
  {:else}
    <!-- KPI: 2 kolom di HP, 4 kolom lg -->
    <section aria-label="Ringkasan KPI" class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <div
        class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md active:scale-95 dark:border-slate-700/70 dark:bg-slate-900"
      >
        <p class="text-sm font-medium text-gray-500 dark:text-slate-400">Total TR</p>
        <p class="mt-1 text-3xl font-bold text-slate-800 sm:text-2xl dark:text-slate-100">{kpi.totalTr}</p>
        <p class="mt-1 text-sm text-gray-400 dark:text-slate-500">periode hari ini</p>
      </div>
      <div
        class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md active:scale-95 dark:border-slate-700/70 dark:bg-slate-900"
      >
        <p class="text-sm font-medium text-gray-500 dark:text-slate-400">Total Qty</p>
        <p class="mt-1 text-3xl font-bold text-slate-800 sm:text-2xl dark:text-slate-100">{kpi.totalQty}</p>
        <p class="mt-1 text-sm text-gray-400 dark:text-slate-500">item terpicking</p>
      </div>
      <div
        class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md active:scale-95 dark:border-slate-700/70 dark:bg-slate-900"
      >
        <p class="text-sm font-medium text-gray-500 dark:text-slate-400">Selesai</p>
        <p class="mt-1 text-3xl font-bold text-emerald-600 sm:text-2xl dark:text-emerald-400">{kpi.selesai}</p>
        <p class="mt-1 text-sm text-gray-400 dark:text-slate-500">{kpi.selesaiSub}</p>
      </div>
      <div
        class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md active:scale-95 dark:border-slate-700/70 dark:bg-slate-900"
      >
        <p class="text-sm font-medium text-gray-500 dark:text-slate-400">Aging Terlama</p>
        <p class="mt-1 text-3xl font-bold text-red-600 sm:text-2xl dark:text-red-400">{kpi.aging}</p>
        <p class="mt-1 truncate text-sm text-red-500 dark:text-red-400/80" title={kpi.agingSub}>{kpi.agingSub}</p>
      </div>
    </section>

    <div class="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
      <!-- bar chart -->
      <section class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700/70 dark:bg-slate-900">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100">TR per Hari</h2>
          <span class="text-sm text-gray-400 dark:text-slate-500">7 hari terakhir</span>
        </div>
        <div class="mt-5 flex h-44 items-end gap-2 border-b border-gray-200 pb-1 sm:h-52 sm:gap-3 dark:border-slate-700">
          {#each chart.days as x (x.key)}
            <div class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span class="text-xs font-medium text-gray-500 dark:text-slate-400 sm:text-sm">{x.v}</span>
              <div
                class="w-full rounded-t-md transition {barCls(x.v, chart.max)}"
                style="height: {barH(x.v, chart.max)}%"
                title="{x.v} TR"
              ></div>
            </div>
          {/each}
        </div>
        <div class="mt-2 flex gap-2 text-center text-sm text-gray-400 dark:text-slate-500">
          {#each chart.days as x (x.key)}
            <span class="flex-1">{x.label}</span>
          {/each}
        </div>
      </section>

      <!-- donut -->
      <section class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700/70 dark:bg-slate-900">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Split DK/LK & Type Kirim</h2>
          <span class="text-sm text-gray-400 dark:text-slate-500">{kpi.totalTr} TR</span>
        </div>
        <div class="mt-5 flex flex-col items-center gap-6 sm:flex-row">
          <div class="relative shrink-0">
            <div class="h-36 w-36 rounded-full sm:h-40 sm:w-40" style="background: {conic};"></div>
            <div
              class="absolute inset-0 m-auto flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white text-center shadow-inner dark:bg-slate-900"
            >
              <span class="text-xl font-bold text-slate-800 dark:text-slate-100">{kpi.totalTr}</span>
              <span class="text-sm text-gray-400 dark:text-slate-500">TR</span>
            </div>
          </div>
          <div class="w-full space-y-3">
            <div class="space-y-3">
              {#each dkLk as x, i (x.label)}
                <div class="flex items-center gap-2 text-sm">
                  <span class="h-3 w-3 shrink-0 rounded-sm" style="background: {DONUT_COLORS[i % DONUT_COLORS.length]};"></span>
                  <span class="min-w-0 flex-1 truncate text-gray-700 dark:text-slate-300">{x.label}</span>
                  <span class="shrink-0 font-semibold text-slate-800 dark:text-slate-100"
                    >{x.count} · {pctOf(x.count, kpi.totalTr)}%</span
                  >
                </div>
              {/each}
              {#if dkLk.length === 0}
                <p class="text-sm text-gray-400 dark:text-slate-500">Tidak ada data</p>
              {/if}
            </div>
            <div class="border-t border-gray-100 pt-3 dark:border-slate-700/70">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">Type Kirim</p>
              <div class="mt-2 space-y-2 text-sm">
                {#each kirim as x, i (x.label)}
                  <div class="flex items-center gap-2">
                    <span class="h-3 w-3 shrink-0 rounded-sm" style="background: {KIRIM_COLORS[i % KIRIM_COLORS.length]};"></span>
                    <span class="min-w-0 flex-1 truncate text-gray-700 dark:text-slate-300">{x.label}</span>
                    <span class="shrink-0 font-semibold text-slate-800 dark:text-slate-100">{x.count}</span>
                  </div>
                {/each}
                {#if kirim.length === 0}
                  <p class="text-gray-400 dark:text-slate-500">Tidak ada data</p>
                {/if}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- aging terlama: kartu di HP, tabel md+ -->
      <section class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700/70 dark:bg-slate-900">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Aging Terlama</h2>
          {#if over7 > 0}
            <span class="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 dark:bg-red-950/60 dark:text-red-400"
              >{over7} TR &gt; 7 hari</span
            >
          {/if}
        </div>

        {#if top5.length === 0}
          {@render panelEmpty('Tidak ada data', 'Belum ada TR dengan aging.')}
        {:else}
          <!-- mobile: kartu -->
          <ul class="space-y-3 md:hidden">
            {#each top5 as r (r.shipment_id ?? '')}
              <li>
                <button
                  type="button"
                  onclick={() => openTr(r.shipment_id)}
                  class="w-full cursor-pointer rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left transition active:scale-[0.98] active:border-red-200 active:bg-red-50/60 focus:outline-none focus:ring-2 focus:ring-blue-700/30 dark:border-slate-700/70 dark:bg-slate-800/50 dark:active:border-red-900/60 dark:active:bg-red-950/40"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="truncate text-base font-semibold text-slate-800 dark:text-slate-100">{r.store ?? ''}</p>
                      <p class="mt-1 text-sm font-medium text-gray-500 dark:text-slate-400">{r.shipment_id ?? ''}</p>
                    </div>
                    <span class="shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold {statusCls(r.status1)}">
                      {r.status1 ?? '—'}
                    </span>
                  </div>
                  <p class="mt-3 border-t border-gray-200/70 pt-3 text-base {ageCls(r)} dark:border-slate-700/70">
                    {fmtAging(r.date_pick, now) || '—'}
                  </p>
                </button>
              </li>
            {/each}
          </ul>

          <!-- md+: tabel -->
          <div class="hidden overflow-x-auto overscroll-x-contain md:block">
            <table class="w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr>
                  <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">TR</th>
                  <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">Store</th>
                  <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">Aging</th>
                  <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">Status1</th>
                </tr>
              </thead>
              <tbody>
                {#each top5 as r, i (r.shipment_id ?? '')}
                  <tr
                    class="cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-700/30 {i % 2 === 0
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-gray-50 dark:bg-slate-800/60'} hover:bg-red-50/50 dark:hover:bg-red-950/30"
                    tabindex="0"
                    onclick={() => openTr(r.shipment_id)}
                    onkeydown={(e) => e.key === 'Enter' && openTr(r.shipment_id)}
                  >
                    <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700 dark:border-slate-700/70 dark:text-slate-200">{r.shipment_id ?? ''}</td>
                    <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700 dark:border-slate-700/70 dark:text-slate-200">{r.store ?? ''}</td>
                    <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm {ageCls(r)} dark:border-slate-700/70">{fmtAging(r.date_pick, now) || '—'}</td>
                    <td class="border-b border-gray-100 px-3 py-2 text-sm dark:border-slate-700/70">
                      <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold {statusCls(r.status1)}">{r.status1 ?? '—'}</span>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>

      <!-- activity feed -->
      <section class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700/70 dark:bg-slate-900">
        <div class="mb-4 flex items-center justify-between gap-2">
          <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Aktivitas Terbaru</h2>
          <span class="text-sm text-gray-400 dark:text-slate-500">log transaksi</span>
        </div>

        {#if feed.length === 0}
          {@render panelEmpty('Tidak ada aktivitas', 'Belum ada log transaksi terbaru.')}
        {:else}
          <ol class="relative space-y-5 border-l border-gray-200 pl-5 dark:border-slate-700">
            {#each feed as f, i (i)}
              {@const tone = feedTone(f.transaction_type)}
              <li class="rounded-xl p-2">
                <span class="absolute -left-[5px] mt-2 h-2.5 w-2.5 rounded-full {tone.dot} ring-4 ring-white dark:ring-slate-900"></span>
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span class="rounded-full border px-2 py-0.5 text-xs font-semibold {tone.badge}">
                    {f.transaction_type ?? '—'}
                  </span>
                  {#if f.work_type}
                    <span class="text-sm text-gray-400 dark:text-slate-500">{f.work_type}</span>
                  {/if}
                  <span class="ml-auto text-sm text-gray-400 dark:text-slate-500">{hhmm(f.activity_date_time)}</span>
                </div>
                <p class="mt-2 text-base font-medium leading-snug text-slate-800 dark:text-slate-100">{f.item ?? '—'}</p>
                <p class="mt-1 break-words text-sm text-gray-500 dark:text-slate-400">
                  Location <span class="font-semibold text-gray-600 dark:text-slate-300">{f.location ?? '—'}</span>
                  · {f.reference_id ?? '—'} · qty {f.quantity ?? 0}
                </p>
              </li>
            {/each}
          </ol>
        {/if}
      </section>

      <!-- summary category -->
      <section class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700/70 dark:bg-slate-900">
        <div class="mb-4 flex items-center justify-between gap-2">
          <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Summary Category</h2>
          <span class="text-sm text-gray-400 dark:text-slate-500">Total unit cost item terpicking</span>
        </div>

        {#if catSummary.length === 0}
          {@render panelEmpty('Tidak ada data', 'Belum ada item terpicking.')}
        {:else}
          <div class="space-y-3">
            {#each catSummary as c, i (c.name)}
              <div class="flex items-center gap-2 text-sm">
                <span class="h-3 w-3 shrink-0 rounded-sm" style="background: {DONUT_COLORS[i % DONUT_COLORS.length]};"></span>
                <span class="min-w-0 flex-1 truncate text-gray-700 dark:text-slate-300">{c.name}</span>
                <span class="shrink-0 text-xs text-gray-400 dark:text-slate-500">{c.count} item</span>
                <span class="shrink-0 font-semibold text-slate-800 dark:text-slate-100"
                  >{Number(c.total).toLocaleString('id-ID')}</span
                >
              </div>
            {/each}
          </div>
          <div class="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-slate-700/70">
            <span class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">Total</span>
            <span class="text-sm font-semibold text-slate-800 dark:text-slate-100"
              >{Number(catTotal).toLocaleString('id-ID')}</span
            >
          </div>
        {/if}
      </section>
    </div>
  {/if}
</div>
