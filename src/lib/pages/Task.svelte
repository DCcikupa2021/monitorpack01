<script>
  import { onMount, onDestroy } from 'svelte'
  import { supabase } from '../supabase.js'
  import { fmtAging } from '../aging.js'
  import { taskFilterState } from '../taskFilterState.js'
  import { buildTaskExport, downloadTaskCsv, downloadTaskXlsx } from '../exportTasks.js'
  import Swal from 'sweetalert2'

  let rows = $state([])
  let loading = $state(true)
  let error = $state('')
  let qs = $state(['']) // tiap input pencarian; elemen 0 tidak bisa dihapus
  let filterOpen = $state(false)
  let openSec = $state('type_tr')
  let selTypeTr = $state([])
  let selDklk = $state([])
  let selKirim = $state([])
  let showNoPick = $state(false)
  let now = $state(Date.now())

  // tampilan saja: PREFIX-SEQ, stem 7 digit, seq = sisanya (leading zero dibuang); raw di DB tidak diubah
  function fmtTR(s) {
    if (!s) return 'blank'
    const m = /^([A-Za-z]+)(\d+)$/.exec(s)
    if (!m) return s
    const digits = m[2]
    if (digits.length <= 7) return s
    return `${m[1]}-${parseInt(digits.slice(7), 10)}`
  }

  function viewHistory() {
    Swal.fire({ icon: 'info', title: 'Info', text: 'Update History Transaction' })
  }

  // teks pencarian per baris: semua field (termasuk kolom detail), case-insensitive substring
  function hay(r) {
    return [
      r.store,
      r.shipment_id,
      fmtTR(r.shipment_id),
      r.qty,
      fmtAging(r.date_pick, now),
      r.status1,
      r.wave_number,
      r.comment,
      r.type_tr,
      r.lottable_2,
      r.to_site_id,
      r.user_name,
      (r.items ?? []).join(' '),
      (r.descs ?? []).join(' ')
    ]
      .map((v) => v ?? '')
      .join(' ')
      .toLowerCase()
  }

  // filter popup: 3 section; OR dalam section, AND antar section, section tanpa toggle aktif = diabaikan
  const filterSections = [
    { key: 'type_tr', label: 'Type TR' },
    { key: 'dk_lk', label: 'DK/LK' },
    { key: 'type_kirim', label: 'Type Kirim' }
  ]

  function optsFor(key) {
    if (key === 'type_tr') return typeTrOpts
    if (key === 'dk_lk') return dklkOpts
    return kirimOpts
  }

  function selOf(key) {
    if (key === 'type_tr') return selTypeTr
    if (key === 'dk_lk') return selDklk
    return selKirim
  }

  function toggleVal(key, v) {
    const cur = selOf(key)
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]
    if (key === 'type_tr') selTypeTr = next
    else if (key === 'dk_lk') selDklk = next
    else selKirim = next
  }

  function resetFilters() {
    selTypeTr = []
    selDklk = []
    selKirim = []
  }

  function addTerm() {
    qs = [...qs, '']
  }

  function removeTerm(i) {
    if (qs.length > 1) qs = qs.filter((_, idx) => idx !== i)
  }

  // export dialog
  let exportOpen = $state(false)
  let exportFmt = $state('csv')
  let exportRows = $state(null) // null = belum dimuat
  let exportLoading = $state(false)
  let exportErr = $state('')

  async function openExport() {
    exportOpen = true
    exportErr = ''
    exportRows = null
    exportLoading = true
    try {
      exportRows = await buildTaskExport()
    } catch (e) {
      exportErr = e?.message ?? 'Gagal memuat data'
    } finally {
      exportLoading = false
    }
  }

  async function runExport() {
    Swal.fire({
      title: 'Menyiapkan export...',
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
      allowEscapeKey: false
    })
    try {
      const rows = await buildTaskExport()
      if (!rows.length) {
        await Swal.fire({ icon: 'info', title: 'Tidak ada data', text: 'Belum ada task untuk diexport.' })
        return
      }
      if (exportFmt === 'xlsx') downloadTaskXlsx(rows)
      else downloadTaskCsv(rows)
      exportOpen = false
      await Swal.fire({ icon: 'success', title: 'Export berhasil', text: `${rows.length} baris diexport.` })
    } catch (e) {
      await Swal.fire({ icon: 'error', title: 'Export gagal', text: e?.message ?? 'Terjadi kesalahan' })
    }
  }

  onMount(async () => {
    const pack = await supabase
      .from('packing_reports')
      .select(
        'shipment_id, to_site_name, total_qty, status1, wave_number, comment, type_tr, lottable_2, to_site_id, item, description'
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
      ? await supabase.from('task_lookup').select('reference_id, user_name, date_pick').in('reference_id', keys)
      : { data: [], error: null }

    if (look.error) {
      error = look.error.message
      loading = false
      return
    }

    // vlookup mtrx-store sekali: DK/LK + Type Kirim, join via to_site_id → Code Site
    const sites = await supabase.from('mtrx-store').select('"Code Site", "DK/LK", "Type Kirim"')
    if (sites.error) {
      error = sites.error.message
      loading = false
      return
    }
    const siteByCode = new Map()
    for (const s of sites.data ?? []) siteByCode.set(String(s['Code Site']), s)

    // lookup sekali: user_name + date_pick (buat aging) di-merge per TR
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
          comment: r.comment,
          type_tr: r.type_tr,
          lottable_2: r.lottable_2,
          to_site_id: r.to_site_id,
          items: [],
          descs: []
        })
      }
      // kumpulin item no + item name (dedupe) buat search
      const g2 = byTr.get(key)
      if (r.item && !g2.items.includes(r.item)) g2.items.push(r.item)
      if (r.description && !g2.descs.includes(r.description)) g2.descs.push(r.description)
    }
    for (const [key, g] of byTr) {
      const l = lookByTr.get(key)
      if (l) {
        g.user_name = l.user_name
        g.date_pick = l.date_pick
      }
      const st = siteByCode.get(String(g.to_site_id ?? ''))
      g.dk_lk = st?.['DK/LK'] ?? ''
      g.type_kirim = st?.['Type Kirim'] ?? ''
    }
    rows = [...byTr.values()]
    loading = false
  })

  // aging live tick
  $effect(() => {
    const t = setInterval(() => {
      now = Date.now()
    }, 1000)
    return () => clearInterval(t)
  })

  // nilai distinct per section filter + badge jumlah filter aktif
  let typeTrOpts = $derived([...new Set(rows.map((r) => r.type_tr ?? '').filter(Boolean))].sort())
  let dklkOpts = $derived([...new Set(rows.map((r) => r.dk_lk ?? '').filter(Boolean))].sort())
  let kirimOpts = $derived([...new Set(rows.map((r) => r.type_kirim ?? '').filter(Boolean))].sort())
  let activeFilterCount = $derived(selTypeTr.length + selDklk.length + selKirim.length)
  let searchLabel = $derived(qs.map((t) => t.trim()).filter(Boolean).join(' '))

  // hasil filter + search saja (tanpa group); dipakai view dan disinkronkan ke export
  let matched = $derived.by(() => {
    // tiap input = AND; input kosong diabaikan
    const terms = qs.map((t) => t.trim().toLowerCase()).filter(Boolean)
    return rows.filter((r) => {
      if (terms.length) {
        const h = hay(r)
        if (!terms.every((t) => h.includes(t))) return false
      }
      if (selTypeTr.length && !selTypeTr.includes(r.type_tr ?? '')) return false
      if (selDklk.length && !selDklk.includes(r.dk_lk ?? '')) return false
      if (selKirim.length && !selKirim.includes(r.type_kirim ?? '')) return false
      return true
    })
  })

  // urut: tanpa aging di atas (header group, default collapse), lalu date_pick ascending (terlama dulu)
  let view = $derived.by(() => {
    const noPick = matched.filter((r) => !r.date_pick)
    const aged = matched
      .filter((r) => r.date_pick)
      .sort((a, b) => Date.parse(a.date_pick) - Date.parse(b.date_pick))
    const out = []
    if (noPick.length) out.push({ kind: 'group', count: noPick.length })
    if (showNoPick) for (const r of noPick) out.push({ kind: 'item', row: r })
    for (const r of aged) out.push({ kind: 'item', row: r })
    return out
  })

  // export ikut filter + search aktif; selama loading/error jangan timpa (bikin export kosong)
  $effect(() => {
    if (loading || error) return
    taskFilterState.visibleIds = new Set(matched.map((r) => r.shipment_id ?? ''))
  })

  onDestroy(() => {
    taskFilterState.visibleIds = null
  })
