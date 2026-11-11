<script>
  import { supabase, REMEMBER_KEY, SB_AUTH_KEY } from './supabase.js'
  import Swal from 'sweetalert2'

  let email = $state('')
  let password = $state('')
  let remember = $state(true)
  let loading = $state(false)

  async function submit(e) {
    e.preventDefault()
    if (!email.trim() || !password) {
      Swal.fire({ icon: 'warning', title: 'Lengkapi email dan password' })
      return
    }
    loading = true
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
    if (!remember) localStorage.removeItem(SB_AUTH_KEY)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    loading = false
    if (error) {
      const text = /invalid login credentials/i.test(error.message)
        ? `${error.message} — email atau password mungkin salah.`
        : error.message
      Swal.fire({ icon: 'error', title: 'Login gagal', text })
    }
    // success: App.svelte auth listener switches view — no navigation here
  }
</script>

<main class="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,#1e293b_0%,#0f172a_65%)] p-4">
  <div class="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-slate-900/5">
    <!-- stable-height logo block: swap in an <img> later without layout shift -->
    <div class="flex h-24 flex-col items-center justify-center gap-2">
      <div class="wordmark" aria-label="Mitra10">
        {#each [...'Mitra'] as ch, i (i)}
          <span class="lt blue" style="--i:{i}">{ch}</span>
        {/each}
        {#each [...'10'] as ch, i (i)}
          <span class="lt orange" style="--i:{i + 5}">{ch}</span>
        {/each}
      </div>
      <p class="text-center text-sm text-slate-500">Monitoring Pack01</p>
    </div>

    <h1 class="mb-5 mt-2 text-center text-lg font-semibold text-slate-800">Masuk ke akun Anda</h1>

    <form class="space-y-4" onsubmit={submit}>
      <div>
        <label for="login-username" class="mb-1 block text-sm font-medium text-slate-700">
          Username/Email
        </label>
        <input
          id="login-username"
          type="text"
          autocomplete="username"
          bind:value={email}
          class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
        />
      </div>

      <div>
        <label for="login-password" class="mb-1 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          autocomplete="current-password"
          bind:value={password}
          class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
        />
      </div>

      <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          bind:checked={remember}
          class="size-4 rounded accent-blue-700"
        />
        Ingat perangkat ini
      </label>

      <button
        type="submit"
        disabled={loading}
        class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700/40 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {#if loading}
          <span class="spinner" aria-hidden="true"></span>
          Memproses...
        {:else}
          Masuk
        {/if}
      </button>
    </form>
  </div>
</main>

<style>
  /* wordmark: staggered letter entrance, then gentle float + soft glow */
  .wordmark {
    display: inline-flex;
    font-size: 2.25rem;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.02em;
    animation:
      idle-float 6s ease-in-out 1.5s infinite,
      soft-glow 4s ease-in-out 1.5s infinite;
  }

  .lt {
    display: inline-block;
    opacity: 0;
    animation: letter-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    animation-delay: calc(var(--i) * 70ms + 150ms);
  }

  .blue {
    color: #1d4ed8;
  }

  .orange {
    color: #f97316;
  }

  @keyframes letter-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes idle-float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-4px);
    }
  }

  @keyframes soft-glow {
    0%,
    100% {
      filter: drop-shadow(0 0 0 rgba(29, 78, 216, 0));
    }
    50% {
      filter: drop-shadow(0 0 6px rgba(29, 78, 216, 0.28));
    }
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
