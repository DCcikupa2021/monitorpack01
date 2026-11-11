<script>
  import Swal from 'sweetalert2'
  import { parseWorkbook } from '../excel.js'
  import { processUpload } from '../upload.js'

  const KIND_LABEL = {
    packing: 'RP36 Packing Report',
    scale: 'Report Transaction History SCALE',
  }
  const ACCEPT = /\.(xlsx|xls)$/i
  const PREVIEW_CAP = 1000

  let entries = $state([])
  let processing = $state(false)
  let dragging = $state(false)
  let inputEl = $state(null)
  let nextId = 1

  const readyEntries = $derived(entries.filter((e) => e.status === 'ready'))
  const canProcess = $derived(readyEntries.length > 0 && !processing)

  function openPicker() {
    if (processing) return
    inputEl?.click()
  }

  function reset() {
    entries = []
    processing = false
    dragging = false
    if (inputEl) inputEl.value = ''
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList ?? [])
    if (!files.length || processing) return

    const added = files.map((f) => {
      const entry = $state({ id: nextId++, file: f, status: 'parsing', data: null, message: '', expanded: false })
      entries.push(entry)
      return entry
    })

    await Promise.all(added.map((entry) => parseEntry(entry)))

    const ready = entries.filter((e) => e.status === 'ready')
    if (ready.length === 1) ready[0].expanded = true
  }

  async function parseEntry(entry) {
    if (!ACCEPT.test(entry.file.name)) {
      entry.status = 'error'
      entry.message = 'Format file harus .xlsx atau .xls.'
      return
    }
    try {
      entry.data = await parseWorkbook(entry.file)
      entry.status = 'ready'
    } catch (err) {
      entry.status = 'error'
      entry.message = err.message
    }
  }

  function onInputChange(e) {
    // salin dulu: FileList jadi kosong begitu value direset
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // bersihkan supaya file yang sama bisa dipilih ulang
    addFiles(files)
  }

  function onDrop(e) {
    e.preventDefault()
    dragging = false
    addFiles(e.dataTransfer?.files)
  }

  function removeEntry(id) {
    entries = entries.filter((e) => e.id !== id)
  }

  function clearAll() {
    if (processing) return
    reset()
  }

  function togglePreview(entry) {
    entry.expanded = !entry.expanded
  }

  async function proses() {
    if (!canProcess) return
    processing = true
    try {
      const results = await processUpload(readyEntries.map((e) => e.data))
      showProcessSuccess(results)
      reset()
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Proses gagal', text: err.message })
    } finally {
      processing = false
    }
  }

  function showProcessSuccess(results) {
    const lines = results.map(
      (r) => `${KIND_LABEL[r.kind] ?? r.table}: ${r.inserted.toLocaleString('id-ID')} baris`
    )
    Swal.fire({
      icon: 'success',
      title: 'Berhasil',
      html: lines.join('<br>'),
    })
  }

  const isEmpty = (v) => v == null || v === ''
  const cellText = (v) => (v instanceof Date ? v.toLocaleString('id-ID') : String(v))

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function onCardKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPicker()
    }
  }

  function onDragLeave(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return
    dragging = false
  }
</script>

