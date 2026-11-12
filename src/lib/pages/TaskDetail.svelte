<script>
  import { supabase } from '../supabase.js'

  let { id = '', onback = () => {} } = $props()

  let rows = $state([])
  let loading = $state(true)
  let error = $state('')

  $effect(() => {
    let cancelled = false
    loading = true
    error = ''
    ;(async () => {
      if (!id) {
        rows = []
        loading = false
        return
      }
      const { data, error: err } = await supabase
        .from('packing_reports')
        .select(
          'shipment_id, to_site_name, to_site_id, item, description, total_qty, lottable_2, type_tr, comment, wave_number, status1'
        )
        .eq('shipment_id', id)
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (err) error = err.message
      else rows = data ?? []
      loading = false
    })()
    return () => {
      cancelled = true
    }
  })

  let head = $derived(rows[0] ?? null)

  // sub-tabel: baris baru selama item berbeda; kode sama → qty dijumlah
  let items = $derived.by(() => {
    const byItem = new Map()
    for (const r of rows) {
      const key = r.item ?? ''
      const q = Number(r.total_qty) || 0
      const hit = byItem.get(key)
      if (hit) hit.qty += q
      else byItem.set(key, { item: r.item, description: r.description, qty: q })
    }
    return [...byItem.values()]
  })
</script>

<div class="space-y-6">
  <header class="flex flex-wrap items-center gap-3">
    <button
      type="button"
      onclick={onback}
      class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
    >
      ← Kembali ke list
    </button>
    <div>
      <h1 class="text-2xl font-semibold tracking-tight text-slate-800">Detail Task</h1>
      <p class="mt-1 text-sm text-gray-500">{id || '—'}</p>
    </div>
  </header>

  <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
    {#if loading}
      <p class="text-sm text-gray-500">Memuat data...</p>
    {:else if error}
      <p class="text-sm text-red-600">{error}</p>
    {:else if !head}
      <p class="font-medium text-slate-800">Data tidak ditemukan</p>
      <p class="mt-1 text-sm text-gray-500">TR ini tidak ada di packing_reports.</p>
    {:else}
      <!-- field horizontal (kecuali item → sub-tabel) -->
      <dl class="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Aging</dt>
          <dd class="mt-0.5 text-sm text-gray-700"></dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Store</dt>
          <dd class="mt-0.5 text-sm text-gray-700">{head.to_site_name ?? ''}</dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Site Code</dt>
          <dd class="mt-0.5 text-sm text-gray-700">{head.to_site_id ?? ''}</dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">TR</dt>
          <dd class="mt-0.5 text-sm text-gray-700">{head.shipment_id ?? ''}</dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Lotable</dt>
          <dd class="mt-0.5 text-sm text-gray-700">{head.lottable_2 ?? ''}</dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Type TR</dt>
          <dd class="mt-0.5 text-sm text-gray-700">{head.type_tr ?? ''}</dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Comment</dt>
          <dd class="mt-0.5 text-sm text-gray-700">{head.comment ?? ''}</dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">No Wave</dt>
          <dd class="mt-0.5 text-sm text-gray-700">{head.wave_number ?? ''}</dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Status1</dt>
          <dd class="mt-0.5 text-sm text-gray-700">{head.status1 ?? ''}</dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Location</dt>
          <dd class="mt-0.5 text-sm text-gray-700"></dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">User</dt>
          <dd class="mt-0.5 text-sm text-gray-700"></dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Reason</dt>
          <dd class="mt-0.5 text-sm text-gray-700"></dd>
        </div>
      </dl>

      <!-- sub-tabel item -->
      <div class="mt-6 overflow-x-auto">
        <table class="w-full min-w-max border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">No Item</th>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Item Name</th>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Qty</th>
            </tr>
          </thead>
          <tbody>
            {#each items as it, i (i)}
              <tr class="transition-colors odd:bg-white even:bg-gray-50">
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{it.item ?? ''}</td>
                <td class="border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{it.description ?? ''}</td>
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{it.qty}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
