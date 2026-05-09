# Panduan Deploy AutoGrade AI ke VPS

Panduan ini disusun untuk deploy AutoGrade AI ke VPS menggunakan Coolify, Docker, dan MariaDB.

## 1. Prasyarat VPS

Minimal yang disarankan:

- Ubuntu 22.04 atau 24.04
- RAM 2 GB atau lebih
- Storage 20 GB atau lebih
- Domain/subdomain aktif, contoh `autograde.domainanda.com`
- Coolify sudah terpasang di VPS
- Repository GitHub: `https://github.com/miqbalputra/auto-grade-ai.git`

## 2. Buat Resource di Coolify

### A. Buat Project

1. Masuk ke dashboard Coolify.
2. Buat project baru, contoh: `AutoGrade AI`.
3. Pilih environment, contoh: `production`.

### B. Buat MariaDB Service

1. Tambahkan resource baru.
2. Pilih `Database` -> `MariaDB`.
3. Gunakan nama service, contoh: `autograde-mariadb`.
4. Setelah service running, catat connection string/database credentials.

Format `DATABASE_URL` yang dibutuhkan aplikasi:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE"
```

Jika host adalah service internal Coolify, gunakan hostname internal yang diberikan Coolify.

## 3. Deploy Aplikasi dari GitHub

1. Tambahkan resource baru.
2. Pilih `Application`.
3. Pilih GitHub repository:

```text
https://github.com/miqbalputra/auto-grade-ai.git
```

4. Branch: `main`.
5. Build pack: `Dockerfile`.
6. Port aplikasi: `3000`.

## 4. Environment Variables

Tambahkan environment variables berikut di Coolify application:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE"
SESSION_SECRET="isi_dengan_random_string_panjang_minimal_32_karakter"
UPLOAD_DIR="/app/uploads"
```

Catatan:

- Jangan set `LOCAL_JSON_DB=true` di production.
- `SESSION_SECRET` harus random dan rahasia.
- `UPLOAD_DIR=/app/uploads` dipakai agar file rapor tersimpan di persistent storage.

Contoh membuat secret:

```bash
openssl rand -base64 48
```

## 5. Persistent Storage untuk Upload

Di Coolify application, tambahkan storage/bind mount:

```text
/app/uploads
```

Tujuannya agar file upload rapor tidak hilang saat container rebuild/redeploy.

## 6. Jalankan Migration Database

Setelah application berhasil build/deploy pertama kali, jalankan command di terminal/container aplikasi:

```bash
npm run db:deploy
```

Command ini menjalankan Prisma migration ke MariaDB production.

## 7. Buat Akun Admin Pertama

Masih dari terminal/container aplikasi, jalankan:

```bash
npm run seed:admin -- --username=admin --password=passwordAmanYangKuat
```

Ganti password dengan password aman.

Contoh:

```bash
npm run seed:admin -- --username=admin --password=GantiPasswordIni123
```

Setelah login berhasil, password bisa diganti dengan menjalankan seeder lagi memakai username yang sama dan password baru.

## 8. Domain dan HTTPS

1. Di Coolify application, set domain:

```text
https://autograde.domainanda.com
```

2. Arahkan DNS domain/subdomain ke IP VPS:

```text
Type: A
Name: autograde
Value: IP_VPS_ANDA
```

3. Aktifkan HTTPS/Let's Encrypt di Coolify.

HTTPS wajib untuk keamanan login dan cookie session production.

## 9. Konfigurasi LLM Setelah Login

1. Buka aplikasi di domain production.
2. Login dengan akun admin.
3. Masuk ke `Settings LLM`.
4. Isi:

```text
Base URL: https://api.openai.com
API Key: API key provider
Model: pilih model vision/chat yang tersedia
```

5. Klik `Cek Koneksi`.
6. Pilih model.
7. Klik `Simpan`.

Jika memakai provider selain OpenAI, pastikan provider mendukung endpoint OpenAI-compatible:

```text
/v1/models
/v1/chat/completions
```

## 10. Checklist Verifikasi Production

Setelah deploy, cek ini satu per satu:

- Halaman login terbuka.
- Login admin berhasil.
- Dashboard terbuka.
- Settings LLM bisa cek koneksi dan simpan model.
- Halaman Scanner bisa upload JPG/PNG.
- Hasil scan masuk tabel review.
- Simpan ke database berhasil.
- Data siswa tampil di halaman `Data Siswa`.
- Download Excel lengkap berhasil.
- Download PDF lengkap berhasil.
- Chatbot Data aktif setelah Settings LLM terisi.
- Cetak nilai ijazah bisa dibuka dan dicetak/simpan PDF.

## 11. Backup Database

Aktifkan backup harian di Coolify untuk MariaDB.

Jika ingin manual via `mysqldump`, formatnya:

```bash
mysqldump -h HOST -u USER -p DATABASE > autograde_backup_$(date +%F).sql
```

Simpan backup di luar VPS atau object storage agar aman jika VPS bermasalah.

## 12. Update Aplikasi

Setelah ada perubahan kode:

1. Push ke branch `main`.
2. Coolify akan auto deploy jika webhook aktif.
3. Jika ada migration baru, jalankan:

```bash
npm run db:deploy
```

4. Cek ulang halaman penting.

## 13. Troubleshooting

### Aplikasi gagal connect database

Cek:

- `DATABASE_URL` benar.
- MariaDB service running.
- Host/port memakai internal hostname Coolify yang benar.
- Database sudah dibuat.

### Login selalu gagal

Cek:

- Seeder admin sudah dijalankan.
- `SESSION_SECRET` sudah ada.
- Database production bukan database kosong yang berbeda.

### Upload hilang setelah redeploy

Cek:

- `UPLOAD_DIR=/app/uploads`
- Storage bind mount `/app/uploads` sudah aktif di Coolify.

### Chatbot gagal menjawab

Cek:

- Settings LLM sudah lengkap.
- Base URL benar.
- API key valid.
- Model yang dipilih mendukung chat completion.
- Untuk scanner rapor, model harus mendukung vision/image input.

### PDF/Excel download error

Cek logs aplikasi di Coolify. Pastikan build memakai Dockerfile dari repository dan dependencies sudah terinstall dari `package-lock.json`.

