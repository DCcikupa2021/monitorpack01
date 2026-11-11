<script>
  import { supabase } from './lib/supabase.js'
  import Login from './lib/Login.svelte'

  let session = $state(null)
  let email = $state('')

  supabase.auth.getSession().then(({ data }) => {
    session = data.session
    email = data.session?.user?.email ?? ''
  })
  supabase.auth.onAuthStateChange((_, data) => {
    session = data?.session ?? null
    email = data?.session?.user?.email ?? ''
  })

  async function logout() { await supabase.auth.signOut() }
</script>

{#if session}
  <main class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center space-y-4">
      <h1 class="text-2xl font-bold">Dashboard</h1>
      <p class="text-gray-500">{email}</p>
      <button onclick={logout} class="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">Logout</button>
    </div>
  </main>
{:else}
  <Login />
{/if}
