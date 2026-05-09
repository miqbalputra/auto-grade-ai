# AutoGrade AI

Aplikasi web internal untuk menghitung nilai ijazah dari rapor Kelompok Tahfidz Griya Qur'an Tunas Ilmu.

## Fitur yang Sudah Dibangun

- Login admin dengan bcrypt, session cookie 8 jam, dan rate limit percobaan login.
- Schema MariaDB sesuai PRD melalui Prisma.
- Settings LLM permanen: Base URL, API key, cek koneksi `/v1/models`, pilih model.
- Scanner batch JPG/PNG berurutan dengan integrasi Vision LLM OpenAI-compatible.
- Validasi server: jumlah poin, rata-rata 50-100, semester 1-12, cross-check `SUM(score_breakdown)`.
- Simpan bulk ke database dengan resolusi identitas NIS/nama mirip, pencegahan duplikat semester, dan hitung ulang `final_score`.
- Data siswa dengan pencarian, filter kelengkapan, dan export Excel.
- Template cetak nilai ijazah F4 portrait.

## Jalankan Lokal

1. Salin `.env.example` menjadi `.env`, lalu isi `SESSION_SECRET`.
2. Jalankan MariaDB:

```bash
docker compose up -d
```

3. Install dependency dan migrasi database:

```bash
npm install
npm run db:migrate
npm run seed:admin -- --username=admin --password=passwordAman123
npm run dev
```

4. Buka `http://localhost:3000/login`.

## Deploy ke VPS

Panduan production via Coolify, MariaDB, storage upload, migration, seed admin, domain, HTTPS, dan backup tersedia di:

```text
DEPLOYMENT.md
```

## Catatan Build Awal

PDF upload sudah disimpan, tetapi rendering halaman pertama PDF ke PNG 150 DPI belum diaktifkan. Untuk uji alur AI saat ini gunakan JPG/PNG rapor atau lanjutkan dengan form manual pada iterasi berikutnya.
