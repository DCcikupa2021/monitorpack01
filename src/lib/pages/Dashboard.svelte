<script>
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { supabase } from '../supabase.js'

  let { email = '' } = $props()

  // baris kaya per packing_reports: value, category, store, group geo/type, date_pick per TR
  let packRows = $state([])
  let loading = $state(true)
  let error = $state('')
  let kpiValue = $state(0)
  let categoryRows = $state([])
  let now = $state(Date.now())
  let open = $state({}) // path node → terbuka/tidak; multi-open, key ber-prefix panel

  const DONUT_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#0ea5e9', '#dc2626']
  const BUCKETS = ['Dibawah 7 Hari', 'Diatas 7 Hari']

  const TD = 'whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm dark:border-slate-700/70'
  const TH =
    'whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-400'
  const INK = 'text-gray-700 dark:text-slate-200'
  const DIM = 'text-gray-400 dark:text-slate-500'
  const TOP = 'border-t border-gray-200 dark:border-slate-700'
  const NUM = 'text-right tabular-nums'

  const fmt = (n) => Number(n).toLocaleString('id-ID')

  // metric scope apa pun: Jumlah TR = distinct shipment_id, Qty/Value = Σ baris
  function metricsOf(lines) {
    const trs = new Set()
    let qty = 0
    let value = 0
    for (const l of lines) {
      trs.add(l.shipment_id)
      qty += l.qty
      value += l.value
    }
    return { tr: trs.size, qty, value }
  }

  // TR tanpa date_pick → Dibawah 7 Hari (asumsi, cuma 2 bucket)
  function bucketOf(datePick, nowMs) {
    if (!datePick) return BUCKETS[0]
    const t = Date.parse(datePick)
    if (Number.isNaN(t)) return BUCKETS[0]
    return Math.floor((nowMs - t) / 86400000) <= 7 ? BUCKETS[0] : BUCKETS[1]
  }

  function groupBy(lines, keyFn) {
    const m = new Map()
    for (const l of lines) {
      const k = keyFn(l)
      const arr = m.get(k)
      if (arr) arr.push(l)
      else m.set(k, [l])
    }
    return m
  }

  // tree statis: bucket → category → store → TR (depth 4); withType = header Stock/Terjual di atas
  // segment key di-encode: nama boleh berisi "/" tanpa bikin key dobel
  function buildTree(lines, nowMs, withType, prefix) {
    const seg = (s) => encodeURIComponent(s)
    const mk = (key, label, level, ls) => ({ key, label, level, ...metricsOf(ls), children: [] })
    const bucketLevel = (p, ls) => {
      const byBucket = groupBy(ls, (l) => bucketOf(l.date_pick, nowMs))
      return BUCKETS.map((b) => {
        const bl = byBucket.get(b) ?? []
        const bp = `${p}/${seg(b)}`
        const bNode = mk(bp, b, 'bucket', bl)
        for (const [cat, cl] of groupBy(bl, (l) => l.category)) {
          const cp = `${bp}/${seg(cat)}`
          const cNode = mk(cp, cat, 'cat', cl)
          for (const [store, sl] of groupBy(cl, (l) => l.store)) {
            const sp = `${cp}/${seg(store)}`
            const sNode = mk(sp, store, 'store', sl)
            for (const [tr, tl] of groupBy(sl, (l) => l.shipment_id)) {
              sNode.children.push(mk(`${sp}/${seg(tr)}`, tr || 'blank', 'tr', tl))
            }
            cNode.children.push(sNode)
          }
          bNode.children.push(cNode)
        }
        return bNode
      })
    }
    if (!withType) return bucketLevel(prefix, lines)
    const out = []
    for (const type of ['STOCK', 'TERJUAL']) {
      const tl = lines.filter((l) => l.typeLabel === type)
      if (!tl.length) continue
      const tp = `${prefix}/${seg(type)}`
      const tNode = mk(tp, type, 'type', tl)
      tNode.children = bucketLevel(tp, tl)
      out.push(tNode)
    }
    return out
  }

  // flatten node terbuka saja → satu {#each}, key path unik, tanpa rekursi di template
  function flattenTree(nodes, openMap, depth, out) {
    for (const n of nodes) {
      out.push({ ...n, depth })
      const isOpen = n.level === 'type' || (n.children.length > 0 && !!openMap[n.key])
      if (isOpen && depth < 4) flattenTree(n.children, openMap, depth + 1, out)
    }
    return out
  }

  function toggle(key) {
    open[key] = !open[key]
  }

  onMount(async () => {
    const pack = await supabase
      .from('packing_reports')
      .select('shipment_id, total_qty, item, type_tr, to_site_id, to_site_name')
      .order('created_at', { ascending: false })

    if (pack.error) {
      error = pack.error.message
      loading = false
      return
    }

    const lines = pack.data ?? []
    const trKeys = [...new Set(lines.map((r) => r.shipment_id).filter(Boolean))]
    const itemKeys = [...new Set(lines.map((r) => r.item).filter(Boolean))]

    // lookup paralel, dibatasi key di list (cap 1000 baris PostgREST); mtrx-store kecil (~70)
    const [lookRes, sitesRes, costsRes] = await Promise.all([
      trKeys.length
        ? supabase.from('task_lookup').select('reference_id, date_pick').in('reference_id', trKeys)
        : { data: [], error: null },
      supabase.from('mtrx-store').select('"Code Site", "DK/LK"'),
      itemKeys.length
        ? supabase
            .from('all_item-direct-cost')
            .select('"Item No", "Sum of Unit Cost", "Category Name"')
            .in('Item No', itemKeys)
        : { data: [], error: null }
    ])
    if (lookRes.error) console.error('task_lookup:', lookRes.error.message)
    if (sitesRes.error) console.error('mtrx-store:', sitesRes.error.message)
    if (costsRes.error) console.error('all_item-direct-cost:', costsRes.error.message)

    const dateByTr = new Map()
    for (const l of lookRes.data ?? []) dateByTr.set(l.reference_id, l.date_pick)

    const geoByCode = new Map()
    for (const s of sitesRes.data ?? []) geoByCode.set(String(s['Code Site'] ?? ''), s['DK/LK'] ?? '')

    const costByItem = new Map()
    for (const c of costsRes.data ?? []) {
      if (!c) continue
      costByItem.set(c['Item No'], {
        unit: Number(c['Sum of Unit Cost']) || 0,
        cat: c['Category Name'] || ''
      })
    }

    // Value + Summary Category (lama): baris tanpa cost = 0 / tidak masuk daftar kategori
    let value = 0
    const catAgg = new Map()
    for (const r of lines) {
      const m = costByItem.get(r.item)
      if (!m) continue
      const add = m.unit * (Number(r.total_qty) || 0)
      value += add
      const key = m.cat || 'Tanpa kategori'
      const g = catAgg.get(key) ?? { category: key, value: 0, items: new Set() }
      g.value += add
      g.items.add(r.item)
      catAgg.set(key, g)
    }
    categoryRows = [...catAgg.values()]
      .map((g) => ({ category: g.category, value: g.value, items: g.items.size }))
      .sort((a, b) => b.value - a.value)
    kpiValue = value

    // enrich sekali di onMount; Kirlang / Dalam Kota / Luar Kota / Lainnya
    packRows = lines.map((r) => {
      const m = costByItem.get(r.item)
      const qty = Number(r.total_qty) || 0
      const typeRaw = String(r.type_tr ?? '').trim().toLowerCase()
      const geo = geoByCode.get(String(r.to_site_id ?? '')) ?? ''
      let group = 'Lainnya'
      let typeLabel = ''
      if (typeRaw === 'kirim langsung') {
        group = 'Kirlang'
      } else if (typeRaw === 'stock' || typeRaw === 'terjual') {
        typeLabel = typeRaw === 'stock' ? 'STOCK' : 'TERJUAL'
        if (geo === 'Dalam Kota') group = 'Dalam Kota'
        else if (geo === 'Luar Kota') group = 'Luar Kota'
        // geo tak ter-map → Lainnya: ikut Summary ALL, keluar dari Summary Pack
      }
      return {
        shipment_id: r.shipment_id ?? '',
        qty,
        value: (m?.unit ?? 0) * qty,
        category: m?.cat || 'Tanpa kategori',
        store: r.to_site_name || 'Tanpa store',
        date_pick: dateByTr.get(r.shipment_id) ?? '',
        group,
        typeLabel
      }
    })

    loading = false
  })

  // aging live: bucket berganti saat TR lewat 7 hari
  $effect(() => {
    const t = setInterval(() => {
      now = Date.now()
    }, 60000)
    return () => clearInterval(t)
  })

  let kpi = $derived.by(() => {
    const trs = new Set()
    let qty = 0
    for (const r of packRows) {
      trs.add(r.shipment_id)
      qty += r.qty
    }
    return {
      totalTr: trs.size,
      totalQty: qty.toLocaleString('id-ID'),
      value: kpiValue.toLocaleString('id-ID')
    }
  })

  let linesKirlang = $derived(packRows.filter((r) => r.group === 'Kirlang'))
  let linesDK = $derived(packRows.filter((r) => r.group === 'Dalam Kota'))
  let linesLK = $derived(packRows.filter((r) => r.group === 'Luar Kota'))
  let totKirlang = $derived(metricsOf(linesKirlang))
  let totDK = $derived(metricsOf(linesDK))
  let totLK = $derived(metricsOf(linesLK))

  let allRows = $derived.by(() => {
    const out = []
    const push = (key, col1, col2, lines, kind) => {
      out.push({ key, col1, col2, kind, ...metricsOf(lines) })
    }
    if (linesKirlang.length) push('kirlang', 'Kirlang', '—', linesKirlang, 'group')
    if (linesDK.length) {
      push('dk-t', 'Dalam Kota', 'Terjual', linesDK.filter((r) => r.typeLabel === 'TERJUAL'), 'sub')
      push('dk-s', '', 'Stock', linesDK.filter((r) => r.typeLabel === 'STOCK'), 'sub')
      push('dk-total', 'Total Dalam Kota', null, linesDK, 'total')
    }
    if (linesLK.length) {
      push('lk-t', 'Luar Kota', 'Terjual', linesLK.filter((r) => r.typeLabel === 'TERJUAL'), 'sub')
      push('lk-s', '', 'Stock', linesLK.filter((r) => r.typeLabel === 'STOCK'), 'sub')
      push('lk-total', 'Total Luar Kota', null, linesLK, 'total')
    }
    const lain = packRows.filter((r) => r.group === 'Lainnya')
    if (lain.length) push('lain', 'Lainnya', '—', lain, 'group')
    if (packRows.length) push('grand', 'Total', null, packRows, 'grand')
    return out
  })

  let treeKirlang = $derived(buildTree(linesKirlang, now, false, 'kirlang'))
  let treeDK = $derived(buildTree(linesDK, now, true, 'dk'))
  let treeLK = $derived(buildTree(linesLK, now, true, 'lk'))
  let visKirlang = $derived(flattenTree(treeKirlang, open, 0, []))
  let visDK = $derived(flattenTree(treeDK, open, 0, []))
  let visLK = $derived(flattenTree(treeLK, open, 0, []))
