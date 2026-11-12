<script>
  import { supabase } from '../supabase.js'
  import Swal from 'sweetalert2'
  import { fmtAging } from '../aging.js'

  let { id = '', onback = () => {} } = $props()

  let rows = $state([])
  let lookup = $state(null)
  let locRows = $state([])
  let loading = $state(true)
  let error = $state('')
  let now = $state(Date.now())

  $effect(() => {
    const t = setInterval(() => {
      now = Date.now()
    }, 1000)
    return () => clearInterval(t)
  })

  const wibFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  function fmtWib(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const p = Object.fromEntries(wibFmt.formatToParts(d).map((x) => [x.type, x.value]))
    return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`
  }

  function viewNA() {
    Swal.fire({ icon: 'info', title: 'Tidak tersedia', text: 'Mohon upload ulang' })
  }

  $effect(() => {
    let cancelled = false
    loading = true
    error = ''
    ;(async () => {
      if (!id) {
        rows = []
        lookup = null
        locRows = []
        loading = false
        return
      }
      const [pack, look, locs] = await Promise.all([
        supabase
          .from('packing_reports')
          .select(
            'shipment_id, to_site_name, to_site_id, item, description, total_qty, lottable_2, type_tr, comment, wave_number, status1'
          )
          .eq('shipment_id', id)
          .order('created_at', { ascending: false }),
        supabase.from('task_lookup').select('date_pick, user_name').eq('reference_id', id).maybeSingle(),
        supabase.from('task_locations').select('item, locations').eq('reference_id', id)
      ])
      if (cancelled) return
      if (pack.error) error = pack.error.message
      else rows = pack.data ?? []
      lookup = look.data ?? null
      locRows = locs.data ?? []
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
      else byItem.set(key, { item: r.item, description: r.description, qty: q, locations: [] })
    }
    const locByItem = new Map()
    for (const l of locRows) locByItem.set(l.item ?? '', l.locations ?? [])
    for (const it of byItem.values()) it.locations = locByItem.get(it.item ?? '') ?? []
    return [...byItem.values()]
  })
</script>

<div class="space-y-6">
  <header class="flex flex-wrap items-center gap-3">
    <button
      type="button"
      onclick={onback}
      class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 active:scale-95 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
    >
      ← Kembali ke list
    </button>
    <div>
      <h1 class="text-2xl font-semibold tracking-tight text-slate-800">Detail Task</h1>
      <p class="mt-1 text-sm text-gray-500">{id || '—'}</p>
    </div>
  </header>

  <div class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
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
          <dd class="mt-0.5 text-sm text-gray-700">{fmtAging(lookup?.date_pick, now)}</dd>
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
          <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">User</dt>
          <dd class="mt-0.5 text-sm text-gray-700">{lookup?.user_name ?? ''}</dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Reason</dt>
          <dd class="mt-0.5 text-sm text-gray-700"></dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Date Pick</dt>
          <dd class="mt-0.5 text-sm text-gray-700">{fmtWib(lookup?.date_pick)}</dd>
        </div>
      </dl>

      <!-- sub-tabel item: mobile = kartu, sm+ = tabel -->
      <ul class="mt-6 space-y-3 sm:hidden">
        {#each items as it, i (i)}
          {@const locs = it.locations ?? []}
          <li class="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-slate-800">{it.item ?? ''}</p>
                <p class="mt-1 text-sm text-gray-500">{it.description ?? ''}</p>
              </div>
              <span class="shrink-0 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700">{it.qty}</span>
            </div>
            <div class="mt-3 border-t border-gray-100 pt-3">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Location</p>
              {#if locs.length}
                <div class="mt-1.5 flex flex-wrap gap-1.5">
                  {#each locs as loc}
                    <span class="rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600">{loc}</span>
                  {/each}
                </div>
              {:else}
                <button type="button" class="mt-1.5 text-sm text-blue-600 hover:underline" onclick={viewNA}>view</button>
              {/if}
            </div>
          </li>
        {/each}
      </ul>

      <div class="mt-6 hidden overflow-x-auto overscroll-x-contain sm:block">
        <table class="w-full min-w-max border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">No Item</th>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Item Name</th>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Location</th>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Qty</th>
            </tr>
          </thead>
          <tbody>
            {#each items as it, i (i)}
              {@const locs = it.locations ?? []}
              <tr class="transition-colors {i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50/60">
                <td rowspan={locs.length || 1} class="whitespace-nowrap border-b border-gray-100 px-3 py-2 align-top text-sm text-gray-700">{it.item ?? ''}</td>
                <td rowspan={locs.length || 1} class="border-b border-gray-100 px-3 py-2 align-top text-sm text-gray-700">{it.description ?? ''}</td>
                {#if locs.length}
                  <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-700 {locs.length > 1 ? '' : 'border-b border-gray-100'}">{locs[0]}</td>
                {:else}
                  <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm"><button type="button" class="text-blue-600 hover:underline" onclick={viewNA}>view</button></td>
                {/if}
                <td rowspan={locs.length || 1} class="whitespace-nowrap border-b border-gray-100 px-3 py-2 align-top text-sm text-gray-700">{it.qty}</td>
              </tr>
              {#each locs.slice(1) as loc, j}
                <tr class="transition-colors {i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50/60">
                  <td class="whitespace-nowrap py-2 pl-10 pr-3 text-sm text-gray-700 {j === locs.length - 2 ? 'border-b border-gray-100' : ''}">{loc}</td>
                </tr>
              {/each}
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
