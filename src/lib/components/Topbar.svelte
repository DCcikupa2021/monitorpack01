<script>
  import { fade, scale } from 'svelte/transition'
  import { theme } from '../prefs.js'

  let { email = '', onmenu = null } = $props()

  let open = $state(false)

  const initial = $derived(email.trim().charAt(0).toUpperCase() || '?')

  function setTheme(v) {
    theme.set(v)
  }

  function onKeydown(e) {
    if (e.key === 'Escape') open = false
  }
</script>

<svelte:window onkeydown={onKeydown} />

<header
  class="sticky top-0 z-40 flex h-14 w-full items-center justify-between gap-3 border-b border-white/10 bg-[#0f172a] px-3 sm:px-4"
>
  <!-- kiri: hamburger mobile + brand -->
  <div class="flex min-w-0 items-center gap-2">
    {#if onmenu}
      <button
        type="button"
        aria-label="Buka menu"
        aria-controls="app-sidebar"
        aria-expanded="false"
        onclick={onmenu}
        class="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 md:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" class="size-5" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
    {/if}
    <a href="#/" class="flex shrink-0 items-baseline gap-0.5 select-none" aria-label="Mitra10 DC Cikupa">
      <span class="text-[15px] font-bold tracking-tight text-white sm:text-base">Mitra<span class="text-red-500">10</span></span>
      <span class="text-xs font-normal text-slate-300 sm:text-[13px]">DC Cikupa</span>
    </a>
  </div>

  <!-- kanan: ikon + avatar -->
  <div class="flex items-center gap-1 sm:gap-2">
    <button
      type="button"
      aria-label="Notifikasi"
      class="hidden size-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 sm:flex"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="size-[18px]" aria-hidden="true">
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    </button>
    <button
      type="button"
      aria-label="Pesan"
      class="hidden size-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 sm:flex"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="size-[18px]" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
    <button
      type="button"
      aria-label="Bantuan"
      class="hidden size-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 sm:flex"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="size-[18px]" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </svg>
    </button>

    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onclick={() => (open = !open)}
      class="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400/50 sm:pr-2"
    >
      <span
        class="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white ring-2 ring-white/25"
        aria-hidden="true">{initial}</span
      >
      <span class="hidden max-w-[150px] truncate text-sm text-slate-200 sm:block lg:max-w-[240px]" title={email}>{email}</span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="size-4 shrink-0 text-slate-400 transition-transform duration-200 {open ? 'rotate-180' : ''}"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  </div>
</header>

{#if open}
  <!-- klik di luar dropdown untuk menutup -->
  <button
    type="button"
    aria-label="Tutup menu akun"
    onclick={() => (open = false)}
    class="fixed inset-0 z-30 cursor-default"
  ></button>

  <div
    role="menu"
    class="fixed right-2 top-[60px] z-50 w-72 origin-top-right overflow-hidden rounded-xl border border-gray-200 bg-white p-2 shadow-2xl shadow-slate-900/20 dark:border-slate-700 dark:bg-slate-800"
    in:scale={{ duration: 150, start: 0.96 }}
    out:fade={{ duration: 100 }}
  >
    <div class="border-b border-gray-100 px-2 pb-2 dark:border-slate-700">
      <p class="truncate text-sm font-medium text-slate-800 dark:text-slate-100" title={email}>{email}</p>
      <p class="mt-0.5 text-xs text-gray-500 dark:text-slate-400">Masuk sebagai pengguna</p>
    </div>

    <div class="mt-2 px-1 pb-1">
      <p class="px-1 pb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">Mode tampilan</p>
      <div class="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-slate-900" role="radiogroup" aria-label="Mode tampilan">
        <button
          type="button"
          role="radio"
          aria-checked={$theme === 'light'}
          onclick={() => setTheme('light')}
          class="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700/30 {$theme === 'light'
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
          onclick={() => setTheme('dark')}
          class="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700/30 {$theme === 'dark'
            ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white'
            : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          Dark
        </button>
      </div>
      <p class="mt-1.5 px-1 text-xs text-gray-500 dark:text-slate-400">Tersimpan otomatis di perangkat ini.</p>
    </div>
  </div>
{/if}
