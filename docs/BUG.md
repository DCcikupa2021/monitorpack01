# BUG — Laporan & Standar Investigasi

## A. Laporan bug

Salin template ini tiap kali bug muncul.

```markdown
### [Judul singkat bug]

- **Tanggal & pelapor**: 2026-11-11 — <nama>
- **Gejala** (kapan muncul, kapan hilang):
  contoh: "pindah tab → login form; F5 → masuk lagi"
- **Langkah reproduksi** (numbered, exact):
  1. Buka app, login.
  2. Pindah tab browser ke tab lain.
  3. Kembali ke tab app.
- **Harapan vs kenyataan**:
  - Harapan: session tetap, app tetap di Dashboard.
  - Kenyataan: muncul login form.
- **Log tempel**: console DevTools / tab Network (response refresh token) — paste apa adanya.
- **Versi paket**:
  ```bash
  npm ls @supabase/supabase-js svelte vite
  npm audit
  ```
- **Screenshot**: bila ada.
- **Link file/baris terkait**: `src/lib/xxx.js:12`
```

Isian wajib: gejala spesifik, langkah reproduksi, harapan vs kenyataan, log, versi paket.

## B. Standar investigasi

Playbook tetap — urutan wajib.

1. **Reproduksi dulu.** Pastikan bug bisa diulang sebelum baca kode. Tidak bisa diulang = tidak bisa difix.
2. **Rekam.** DevTools → Console (filter `auth`), Network (cek refresh token), Performance bila perlu.
3. **Kunci versi dependency.** Baca source di `node_modules` sesuai versi lockfile. Jangan asumsi versi dari ingatan atau docs online.
4. **Baca gejala spesifik dulu.** Pola "A normal tapi B error" → bedakan jalur A vs B, jangan baca seluruh kode.
5. **Diagnosa read-only dulu.** Analisis dan tulis akar masalah sebelum sentuh kode. Fix belakangan.

### Contoh nyata

Kasus bug session 2026-11-11:

- **Gejala**: pindah tab/minimize → login form; F5 → masuk.
- **Akar**: callback `onAuthStateChange((_, data))` salah baca bentuk — supabase kirim Session langsung, kode baca `data?.session` (selalu undefined → session null tiap event). F5 selamat karena `getSession().then` (bentuk benar) resolve paling akhir.
- **Fix**: baca `data` langsung + hanya `SIGNED_OUT` yang menghapus state.
- **Pelajaran**: verifikasi bentuk data callback dari source library (`node_modules/@supabase/auth-js`), jangan dari asumsi.
