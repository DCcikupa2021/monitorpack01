# Progress — Monitoring Pack01

Update terakhir: 2026-11-11

## Selesai

- [x] PRD v0.2 (`PRD.md` — di-gitignore, berisi kredensial login)
- [x] Scaffold: Vite + Svelte 5 + Tailwind v4 + Supabase JS + SweetAlert2 — build passing
- [x] Git init (branch `main`) + `.gitignore` (`PRD.md`, `.env`, `node_modules/`, `dist/`)
- [x] Login form (`src/lib/Login.svelte`):
  - Logo "Mitra10" animasi CSS keyframes, scoped Svelte (stagger masuk + idle float/glow)
  - Field "Username/Email", "Password", checkbox "Ingat perangkat ini" (default centang)
  - Submit → `supabase.auth.signInWithPassword`, error via SweetAlert2
- [x] Supabase auth wired: project `owkvioooumcipiyldnmx`, `.env` berisi URL + anon key
- [x] User admin dibuat di Supabase Auth, email confirmed — kredensial di `PRD.md` §6.1
- [x] Remember me: storage adapter routing localStorage (centang) vs sessionStorage (hilang) — `src/lib/supabase.js`
- [x] Verifikasi: `npm run build` lolos + smoke test login REST Supabase (200, session terbit)
- [x] App shell pasca-login (2026-11-11):
  - Sidebar kiri: hamburger expand/collapse (240px ↔ 72px, transisi 200ms), state di localStorage `pack01_sidebar`
  - Menu: Dashboard, Upload, Task, Reason, Pengaturan (ikon SVG inline, item aktif highlight biru)
  - Footer sidebar: email user + Logout (`supabase.auth.signOut`)
  - Page switch tanpa router: `page` $state di `App.svelte`
  - 5 halaman placeholder (Dashboard punya 3 kartu stat `—` untuk data nanti)

## Keputusan

- SPA murni (Vite + Svelte), bukan SvelteKit — cocok untuk Cloudflare Pages static.
- `@sveltejs/vite-plugin-svelte` ^6 (v5 hanya peer dengan vite ^6, bentrok dengan vite ^7).
- Tailwind v4 via `@tailwindcss/vite`, config CSS-first (`@import "tailwindcss"`), tanpa `tailwind.config.js`.
- Navigasi tanpa router: `App.svelte` listen `onAuthStateChange`, session ada → Dashboard placeholder, tidak ada → Login.
- Logo = wordmark CSS (belum ada asset resmi). Container `h-24` supaya nanti diganti `<img>` tanpa layout shift.
- Kredensial login TIDAK ada di kode — hanya di `PRD.md` (file gitignored).
- `service_role` key tidak disimpan di file mana pun (hanya dipakai sesi ini untuk membuat user).

## Cara menjalankan

```bash
npm install
npm run dev     # dev server
npm run build   # produksi → dist/
```

`.env` sudah terisi (gitignored). Untuk Cloudflare Pages nanti, set env `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di dashboard Pages.

## Next

1. Sidebar: hamburger expand/collapse, 5 menu (Dashboard, Upload, Task, Reason, Pengaturan).
2. Dashboard isi (kartu ringkasan).
3. Upload Excel — format file bahas terpisah (PRD §8.1).
4. Tabel Task (TR, Item, Qty, Days) + detail + Reason.
5. Pengaturan: kelola user, mode gelap/terang.
6. Review copy login (heading "Masuk ke akun Anda" ditambahkan designer, bisa diubah).

## Risiko / catatan

- `PRD.md` berisi password login — pastikan tetap di `.gitignore` sebelum push.
- Belum ada uji browser manual (animasi/logo hanya diverifikasi lewat build).
- Deploy Cloudflare Pages butuh env var di sana, bukan file `.env`.
