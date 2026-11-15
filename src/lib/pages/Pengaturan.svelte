<script>
  import { onMount } from 'svelte'
  import Swal from 'sweetalert2'
  import { createAppUser, fetchAppUsers } from '../appUsers.js'
  import { theme, fontSize, notifications } from '../prefs.js'

  // --- Fitur 1: user baru ---
  let email = $state('')
  let password = $state('')
  let saving = $state(false)

  let users = $state([])
  let loadingUsers = $state(true)
  let copiedId = $state('')

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  async function loadUsers() {
    loadingUsers = true
    const { data, error } = await fetchAppUsers()
    loadingUsers = false
    if (error) {
      Swal.fire({ icon: 'error', title: 'Gagal memuat user', text: error.message })
      return
    }
    users = data ?? []
  }

  onMount(loadUsers)

  async function submit(e) {
    e.preventDefault()
    const em = email.trim()
    if (!EMAIL_RE.test(em)) {
      Swal.fire({ icon: 'warning', title: 'Email tidak valid', text: 'Contoh: nama@perusahaan.com' })
      return
    }
    if (password.length < 6) {
      Swal.fire({ icon: 'warning', title: 'Password terlalu pendek', text: 'Minimal 6 karakter.' })
      return
    }
    saving = true
    try {
      const { error } = await createAppUser({ email: em, password })
      if (error) throw error
      Swal.fire({ icon: 'success', title: 'User ditambahkan', timer: 1500, showConfirmButton: false })
      email = ''
      password = ''
      await loadUsers()
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal menambah user', text: err?.message ?? 'Terjadi kesalahan.' })
    } finally {
      saving = false
    }
  }

  function fmtDate(v) {
    if (!v) return '—'
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return String(v)
    return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  }

  async function copyPw(u) {
    try {
      await navigator.clipboard.writeText(u.password)
      copiedId = u.id
      setTimeout(() => (copiedId = ''), 1500)
    } catch {
      Swal.fire({ icon: 'info', title: 'Tidak bisa menyalin', text: 'Salin manual dari tabel.' })
    }
  }

  // --- Fitur 2: preferensi (state dibagi dengan Topbar lewat prefs.js) ---
  const fontOptions = [
    { value: 'sm', label: 'Kecil' },
    { value: 'md', label: 'Sedang' },
    { value: 'lg', label: 'Besar' },
  ]
</script>

