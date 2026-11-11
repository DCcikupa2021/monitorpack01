<script>
  import { supabase } from './supabase.js'

  let { page = $bindable('dashboard'), email = '' } = $props()

  const KEY = 'pack01_sidebar'
  const initialExpanded = localStorage.getItem(KEY) !== '0'
  let expanded = $state(initialExpanded)

  // set before first paint so main's margin matches saved state (no jump)
  document.documentElement.style.setProperty('--sidebar-w', initialExpanded ? '240px' : '72px')

  $effect(() => {
    document.documentElement.style.setProperty('--sidebar-w', expanded ? '240px' : '72px')
    localStorage.setItem(KEY, expanded ? '1' : '0')
  })

  const items = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    },
    {
      id: 'upload',
      label: 'Upload',
      icon: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
    },
    {
      id: 'task',
      label: 'Task',
      icon: '<path d="M9 6h12"/><path d="M9 12h12"/><path d="M9 18h12"/><path d="M4 6h.01"/><path d="M4 12h.01"/><path d="M4 18h.01"/>',
    },
    {
      id: 'reason',
      label: 'Reason',
      icon: '<path d="M4 4h16v10l-6 6H4z"/><path d="M20 14h-6v6"/>',
    },
    {
      id: 'pengaturan',
      label: 'Pengaturan',
      icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    },
  ]

  async function logout() {
    await supabase.auth.signOut()
  }
</script>

<aside
  class="fixed inset-y-0 left-0 z-30 flex flex-col border-r border-gray-200 bg-white transition-[width] duration-200 ease-out {expanded
    ? 'w-60'
    : 'w-[72px]'}"
>
  <!-- top: hamburger + brand -->
  <div class="flex items-center gap-2 px-3 py-4 {expanded ? '' : 'flex-col gap-3 px-2'}">
    <button
      type="button"
      aria-label={expanded ? 'Tutup menu' : 'Buka menu'}
      onclick={() => (expanded = !expanded)}
      class="relative size-8 shrink-0 rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-700/30 {expanded
        ? 'open'
        : ''}"
    >
      <span class="bar bar-1"></span>
      <span class="bar bar-2"></span>
      <span class="bar bar-3"></span>
    </button>
    {#if expanded}
      <span class="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-700 text-xs font-bold text-white">P</span>
      <span class="truncate text-sm font-semibold text-slate-700">Monitoring Pack01</span>
    {:else}
      <span class="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-700 text-xs font-bold text-white">P</span>
    {/if}
  </div>

  <!-- nav -->
  <nav class="mt-2 flex-1 space-y-1 overflow-y-auto px-3 {expanded ? '' : 'px-2'}">
    {#each items as item (item.id)}
      <button
        type="button"
        title={expanded ? undefined : item.label}
        onclick={() => (page = item.id)}
        class="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700/30 {expanded
          ? ''
          : 'justify-center'} {page === item.id
          ? 'bg-blue-700 text-white shadow-sm'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-5 shrink-0"
          aria-hidden="true"
        >{@html item.icon}</svg>
        <span
          class="overflow-hidden whitespace-nowrap text-left transition-all duration-200 {expanded
            ? 'ml-3 max-w-[140px] flex-1 opacity-100'
            : 'ml-0 max-w-0 opacity-0'}"
        >
          {item.label}
        </span>
      </button>
    {/each}
  </nav>

  <!-- footer: email + logout -->
  <div class="space-y-2 border-t border-gray-200 px-3 py-4 {expanded ? '' : 'px-2'}">
    <p class="truncate text-xs text-gray-400" title={email}>{email}</p>
    <button
      type="button"
      onclick={logout}
      title={expanded ? undefined : 'Logout'}
      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 {expanded
        ? ''
        : 'justify-center'}"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="size-4 shrink-0"
        aria-hidden="true"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
      {#if expanded}<span>Logout</span>{/if}
    </button>
  </div>
</aside>

<style>
  .bar {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 16px;
    height: 2px;
    border-radius: 1px;
    background: currentColor;
    transition:
      transform 0.2s ease,
      opacity 0.2s ease;
  }
  .bar-1 {
    transform: translate(-50%, calc(-50% - 5px));
  }
  .bar-2 {
    transform: translate(-50%, -50%);
  }
  .bar-3 {
    transform: translate(-50%, calc(-50% + 5px));
  }
  .open .bar-1 {
    transform: translate(-50%, -50%) rotate(45deg);
  }
  .open .bar-2 {
    opacity: 0;
  }
  .open .bar-3 {
    transform: translate(-50%, -50%) rotate(-45deg);
  }
</style>
