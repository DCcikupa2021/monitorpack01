<script>
  import { onMount } from 'svelte'
  import { supabase } from '../supabase.js'

  let rows = $state([])
  let loading = $state(true)
  let error = $state('')

  // tampilan saja: PREFIX-SEQ, stem 7 digit, seq = sisanya (leading zero dibuang); raw di DB tidak diubah
  function fmtTR(s) {
    if (!s) return 'blank'
    const m = /^([A-Za-z]+)(\d+)$/.exec(s)
    if (!m) return s
    const digits = m[2]
    if (digits.length <= 7) return s
    return `${m[1]}-${parseInt(digits.slice(7), 10)}`
  }

  onMount(async () => {
    const { data, error: err } = await supabase
      .from('packing_reports')
      .select('shipment_id, to_site_name, total_qty')
      .order('created_at', { ascending: false })

    if (err) {
      error = err.message
    } else {
      // group per TR: Qty = SUM total_qty, Store = to_site_name baris pertama per TR
      const byTr = new Map()
      for (const r of data ?? []) {
        const key = r.shipment_id ?? ''
        const g = byTr.get(key)
        if (g) {
          g.qty += Number(r.total_qty) || 0
        } else {
          byTr.set(key, { shipment_id: r.shipment_id, store: r.to_site_name, qty: Number(r.total_qty) || 0 })
        }
      }
      rows = [...byTr.values()]
    }
    loading = false
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
      <!-- mobile: daftar kartu -->
      <ul class="space-y-3 sm:hidden">
        {#each rows as row, i (i)}
          <li>
            <button
              type="button"
              onclick={() => {
                location.hash = `/task/detail?id=${encodeURIComponent(row.shipment_id ?? '')}`
              }}
              class="w-full rounded-xl border border-gray-100 bg-gray-50 p-4 text-left transition active:scale-[0.98] active:border-blue-200 active:bg-blue-50/70 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-slate-800">{row.store ?? ''}</p>
                  <p class="mt-1.5 inline-flex items-center rounded-md border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                    {fmtTR(row.shipment_id)}
                  </p>
                </div>
                <div class="shrink-0 text-right">
                  <p class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Qty</p>
                  <p class="text-base font-semibold text-slate-800">{row.qty}</p>
                </div>
              </div>
              <div class="mt-3 flex items-center justify-between border-t border-gray-200/70 pt-2.5">
                <span class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Aging</span>
                <span class="text-xs text-gray-300">—</span>
              </div>
            </button>
          </li>
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
            {#each rows as row, i (i)}
              <tr
                class="cursor-pointer select-none transition-colors odd:bg-white even:bg-gray-50 hover:bg-blue-50/60 active:bg-blue-100/70"
                onclick={() => {
                  location.hash = `/task/detail?id=${encodeURIComponent(row.shipment_id ?? '')}`
                }}
              >
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{row.store ?? ''}</td>
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{fmtTR(row.shipment_id)}</td>
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{row.qty}</td>
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700"></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
