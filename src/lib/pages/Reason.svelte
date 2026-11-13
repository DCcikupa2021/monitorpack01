<script>
  import Swal from 'sweetalert2'
  import { deleteReason, fetchReasons } from '../reasons.js'

  let reasons = $state([])
  let loading = $state(true)
  let error = $state('')
  let showDelete = $state(false)

  $effect(() => {
    let cancelled = false
    loading = true
    error = ''
    ;(async () => {
      const { data, error: err } = await fetchReasons()
      if (cancelled) return
      if (err) error = err.message
      else reasons = data
      loading = false
    })()
    return () => {
      cancelled = true
    }
  })

  async function confirmDelete(r) {
    const res = await Swal.fire({
      icon: 'warning',
      title: 'Hapus reason?',
      text: 'Data reason ini akan dihapus permanen.',
      showCancelButton: true,
      confirmButtonText: 'Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626'
    })
    if (!res.isConfirmed) return
    const { error: delErr } = await deleteReason(r.id)
    if (delErr) {
      Swal.fire({ icon: 'error', title: 'Gagal hapus reason', text: delErr.message })
      return
    }
    const { data, error: err } = await fetchReasons()
    if (err) error = err.message
    else reasons = data
    Swal.fire({ icon: 'success', title: 'Reason terhapus', timer: 1500, showConfirmButton: false })
  }
</script>

<div class="space-y-6">
  <header class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight text-slate-800">Reason</h1>
      <p class="mt-1 text-sm text-gray-500">Daftar reason terkait task.</p>
    </div>
    <button
      type="button"
      onclick={() => (showDelete = !showDelete)}
      aria-label={showDelete ? 'Matikan mode hapus' : 'Aktifkan mode hapus'}
      title={showDelete ? 'Matikan mode hapus' : 'Aktifkan mode hapus'}
      class="flex size-8 shrink-0 items-center justify-center rounded-lg border {showDelete ? 'border-red-200 bg-red-50 text-red-600' : 'border-gray-200 bg-white text-gray-400'} transition-colors hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
        <path d="M3 6h18" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
    </button>
  </header>

  <div class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
    {#if loading}
      <p class="text-sm text-gray-500">Memuat data...</p>
    {:else if error}
      <p class="text-sm text-red-600">{error}</p>
    {:else if !reasons.length}
      <div class="rounded-xl border border-gray-100 bg-gray-50 p-8 text-center">
        <span class="mx-auto flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
            <path d="M4 4h16v10l-6 6H4z" />
            <path d="M20 14h-6v6" />
          </svg>
        </span>
        <p class="mt-4 font-medium text-slate-800">Belum ada data</p>
        <p class="mt-1 text-sm text-gray-500">Daftar reason akan muncul di sini.</p>
      </div>
    {:else}
      <div class="overflow-x-auto overscroll-x-contain">
        <table class="w-full min-w-max border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Store</th>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">TR (TR Lengkap)</th>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Type TR</th>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">No Item</th>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Item Name</th>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Qty</th>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">DK/LK</th>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Location</th>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">User</th>
              <th scope="col" class="whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Comment</th>
            </tr>
          </thead>
          <tbody>
            {#each reasons as r, i (r.id)}
              <tr class="transition-colors {i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50/60">
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{r.store ?? ''}</td>
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{r.tr_full ?? r.shipment_id ?? ''}</td>
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{r.type_tr ?? ''}</td>
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{r.no_item ?? ''}</td>
                <td class="border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{r.item_name ?? ''}</td>
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{r.qty ?? ''}</td>
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{r.dk_lk ?? ''}</td>
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{r.location ?? ''}</td>
                <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">{r.user_name ?? ''}</td>
                <td class="border-b border-gray-100 px-3 py-2 text-sm text-gray-700">
                  <div class="flex items-center gap-2">
                    <span>{r.reason || r.comment || ''}</span>
                    {#if showDelete}
                      <button
                        type="button"
                        onclick={() => confirmDelete(r)}
                        aria-label="Hapus reason"
                        title="Hapus reason"
                        class="flex size-7 shrink-0 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-700/30"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
