<script>
  import { supabase } from './lib/supabase.js'
  import Login from './lib/Login.svelte'
  import Sidebar from './lib/Sidebar.svelte'
  import Dashboard from './lib/pages/Dashboard.svelte'
  import Upload from './lib/pages/Upload.svelte'
  import Task from './lib/pages/Task.svelte'
  import Reason from './lib/pages/Reason.svelte'
  import Pengaturan from './lib/pages/Pengaturan.svelte'

  let session = $state(null)
  let email = $state('')
  let page = $state('dashboard')

  supabase.auth.getSession().then(({ data }) => {
    session = data.session
    email = data.session?.user?.email ?? ''
  })
  supabase.auth.onAuthStateChange((_, data) => {
    session = data?.session ?? null
    email = data?.session?.user?.email ?? ''
  })
</script>

{#if session}
  <div class="min-h-screen bg-gray-50">
    <Sidebar bind:page {email} />
    <main
      class="min-h-screen p-8 transition-[margin-left] duration-200 ease-out"
      style="margin-left: var(--sidebar-w, 240px)"
    >
      {#if page === 'dashboard'}
        <Dashboard {email} />
      {:else if page === 'upload'}
        <Upload />
      {:else if page === 'task'}
        <Task />
      {:else if page === 'reason'}
        <Reason />
      {:else if page === 'pengaturan'}
        <Pengaturan />
      {/if}
    </main>
  </div>
{:else}
  <Login />
{/if}
