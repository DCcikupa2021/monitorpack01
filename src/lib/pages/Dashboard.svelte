<script>
  let { email = '' } = $props()
</script>

<div class="space-y-6">
  <header>
    <h1 class="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Dashboard</h1>
    <p class="mt-1 text-sm text-gray-500 dark:text-slate-400">Ringkasan aktivitas monitoring Pack01.</p>
  </header>

  <div class="rounded-xl border border-gray-100 bg-gradient-to-br from-white via-white to-blue-50/60 p-5 shadow-sm dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40">
    <p class="text-sm text-gray-600 dark:text-slate-300">
      Selamat datang, <span class="font-medium text-slate-800 dark:text-slate-100">{email}</span>.
    </p>
  </div>

  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-900 dark:hover:border-blue-900/60">
      <p class="text-sm text-gray-500 dark:text-slate-400">Task</p>
      <p class="mt-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">—</p>
      <p class="mt-1 text-xs text-gray-400 dark:text-slate-500">Belum ada data</p>
    </div>
    <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-900 dark:hover:border-blue-900/60">
      <p class="text-sm text-gray-500 dark:text-slate-400">Reason</p>
      <p class="mt-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">—</p>
      <p class="mt-1 text-xs text-gray-400 dark:text-slate-500">Belum ada data</p>
    </div>
    <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-900 dark:hover:border-blue-900/60">
      <p class="text-sm text-gray-500 dark:text-slate-400">Upload terakhir</p>
      <p class="mt-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">—</p>
      <p class="mt-1 text-xs text-gray-400 dark:text-slate-500">Belum ada upload</p>
    </div>
  </div>
</div>