</script>

{#snippet chev(key)}
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="mr-1 inline-block size-3.5 shrink-0 align-middle transition-transform duration-150 {open[key]
      ? 'rotate-180'
      : ''}"
    aria-hidden="true"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
{/snippet}

{#snippet treeRow(n, i, showType)}
  {@const togglable = n.level !== 'type' && n.children.length > 0}
  {@const dim = n.tr === 0 ? DIM : INK}
  <tr
    class="transition-colors {i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-gray-50 dark:bg-slate-800/50'} {togglable
      ? 'cursor-pointer select-none hover:bg-blue-50/60 dark:hover:bg-slate-800'
      : ''}"
    aria-expanded={togglable ? !!open[n.key] : undefined}
    tabindex={togglable ? 0 : undefined}
    onclick={togglable ? () => toggle(n.key) : undefined}
    onkeydown={togglable
      ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle(n.key)
          }
        }
      : undefined}
    in:fade={{ duration: 120 }}
    out:fade={{ duration: 100 }}
  >
    {#if showType}
      <td class="{TD} {dim}"></td>
    {/if}
    <td class="{TD} {dim}">
      {#if n.level === 'bucket'}
        {#if togglable}
          {@render chev(n.key)}
        {:else}
          <span class="mr-1 inline-block w-3.5"></span>
        {/if}
        {n.label}
      {/if}
    </td>
    <td class="{TD} {dim} max-w-[160px] truncate" title={n.level === 'cat' ? n.label : undefined}>
      {#if n.level === 'cat'}
        {#if togglable}
          {@render chev(n.key)}
        {:else}
          <span class="mr-1 inline-block w-3.5"></span>
        {/if}
        {n.label}
      {/if}
    </td>
    <td class="{TD} {dim} max-w-[160px] truncate" title={n.level === 'store' ? n.label : undefined}>
      {#if n.level === 'store'}
        {#if togglable}
          {@render chev(n.key)}
        {:else}
          <span class="mr-1 inline-block w-3.5"></span>
        {/if}
        {n.label}
      {/if}
    </td>
    <td class="{TD} {dim} max-w-[170px] truncate" title={n.level === 'tr' ? n.label : undefined}>
      {#if n.level === 'tr'}
        {n.label}
      {/if}
    </td>
    <td class="{TD} {dim} {NUM}">{fmt(n.tr)}</td>
    <td class="{TD} {dim} {NUM}">{fmt(n.qty)}</td>
    <td class="{TD} {dim} {NUM}">{fmt(n.value)}</td>
  </tr>
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
          Selamat datang, {email}. Ringkasan TR, qty & value.
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
    <!-- KPI: 2 kolom di HP, 3 kolom lg -->
    <section aria-label="Ringkasan KPI" class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      <div
        class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md active:scale-95 dark:border-slate-700/70 dark:bg-slate-900"
      >
        <p class="text-sm font-medium text-gray-500 dark:text-slate-400">Total TR</p>
        <p class="mt-1 text-3xl font-bold text-slate-800 sm:text-2xl dark:text-slate-100">{kpi.totalTr}</p>
      </div>
      <div
        class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md active:scale-95 dark:border-slate-700/70 dark:bg-slate-900"
      >
        <p class="text-sm font-medium text-gray-500 dark:text-slate-400">Total Qty</p>
        <p class="mt-1 text-3xl font-bold text-slate-800 sm:text-2xl dark:text-slate-100">{kpi.totalQty}</p>
      </div>
      <div
        class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md active:scale-95 dark:border-slate-700/70 dark:bg-slate-900"
      >
        <p class="text-sm font-medium text-gray-500 dark:text-slate-400">Value</p>
        <p class="mt-1 text-3xl font-bold text-slate-800 sm:text-2xl dark:text-slate-100">{kpi.value}</p>
      </div>
    </section>

    <!-- 5 panel: Category+ALL, Kirlang+Dalam Kota, Luar Kota full -->
    <div class="mt-5 grid gap-5 lg:grid-cols-2">
      <!-- Summary Category (lama) -->
      <section
        aria-label="Summary Category"
        class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700/70 dark:bg-slate-900"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Summary Category</h2>
          <span class="text-sm text-gray-400 dark:text-slate-500">Total unit cost item terpicking</span>
        </div>
        {#if categoryRows.length}
          <ul class="mt-4 space-y-3">
            {#each categoryRows as c, i (c.category)}
              <li class="flex items-center gap-3">
                <span
                  class="h-2.5 w-2.5 shrink-0 rounded-full"
                  style="background-color: {DONUT_COLORS[i % DONUT_COLORS.length]}"
                ></span>
                <span class="min-w-0 flex-1 truncate text-sm text-gray-600 dark:text-slate-300">{c.category}</span>
                <span class="shrink-0 text-xs text-gray-400 dark:text-slate-500">{c.items} item</span>
                <span class="shrink-0 text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200"
                  >{c.value.toLocaleString('id-ID')}</span
                >
              </li>
            {/each}
          </ul>
          <div class="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-slate-700/70">
            <span class="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">Total</span>
            <span class="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">{kpi.value}</span>
          </div>
        {:else}
          <p class="mt-4 text-sm text-gray-500 dark:text-slate-400">Belum ada data kategori.</p>
        {/if}
      </section>

      <!-- Summary ALL -->
      <section
        aria-label="Summary ALL"
        class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700/70 dark:bg-slate-900"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Summary ALL</h2>
          <span class="text-sm text-gray-400 dark:text-slate-500">Per Type TR &amp; DK/LK</span>
        </div>
        {#if !packRows.length}
          <p class="mt-4 text-sm text-gray-500 dark:text-slate-400">Belum ada data.</p>
        {:else}
          <div class="mt-4 overflow-x-auto overscroll-x-contain">
            <table class="w-full min-w-max border-separate border-spacing-0 text-left">
              <thead>
                <tr>
                  <th scope="col" class="{TH}">Type TR</th>
                  <th scope="col" class="{TH}">DK/LK</th>
                  <th scope="col" class="{TH} {NUM}">Jumlah TR</th>
                  <th scope="col" class="{TH} {NUM}">Qty</th>
                  <th scope="col" class="{TH} {NUM}">Value</th>
                </tr>
              </thead>
              <tbody>
                {#each allRows as r, i (r.key)}
                  {@const top = r.kind === 'total' || r.kind === 'grand' ? TOP : ''}
                  {@const ink =
                    r.kind === 'grand'
                      ? 'font-bold text-blue-900 dark:text-blue-100'
                      : r.kind === 'total' || r.kind === 'group'
                        ? 'font-semibold text-slate-800 dark:text-slate-100'
                        : INK}
                  {@const bg =
                    r.kind === 'grand'
                      ? 'bg-blue-50/70 dark:bg-blue-950/40'
                      : r.kind === 'total'
                        ? 'bg-gray-50 dark:bg-slate-800/60'
                        : r.kind === 'group'
                          ? 'bg-gray-50/70 dark:bg-slate-800/40'
                          : i % 2 === 0
                            ? 'bg-white dark:bg-slate-900'
                            : 'bg-gray-50 dark:bg-slate-800/50'}
                  <tr class="transition-colors {bg}">
                    {#if r.col2 === null}
                      <td class="{TD} {top} {ink}" colspan="2">{r.col1}</td>
                    {:else}
                      <td class="{TD} {top} {ink}">{r.col1}</td>
                      <td class="{TD} {top} {ink}">{r.col2}</td>
                    {/if}
                    <td class="{TD} {top} {ink} {NUM}">{fmt(r.tr)}</td>
                    <td class="{TD} {top} {ink} {NUM}">{fmt(r.qty)}</td>
                    <td class="{TD} {top} {ink} {NUM}">{fmt(r.value)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>

      <!-- Summary Pack Kirlang -->
      <section
        aria-label="Summary Pack Kirlang"
        class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700/70 dark:bg-slate-900"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Summary Pack Kirlang</h2>
          <span class="text-sm text-gray-400 dark:text-slate-500">Klik baris untuk drill-down</span>
        </div>
        {#if !linesKirlang.length}
          <p class="mt-4 text-sm text-gray-500 dark:text-slate-400">Belum ada data Kirlang.</p>
        {:else}
          <div class="mt-4 overflow-x-auto overscroll-x-contain">
            <table class="w-full min-w-max border-separate border-spacing-0 text-left">
              <thead>
                <tr>
                  <th scope="col" class="{TH}">Aging</th>
                  <th scope="col" class="{TH}">Category</th>
                  <th scope="col" class="{TH}">Store</th>
                  <th scope="col" class="{TH}">List TR</th>
                  <th scope="col" class="{TH} {NUM}">Jumlah TR</th>
                  <th scope="col" class="{TH} {NUM}">Qty</th>
                  <th scope="col" class="{TH} {NUM}">Value</th>
                </tr>
              </thead>
              <tbody>
                {#each visKirlang as n, i (n.key)}
                  {@render treeRow(n, i, false)}
                {/each}
                <tr class="bg-gray-50 dark:bg-slate-800/60">
                  <td colspan="4" class="{TD} {TOP} font-bold text-slate-800 dark:text-slate-100">Total</td>
                  <td class="{TD} {TOP} {NUM} font-bold text-slate-800 dark:text-slate-100">{fmt(totKirlang.tr)}</td>
                  <td class="{TD} {TOP} {NUM} font-bold text-slate-800 dark:text-slate-100">{fmt(totKirlang.qty)}</td>
                  <td class="{TD} {TOP} {NUM} font-bold text-slate-800 dark:text-slate-100"
                    >{fmt(totKirlang.value)}</td
                  >
                </tr>
              </tbody>
            </table>
          </div>
        {/if}
      </section>

      <!-- Summary Pack Dalam Kota -->
      <section
        aria-label="Summary Pack Dalam Kota"
        class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700/70 dark:bg-slate-900"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Summary Pack Dalam Kota</h2>
          <span class="text-sm text-gray-400 dark:text-slate-500">Klik baris untuk drill-down</span>
        </div>
        {#if !linesDK.length}
          <p class="mt-4 text-sm text-gray-500 dark:text-slate-400">Belum ada data Dalam Kota.</p>
        {:else}
          <div class="mt-4 overflow-x-auto overscroll-x-contain">
            <table class="w-full min-w-max border-separate border-spacing-0 text-left">
              <thead>
                <tr>
                  <th scope="col" class="{TH}">Type TR</th>
                  <th scope="col" class="{TH}">Aging</th>
                  <th scope="col" class="{TH}">Category</th>
                  <th scope="col" class="{TH}">Store</th>
                  <th scope="col" class="{TH}">List TR</th>
                  <th scope="col" class="{TH} {NUM}">Jumlah TR</th>
                  <th scope="col" class="{TH} {NUM}">Qty</th>
                  <th scope="col" class="{TH} {NUM}">Value</th>
                </tr>
              </thead>
              <tbody>
                {#each visDK as n, i (n.key)}
                  {#if n.level === 'type'}
                    <tr class="bg-blue-50/70 dark:bg-blue-950/40">
                      <td class="{TD} font-semibold text-blue-700 dark:text-blue-300">{n.label}</td>
                      <td colspan="4" class="{TD}"></td>
                      <td class="{TD} {NUM} font-semibold text-slate-800 dark:text-slate-100">{fmt(n.tr)}</td>
                      <td class="{TD} {NUM} font-semibold text-slate-800 dark:text-slate-100">{fmt(n.qty)}</td>
                      <td class="{TD} {NUM} font-semibold text-slate-800 dark:text-slate-100">{fmt(n.value)}</td>
                    </tr>
                  {:else}
                    {@render treeRow(n, i, true)}
                  {/if}
                {/each}
                <tr class="bg-gray-50 dark:bg-slate-800/60">
                  <td colspan="5" class="{TD} {TOP} font-bold text-slate-800 dark:text-slate-100">Total</td>
                  <td class="{TD} {TOP} {NUM} font-bold text-slate-800 dark:text-slate-100">{fmt(totDK.tr)}</td>
                  <td class="{TD} {TOP} {NUM} font-bold text-slate-800 dark:text-slate-100">{fmt(totDK.qty)}</td>
                  <td class="{TD} {TOP} {NUM} font-bold text-slate-800 dark:text-slate-100">{fmt(totDK.value)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        {/if}
      </section>

      <!-- Summary Pack Luar Kota -->
      <section
        aria-label="Summary Pack Luar Kota"
        class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700/70 dark:bg-slate-900 lg:col-span-2"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Summary Pack Luar Kota</h2>
          <span class="text-sm text-gray-400 dark:text-slate-500">Klik baris untuk drill-down</span>
        </div>
        {#if !linesLK.length}
          <p class="mt-4 text-sm text-gray-500 dark:text-slate-400">Belum ada data Luar Kota.</p>
        {:else}
          <div class="mt-4 overflow-x-auto overscroll-x-contain">
            <table class="w-full min-w-max border-separate border-spacing-0 text-left">
              <thead>
                <tr>
                  <th scope="col" class="{TH}">Type TR</th>
                  <th scope="col" class="{TH}">Aging</th>
                  <th scope="col" class="{TH}">Category</th>
                  <th scope="col" class="{TH}">Store</th>
                  <th scope="col" class="{TH}">List TR</th>
                  <th scope="col" class="{TH} {NUM}">Jumlah TR</th>
                  <th scope="col" class="{TH} {NUM}">Qty</th>
                  <th scope="col" class="{TH} {NUM}">Value</th>
                </tr>
              </thead>
              <tbody>
                {#each visLK as n, i (n.key)}
                  {#if n.level === 'type'}
                    <tr class="bg-blue-50/70 dark:bg-blue-950/40">
                      <td class="{TD} font-semibold text-blue-700 dark:text-blue-300">{n.label}</td>
                      <td colspan="4" class="{TD}"></td>
                      <td class="{TD} {NUM} font-semibold text-slate-800 dark:text-slate-100">{fmt(n.tr)}</td>
                      <td class="{TD} {NUM} font-semibold text-slate-800 dark:text-slate-100">{fmt(n.qty)}</td>
                      <td class="{TD} {NUM} font-semibold text-slate-800 dark:text-slate-100">{fmt(n.value)}</td>
                    </tr>
                  {:else}
                    {@render treeRow(n, i, true)}
                  {/if}
                {/each}
                <tr class="bg-gray-50 dark:bg-slate-800/60">
                  <td colspan="5" class="{TD} {TOP} font-bold text-slate-800 dark:text-slate-100">Total</td>
                  <td class="{TD} {TOP} {NUM} font-bold text-slate-800 dark:text-slate-100">{fmt(totLK.tr)}</td>
                  <td class="{TD} {TOP} {NUM} font-bold text-slate-800 dark:text-slate-100">{fmt(totLK.qty)}</td>
                  <td class="{TD} {TOP} {NUM} font-bold text-slate-800 dark:text-slate-100">{fmt(totLK.value)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        {/if}
      </section>
    </div>
  {/if}
</div>