<div class="space-y-6">
  <header>
    <h1 class="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Pengaturan</h1>
    <p class="mt-1 text-sm text-gray-500 dark:text-slate-400">Preferensi akun dan tampilan.</p>
  </header>

  <!-- Fitur 1: tambah user + daftar user -->
  <section class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-slate-900 sm:p-6">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">User baru</h2>
        <p class="mt-0.5 text-sm text-gray-500 dark:text-slate-400">Tambah akun login untuk tim.</p>
      </div>
      <span class="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
        {users.length} user
      </span>
    </div>

    <form class="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onsubmit={submit}>
      <div>
        <label for="new-user-email" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
        <input
          id="new-user-email"
          type="email"
          autocomplete="off"
          placeholder="nama@perusahaan.com"
          bind:value={email}
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>
      <div>
        <label for="new-user-password" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
        <input
          id="new-user-password"
          type="password"
          autocomplete="new-password"
          placeholder="Minimal 6 karakter"
          bind:value={password}
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>
      <div class="flex items-end">
        <button
          type="submit"
          disabled={saving}
          class="flex h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700/40 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {#if saving}
            <span class="spinner" aria-hidden="true"></span>
            Menyimpan...
          {:else}
            Tambah User
          {/if}
        </button>
      </div>
    </form>

    <!-- daftar user -->
    <div class="mt-5 overflow-hidden rounded-lg border border-gray-100 dark:border-slate-700/70">
      {#if loadingUsers}
        <div class="flex items-center justify-center gap-2 px-4 py-8 text-sm text-gray-500 dark:text-slate-400">
          <span class="spinner dark" aria-hidden="true"></span>
          Memuat user...
        </div>
      {:else if users.length === 0}
        <div class="px-4 py-8 text-center">
          <p class="font-medium text-slate-700 dark:text-slate-200">Belum ada user</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-slate-400">Tambahkan user pertama lewat form di atas.</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full min-w-[540px] text-left text-sm">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-400">
                <th scope="col" class="px-4 py-2.5">Email</th>
                <th scope="col" class="px-4 py-2.5">Password</th>
                <th scope="col" class="px-4 py-2.5">Dibuat</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-slate-700/70">
              {#each users as u (u.id)}
                <tr class="transition-colors hover:bg-gray-50/80 dark:hover:bg-slate-800/60">
                  <td class="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{u.email}</td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center gap-2">
                      <code class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">{u.password}</code>
                      <button
                        type="button"
                        title="Salin password"
                        aria-label="Salin password {u.email}"
                        onclick={() => copyPw(u)}
                        class="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-700/30 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      >
                        {#if copiedId === u.id}
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-green-600 dark:text-green-400" aria-hidden="true">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        {:else}
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        {/if}
                      </button>
                    </span>
                  </td>
                  <td class="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-slate-400">{fmtDate(u.created_at)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </section>

  <!-- Fitur 2: preferensi tampilan -->
  <section class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-slate-900 sm:p-6">
    <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Tampilan &amp; Preferensi</h2>
    <p class="mt-0.5 text-sm text-gray-500 dark:text-slate-400">Berlaku langsung dan tersimpan di perangkat ini.</p>

    <div class="mt-5 space-y-5">
      <!-- mode -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-medium text-slate-700 dark:text-slate-200">Mode</p>
          <p class="text-xs text-gray-500 dark:text-slate-400">Terang atau gelap.</p>
        </div>
        <div class="flex gap-1 self-start rounded-lg bg-gray-100 p-1 dark:bg-slate-800 sm:self-auto" role="radiogroup" aria-label="Mode tampilan">
          <button
            type="button"
            role="radio"
            aria-checked={$theme === 'light'}
            onclick={() => theme.set('light')}
            class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700/30 {$theme === 'light'
              ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" class="size-4" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
            Light
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={$theme === 'dark'}
            onclick={() => theme.set('dark')}
            class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700/30 {$theme === 'dark'
              ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            Dark
          </button>
        </div>
      </div>

      <!-- ukuran font -->
      <div class="flex flex-col gap-2 border-t border-gray-100 pt-5 dark:border-slate-700/70 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-medium text-slate-700 dark:text-slate-200">Ukuran font</p>
          <p class="text-xs text-gray-500 dark:text-slate-400">Skala teks seluruh aplikasi.</p>
        </div>
        <div class="flex gap-1 self-start rounded-lg bg-gray-100 p-1 dark:bg-slate-800 sm:self-auto" role="radiogroup" aria-label="Ukuran font">
          {#each fontOptions as opt (opt.value)}
            <button
              type="button"
              role="radio"
              aria-checked={$fontSize === opt.value}
              onclick={() => fontSize.set(opt.value)}
              class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700/30 {$fontSize === opt.value
                ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}"
            >
              {opt.label}
            </button>
          {/each}
        </div>
      </div>

      <!-- notifikasi -->
      <div class="flex items-center justify-between gap-4 border-t border-gray-100 pt-5 dark:border-slate-700/70">
        <div>
          <p class="text-sm font-medium text-slate-700 dark:text-slate-200">Notifikasi aplikasi</p>
          <p class="text-xs text-gray-500 dark:text-slate-400">Penanda preferensi saja — sistem notifikasi belum aktif.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={$notifications === '1'}
          aria-label="Notifikasi aplikasi"
          onclick={() => notifications.set($notifications === '1' ? '0' : '1')}
          class="relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700/40 focus:ring-offset-2 dark:focus:ring-offset-slate-900 {$notifications === '1'
            ? 'bg-blue-700'
            : 'bg-gray-300 dark:bg-slate-600'}"
        >
          <span
            class="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200 {$notifications === '1' ? 'translate-x-5' : ''}"
          ></span>
        </button>
      </div>
    </div>
  </section>
</div>

<style>
  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  .spinner.dark {
    border-color: rgba(148, 163, 184, 0.35);
    border-top-color: #64748b;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