<div class="space-y-6">
  <header>
    <h1 class="text-2xl font-semibold tracking-tight text-slate-800">Upload</h1>
    <p class="mt-1 text-sm text-gray-500">Unggah file Excel untuk diproses.</p>
  </header>

  <input
    id="upload-file-input"
    type="file"
    accept=".xlsx,.xls"
    multiple
    class="hidden"
    bind:this={inputEl}
    onchange={onInputChange}
  />

  <!-- dropzone -->
  <div
    role="button"
    tabindex="0"
    aria-busy={processing}
    onclick={openPicker}
    onkeydown={onCardKeydown}
    ondragenter={(e) => {
      e.preventDefault()
      dragging = true
    }}
    ondragover={(e) => {
      e.preventDefault()
      dragging = true
    }}
    ondragleave={onDragLeave}
    ondrop={onDrop}
    class="cursor-pointer rounded-xl border bg-white p-6 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700/30 {dragging
      ? 'border-blue-600 bg-blue-50/60'
      : 'border-gray-100'}"
  >
    <div class="flex flex-col items-center justify-center gap-3 py-2 text-center">
      <span class="flex size-11 items-center justify-center rounded-full bg-blue-50 text-blue-700">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-5"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M17 8l-5-5-5 5" />
          <path d="M12 3v12" />
        </svg>
      </span>
      <div>
        <p class="text-sm font-medium text-slate-700">
          {dragging ? 'Lepaskan file di sini' : 'Tarik file ke sini atau klik untuk memilih file'}
        </p>
        <p class="mt-1 text-xs text-gray-500">Format: .xlsx atau .xls — boleh lebih dari satu file</p>
      </div>
    </div>
  </div>

  <!-- daftar file -->
  {#if entries.length > 0}
    <section class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p class="text-sm font-medium text-slate-700">{entries.length} file</p>
        <button
          type="button"
          onclick={clearAll}
          disabled={processing}
          class="text-xs font-medium text-gray-500 transition-colors hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-700/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Bersihkan semua
        </button>
      </div>

      <ul class="mt-4 divide-y divide-gray-100">
        {#each entries as entry (entry.id)}
          <li class="py-4 first:pt-0 last:pb-0">
            <div class="flex items-center gap-3">
              <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="size-5"
                  aria-hidden="true"
                >
                  <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                  <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                </svg>
              </span>

              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-slate-800">{entry.file.name}</p>

                {#if entry.status === 'parsing'}
                  <p class="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                    <span
                      class="size-3 animate-spin rounded-full border-2 border-current border-t-transparent text-blue-700"
                      aria-hidden="true"
                    ></span>
                    Membaca file…
                  </p>
                {:else if entry.status === 'error'}
                  <p class="mt-0.5 text-xs text-gray-500">{formatSize(entry.file.size)}</p>
                  <p class="mt-1 text-xs text-red-600">{entry.message}</p>
                {:else}
                  <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span class="text-xs text-gray-500">{formatSize(entry.file.size)}</span>
                    <span
                      class="inline-flex items-center rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                    >
                      {KIND_LABEL[entry.data.kind] ?? entry.data.kind}
                    </span>
                    <span class="text-xs text-gray-500">
                      {entry.data.rows.length.toLocaleString('id-ID')} baris · {entry.data.headers.length} kolom
                    </span>
                  </div>
                {/if}
              </div>

              {#if entry.status === 'ready'}
                <button
                  type="button"
                  onclick={() => togglePreview(entry)}
                  aria-expanded={entry.expanded}
                  class="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                >
                  {entry.expanded ? 'Sembunyikan' : 'Pratinjau'}
                </button>
              {/if}

              <button
                type="button"
                onclick={() => removeEntry(entry.id)}
                disabled={processing}
                aria-label="Hapus file"
                title="Hapus file"
                class="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-700/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="size-4" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {#if entry.status === 'ready' && entry.expanded}
              <div class="mt-3 pl-[52px]">
                <div class="max-h-56 overflow-auto rounded-lg border border-gray-100">
                  <table class="w-full min-w-max border-separate border-spacing-0 text-left">
                    <thead>
                      <tr>
                        {#each entry.data.headers as h}
                          <th
                            scope="col"
                            class="sticky top-0 z-10 whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500"
                          >
                            {h}
                          </th>
                        {/each}
                      </tr>
                    </thead>
                    <tbody>
                      {#each entry.data.rows.slice(0, PREVIEW_CAP) as row}
                        <tr class="transition-colors odd:bg-white even:bg-gray-50 hover:bg-blue-50/60">
                          {#each entry.data.headers as h}
                            <td class="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700">
                              {#if isEmpty(row[h])}
                                <span class="text-gray-300">—</span>
                              {:else}
                                {cellText(row[h])}
                              {/if}
                            </td>
                          {/each}
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>

                {#if entry.data.rows.length > PREVIEW_CAP}
                  <p class="mt-2 text-xs text-gray-500">
                    Preview menampilkan 1.000 baris pertama dari {entry.data.rows.length.toLocaleString('id-ID')} baris —
                    semua baris tetap diproses.
                  </p>
                {/if}
              </div>
            {/if}
          </li>
        {/each}
      </ul>

      <div class="mt-5 border-t border-gray-100 pt-4">
        <p class="text-xs text-gray-500">
          Proses akan menimpa seluruh data lama di Supabase dengan data dari file yang diproses.
        </p>
        <div class="mt-3 flex justify-end">
          <button
            type="button"
            disabled={!canProcess}
            onclick={proses}
            class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700/40 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {#if processing}
              <span
                class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              ></span>
              Memproses…
            {:else}
              Proses
            {/if}
          </button>
        </div>
      </div>
    </section>
  {/if}
</div>
