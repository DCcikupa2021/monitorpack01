<script>
  import { supabase } from './lib/supabase.js'
  import Login from './lib/Login.svelte'
  import Sidebar from './lib/Sidebar.svelte'
  import Dashboard from './lib/pages/Dashboard.svelte'
  import Upload from './lib/pages/Upload.svelte'
  import Task from './lib/pages/Task.svelte'
  import TaskDetail from './lib/pages/TaskDetail.svelte'
  import Reason from './lib/pages/Reason.svelte'
  import Pengaturan from './lib/pages/Pengaturan.svelte'
  import { logAuthEvent, showSessionBadge } from './lib/authDebug.js'

  let session = $state(null)
  let email = $state('')
  let page = $state('dashboard')
  let detailId = $state('')

  // route detail: #/task/detail?id=<shipment_id> — bukan menu sidebar, hanya dari klik baris Task
  function syncHash() {
    const m = /^#\/task\/detail(?:\?|$)/.exec(location.hash)
    if (m) {
      detailId = new URLSearchParams(location.hash.split('?')[1] ?? '').get('id') ?? ''
      page = 'task-detail'
    } else if (page === 'task-detail') {
      page = 'task'
      detailId = ''
    }
  }

  window.addEventListener('hashchange', syncHash)
  syncHash()

  // pindah halaman via sidebar → buang hash detail (replaceState supaya back browser tetap ke list)
  $effect(() => {
    if (page !== 'task-detail' && location.hash) {
      history.replaceState(null, '', location.pathname + location.search)
    }
  })

  supabase.auth.getSession().then(({ data }) => {
    session = data.session
    showSessionBadge(data.session)
    email = data.session?.user?.email ?? ''
  })
  supabase.auth.onAuthStateChange((ev, data) => {
    logAuthEvent(ev, data)
    showSessionBadge(data)
    // bentuk callback: (event, session) — bukan {session}
    // event selain SIGNED_OUT dengan data null tidak boleh menimpa state login
    if (ev === 'SIGNED_OUT') {
      session = null
      email = ''
      return
    }
    if (data) {
      session = data
      email = data.user?.email ?? ''
    }
  })
</script>

{#if session}
  <div class="min-h-screen bg-gradient-to-b from-blue-50/50 via-gray-50 to-gray-50">
    <Sidebar bind:page {email} />
    <main
      class="min-h-screen px-4 pt-14 pb-8 transition-[margin-left] duration-200 ease-out motion-reduce:transition-none sm:px-6 md:pt-8 md:ml-[var(--sidebar-w,240px)] lg:px-8"
    >
      {#key page}
        <div class="page-enter">
          {#if page === 'dashboard'}
            <Dashboard {email} />
          {:else if page === 'upload'}
            <Upload />
          {:else if page === 'task'}
            <Task />
          {:else if page === 'task-detail'}
            <TaskDetail
              id={detailId}
              onback={() => {
                location.hash = ''
              }}
            />
          {:else if page === 'reason'}
            <Reason />
          {:else if page === 'pengaturan'}
            <Pengaturan />
          {/if}
        </div>
      {/key}
    </main>
  </div>
{:else}
  <Login />
{/if}

<style>
  .page-enter {
    animation: page-in 0.22s ease-out both;
  }
  @keyframes page-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .page-enter {
      animation: none;
    }
  }
</style>