</script>

<div class="space-y-6">
  <header>
    <h1 class="text-2xl font-semibold tracking-tight text-slate-800">Task</h1>
    <p class="mt-1 text-sm text-gray-500">Daftar task hasil pemrosesan upload.</p>
  </header>

  <div class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
    {#if loading}
      <p class="text-sm text-gray-500">Memuat data...</p>
    {:else if error}
      <p class="text-sm text-red-600">{error}</p>
    {:else if rows.length === 0}
      <p class="font-medium text-slate-800">Belum ada data</p>
      <p class="mt-1 text-sm text-gray-500">Data akan muncul setelah upload diproses.</p>
    {:else}
      <!-- search realtime + filter popup -->
      <div class="relative mb-4">
        <div class="flex items-start gap-2">
          <div class="min-w-0 flex-1 space-y-2">
            {#each qs as term, i (i)}
              <div class="flex items-center gap-2">
                <input
                  type="search"
                  bind:value={qs[i]}
                  placeholder="Cari..."
                  aria-label="Cari task"
                  class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-gray-400 transition focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-700/30 sm:max-w-sm"
                />
                {#if i > 0}
                  <button
                    type="button"
                    onclick={() => removeTerm(i)}
                    aria-label="Hapus kolom pencarian"
                    class="shrink-0 rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="size-4"
                      aria-hidden="true"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                {/if}
              </div>
            {/each}
          </div>
          <button
            type="button"
            onclick={addTerm}
            aria-label="Tambah kolom pencarian"
            class="shrink-0 rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="size-4"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            type="button"
            onclick={() => (filterOpen = !filterOpen)}
            aria-label="Filter"
            aria-expanded={filterOpen}
            class="relative shrink-0 rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="size-4"
              aria-hidden="true"
            >
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
            {#if activeFilterCount > 0}
              <span
                class="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-none text-white"
                >{activeFilterCount}</span
              >
            {/if}
          </button>
          {#if activeFilterCount > 0}
            <button
              type="button"
              onclick={() => {
                resetFilters()
                filterOpen = false
              }}
              aria-label="Reset filter"
              class="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
            >
              Reset filter
            </button>
          {/if}
          <button
            type="button"
            onclick={openExport}
            aria-label="Export"
            title="Export"
            class="shrink-0 rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="size-4"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <path d="M12 15V3" />
            </svg>
          </button>
        </div>

        {#if filterOpen}
          <!-- backdrop: klik di luar popup menutup -->
          <div class="fixed inset-0 z-20" aria-hidden="true" onclick={() => (filterOpen = false)}></div>
          <div
            class="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
            role="dialog"
            aria-label="Filter"
          >
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold text-slate-800">Filter</p>
              <button
                type="button"
                onclick={() => (filterOpen = false)}
                aria-label="Tutup filter"
                class="rounded p-1 text-gray-400 transition hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="size-4"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              onclick={resetFilters}
              class="mt-1 rounded text-xs font-medium text-blue-600 transition hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-700/30"
            >
              Reset
            </button>

            {#each filterSections as sec (sec.key)}
              <div class="mt-2 border-t border-gray-100 pt-2">
                <button
                  type="button"
                  onclick={() => (openSec = openSec === sec.key ? null : sec.key)}
                  aria-expanded={openSec === sec.key}
                  class="flex w-full items-center justify-between gap-2 rounded px-1 py-1 text-sm font-medium text-slate-700 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                >
                  <span>{sec.label}</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="size-4 shrink-0 transition-transform {openSec === sec.key ? 'rotate-180' : ''}"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {#if openSec === sec.key}
                  <div class="mt-1.5 space-y-1.5 pl-1">
                    {#each optsFor(sec.key) as opt (opt)}
                      <label
                        class="flex cursor-pointer items-center justify-between gap-3 rounded px-1 py-0.5 transition hover:bg-gray-50"
                      >
                        <span class="min-w-0 truncate text-sm text-gray-700">{opt}</span>
                        <input
                          type="checkbox"
                          class="peer sr-only"
                          checked={selOf(sec.key).includes(opt)}
                          onchange={() => toggleVal(sec.key, opt)}
                        />
                        <span
                          class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-gray-200 transition-colors peer-checked:bg-blue-600 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:content-[''] peer-checked:after:translate-x-4"
                          aria-hidden="true"
                        ></span>
                      </label>
                    {/each}
                    {#if optsFor(sec.key).length === 0}
                      <p class="px-1 text-xs text-gray-400">Tidak ada data</p>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      {#if view.length === 0}
        {#if searchLabel}
          <p class="text-sm text-gray-500">Tidak ada hasil untuk "{searchLabel}".</p>
        {:else}
          <p class="text-sm text-gray-500">Tidak ada hasil.</p>
        {/if}
      {:else}
        <!-- mobile: daftar kartu -->
        <ul class="space-y-3 sm:hidden">
          {#each view as entry, i (i)}
            {#if entry.kind === 'group'}
              <li
                class="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5"
              >
                <button
                  type="button"
                  onclick={() => (showNoPick = !showNoPick)}
                  aria-expanded={showNoPick}
                  class="flex min-w-0 items-center gap-2 rounded px-1 py-0.5 text-sm font-medium text-blue-700 transition-colors hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="size-4 shrink-0 transition-transform {showNoPick ? 'rotate-180' : ''}"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                  <span class="truncate">{entry.count} task tanpa aging</span>
                </button>
                {#if !showNoPick}
                  <button
                    type="button"
                    onclick={viewHistory}
                    class="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                  >
                    View
                  </button>
                {/if}
              </li>
            {:else}
              <li>
                <button
                  type="button"
                  onclick={() => {
                    location.hash = `/task/detail?id=${encodeURIComponent(entry.row.shipment_id ?? '')}`
                  }}
                  class="w-full rounded-xl border border-gray-100 bg-gray-50 p-4 text-left transition active:scale-[0.98] active:border-blue-200 active:bg-blue-50/70 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-semibold text-slate-800">{entry.row.store ?? ''}</p>
                      <p class="mt-1.5 inline-flex items-center rounded-md border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                        {fmtTR(entry.row.shipment_id)}
                      </p>
                    </div>
                    <div class="shrink-0 text-right">
                      <p class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Qty</p>
                      <p class="text-base font-semibold text-slate-800">{entry.row.qty}</p>
                    </div>
                  </div>
                  <div class="mt-3 flex items-center justify-between gap-3 border-t border-gray-200/70 pt-2.5">
                    <span class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Aging</span>
                    <span class="min-w-0 text-right text-xs {entry.row.date_pick ? 'text-gray-600' : 'text-gray-300'}"
                      >{fmtAging(entry.row.date_pick, now) || '—'}</span
                    >
                  </div>
                </button>
              </li>
            {/if}
          {/each}
        </ul>

        <!-- sm+: tabel -->
        <div class="hidden overflow-x-auto overscroll-x-contain sm:block">
          <table class="w-full min-w-max border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Store</th>
                <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">TR</th>
                <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Qty</th>
                <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Aging</th>
              </tr>
            </thead>
            <tbody>
              {#each view as entry, i (i)}
                {#if entry.kind === 'group'}
                  <tr class="bg-blue-50/70">
                    <td colspan="4" class="border-b border-gray-100 px-3 py-2">
                      <div class="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onclick={() => (showNoPick = !showNoPick)}
                          aria-expanded={showNoPick}
                          class="flex items-center gap-2 rounded px-1 py-0.5 text-sm font-medium text-blue-700 transition-colors hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="size-4 shrink-0 transition-transform {showNoPick ? 'rotate-180' : ''}"
                            aria-hidden="true"
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                          {entry.count} task tanpa aging
                        </button>
                        {#if !showNoPick}
                          <button
                            type="button"
                            onclick={viewHistory}
                            class="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                          >
                            View
                          </button>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {:else}
                  <tr
                    class="cursor-pointer select-none transition-colors {i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50/60 active:bg-blue-100/70"
                    onclick={() => {
                      location.hash = `/task/detail?id=${encodeURIComponent(entry.row.shipment_id ?? '')}`
                    }}
                  >
                    <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{entry.row.store ?? ''}</td>
                    <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{fmtTR(entry.row.shipment_id)}</td>
                    <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{entry.row.qty}</td>
                    <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm {entry.row.date_pick ? 'text-gray-700' : 'text-gray-300'}">{fmtAging(entry.row.date_pick, now) || '—'}</td>
                  </tr>
                {/if}
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- export dialog -->
{#if exportOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      type="button"
      aria-label="Tutup dialog"
      onclick={() => (exportOpen = false)}
      class="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
    ></button>
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-title"
      class="relative w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl"
    >
      <h2 id="export-title" class="text-sm font-semibold text-slate-800">Export Task</h2>

      <fieldset class="mt-4">
        <legend class="text-xs font-medium uppercase tracking-wide text-gray-500">Format</legend>
        <div class="mt-2 flex gap-2">
          {#each ['csv', 'xlsx'] as f (f)}
            <label
              class="flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium transition focus-within:ring-2 focus-within:ring-blue-700/30 {exportFmt === f
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}"
            >
              <input type="radio" name="task-export-format" value={f} bind:group={exportFmt} class="sr-only" />
              .{f}
            </label>
          {/each}
        </div>
      </fieldset>

      <p class="mt-4 text-xs text-gray-500">
        {#if exportLoading}
          Memuat data...
        {:else if exportErr}
          <span class="text-red-600">{exportErr}</span>
        {:else}
          {exportRows?.length ?? 0} baris siap diexport
        {/if}
      </p>

      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onclick={() => (exportOpen = false)}
          class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
        >
          Batal
        </button>
        <button
          type="button"
          onclick={runExport}
          disabled={exportLoading || !!exportErr || !exportRows?.length}
          class="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-800 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-700/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Export
        </button>
      </div>
    </div>
  </div>
{/if}
