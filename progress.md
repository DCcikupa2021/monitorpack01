# Progress — Monitoring Pack01

Update terakhir: 2026-11-12

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
- [x] Fix session persistence (2026-11-11): flag default diingat (bukan hanya `'1'`), heal token tersesat antar localStorage/sessionStorage saat app boot, login bersihkan store lawan. Terverifikasi harness Node: remember=1 reload OK, remember=0 reload OK, stranded token recovered, stale token dibuang.
- [x] Tabel Supabase untuk upload (2026-11-11): `packing_reports` (20 kolom) + `scale_transactions` (21 kolom), kolom snake_case sesuai header Excel, RLS select/insert/delete untuk `authenticated`.
- [x] Fix tabel salah project (2026-11-12): migration awal kena project `xuyzgdiwevfudttuxhrj` (MCP lama), app pakai `owkvioooumcipiyldnmx` → PostgREST PGRST205. MCP dipindah ke project owkv, DDL+RLS ulang via `docs/supabase-upload-tables.sql`, REST anon 200. Project xuyz masih punya salinan tabel lama (diabaikan).
- [x] Parser Excel (`src/lib/excel.js`): deteksi otomatis header — scan 15 baris pertama, `WAVE NUMBER`+`SHIPMENT ID` → packing (header row 3), `INTERNAL ID`+`REFERENCE ID`+`ACTIVITY DATE TIME` → scale (header row 7). Kolom header blank (merge BC/WX) dibuang otomatis. Smoke test lolos di 2 file asli (371 + 187.350 baris). Filter scale: hanya `WORK GROUP` = `Picking` (114.910 baris; Shipping/Receiving/kosong dibuang).
- [x] Insert Supabase (`src/lib/upload.js`): `processUpload(files)` — kelompokkan per jenis → hapus seluruh data lama tabel → insert chunk 1000. Koersi number/date/text sesuai DDL, `created_by` dari session. Setiap Proses = data selalu baru.
- [x] Halaman Upload (`src/lib/pages/Upload.svelte`): multi-file (drop/pilih banyak, append), list per file (badge jenis, baris·kolom, hapus per entry, "Bersihkan semua"), preview collapsible per file (scroll ~5 baris, cap 1.000 baris pertama), tombol **Proses** + alert jumlah insert per tabel.
- [x] Fix bug session logout (2026-11-12): akar = callback `onAuthStateChange` salah baca bentuk (supabase kirim Session langsung, kode baca `data?.session` → selalu undefined → null tiap event; F5 lolos karena `getSession().then` resolve paling akhir). Fix: baca `data` langsung + hanya `SIGNED_OUT` yang menghapus state. Remember Me bukan penyebab.
- [x] `npm audit`: `xlsx` → 0.20.3 via SheetJS CDN (2 vuln high hilang), parser smoke test ulang lolos. Ulang 2026-11-12 (pra-push GitHub): 3 low dev-only — `deepmerge` GHSA-gcqx-w48m-w2h4 (prototype poisoning) lewat rantai `@sveltejs/vite-plugin-svelte` → `vite-plugin-svelte-inspector`; `fixAvailable: false`, tidak masuk bundle produksi.

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

1. Dashboard isi (kartu ringkasan).
2. Menu Task: tabel dari `packing_reports`/`scale_transactions` (TR, Item, Qty, Days) + detail + Reason.
3. Pengaturan: kelola user, mode gelap/terang.
4. Uji upload end-to-end di browser (Proses → cek baris masuk di Supabase).
5. Review copy login (heading "Masuk ke akun Anda" ditambahkan designer, bisa diubah).

## Risiko / catatan

- `PRD.md` berisi password login — pastikan tetap di `.gitignore` sebelum push.
- Belum ada uji browser manual untuk upload + fix session (verifikasi build + smoke test Node saja).
- Upload file scale (~187k baris) = ±188 request chunk, bisa ~1–2 menit. Gagal di tengah = data lama sudah terhapus, sebagian data baru masuk (tanpa rollback) — sesuai desain replace.
- Deploy Cloudflare Pages butuh env var di sana, bukan file `.env`.
- `Debugging Code.txt` di root = panduan debug global, bukan bagian build.

## Debugging tooling (2026-11-11)

- [x] Logger auth DEV-only (`src/lib/authDebug.js`) + badge status sesi — nol perubahan produksi
- [x] `docs/BUG.md` — template laporan + standar investigasi + contoh kasus session
- [x] `package-lock.json` dikunci (source node_modules = versi lockfile)
