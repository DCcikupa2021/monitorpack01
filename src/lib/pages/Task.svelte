<script>
  import { onMount } from 'svelte'
  import { supabase } from '../supabase.js'
  import { fmtAging } from '../aging.js'
  import Swal from 'sweetalert2'

  let rows = $state([])
  let loading = $state(true)
  let error = $state('')
  let q = $state('')
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
      r.user_name
    ]
      .map((v) => v ?? '')
      .join(' ')
      .toLowerCase()
  }

  onMount(async () => {
    const [pack, look] = await Promise.all([
      supabase
        .from('packing_reports')
        .select(
          'shipment_id, to_site_name, total_qty, status1, wave_number, comment, type_tr, lottable_2, to_site_id'
        )
        .order('created_at', { ascending: false }),
      supabase.from('task_lookup').select('reference_id, user_name, date_pick')
    ])

    if (pack.error) {
      error = pack.error.message
    } else {
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
            to_site_id: r.to_site_id
          })
        }
      }
      for (const [key, g] of byTr) {
        const l = lookByTr.get(key)
        if (l) {
          g.user_name = l.user_name
          g.date_pick = l.date_pick
        }
      }
      rows = [...byTr.values()]
    }
    loading = false
  })

  // aging live tick
  $effect(() => {
    const t = setInterval(() => {
      now = Date.now()
    }, 1000)
    return () => clearInterval(t)
  })

  // urut: tanpa aging di atas (header group, default collapse), lalu date_pick ascending (terlama dulu)
  let view = $derived.by(() => {
    const needle = q.trim().toLowerCase()
    const matched = needle ? rows.filter((r) => hay(r).includes(needle)) : rows
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
      <!-- search realtime -->
      <div class="mb-4">
        <input
          type="search"
          bind:value={q}
          placeholder="Cari..."
          aria-label="Cari task"
          class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-gray-400 transition focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-700/30 sm:max-w-sm"
        />
      </div>

      {#if view.length === 0}
        <p class="text-sm text-gray-500">Tidak ada hasil untuk "{q.trim()}".</p>
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
