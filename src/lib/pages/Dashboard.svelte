<script>
  let { email = '' } = $props()
</script>

<div class="space-y-6">
  <header>
    <h1 class="text-2xl font-semibold tracking-tight text-slate-800">Dashboard</h1>
    <p class="mt-1 text-sm text-gray-500">Ringkasan aktivitas monitoring Pack01.</p>
  </header>

  <div class="rounded-xl border border-gray-100 bg-gradient-to-br from-white via-white to-blue-50/60 p-5 shadow-sm">
    <p class="text-sm text-gray-600">
      Selamat datang, <span class="font-medium text-slate-800">{email}</span>.
    </p>
  </div>

  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md">
      <p class="text-sm text-gray-500">Task</p>
      <p class="mt-2 text-2xl font-semibold text-slate-800">—</p>
      <p class="mt-1 text-xs text-gray-400">Belum ada data</p>
    </div>
    <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md">
      <p class="text-sm text-gray-500">Reason</p>
      <p class="mt-2 text-2xl font-semibold text-slate-800">—</p>
      <p class="mt-1 text-xs text-gray-400">Belum ada data</p>
    </div>
    <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md">
      <p class="text-sm text-gray-500">Upload terakhir</p>
      <p class="mt-2 text-2xl font-semibold text-slate-800">—</p>
      <p class="mt-1 text-xs text-gray-400">Belum ada upload</p>
    </div>
  </div>
</div>
