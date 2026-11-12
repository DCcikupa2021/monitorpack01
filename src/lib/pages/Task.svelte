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
      .select('shipment_id, item, description, total_qty')
      .order('created_at', { ascending: false })

    if (err) {
      error = err.message
    } else {
      rows = data ?? []
    }
    loading = false
  })
</script>

<div class="space-y-6">
  <header>
    <h1 class="text-2xl font-semibold tracking-tight text-slate-800">Task</h1>
    <p class="mt-1 text-sm text-gray-500">Daftar task hasil pemrosesan upload.</p>
  </header>

  <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
    {#if loading}
      <p class="text-sm text-gray-500">Memuat data...</p>
    {:else if error}
      <p class="text-sm text-red-600">{error}</p>
    {:else if rows.length === 0}
      <p class="font-medium text-slate-800">Belum ada data</p>
      <p class="mt-1 text-sm text-gray-500">Data akan muncul setelah upload diproses.</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full min-w-max border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">TR</th>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Item No</th>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Item Name</th>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Qty</th>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Aging</th>
            </tr>
          </thead>
          <tbody>
            {#each rows as row, i (i)}
              <tr class="transition-colors odd:bg-white even:bg-gray-50 hover:bg-blue-50/60">
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{fmtTR(row.shipment_id)}</td>
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{row.item}</td>
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{row.description}</td>
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{row.total_qty}</td>
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700"></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
