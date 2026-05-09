# Product Requirements Document (PRD)

**Nama Produk:** AutoGrade AI (Aplikasi Penghitung Nilai Ijazah Otomatis)
**Versi:** 4.0 (Final)
**Platform:** Web Application
**Target Deployment:** VPS via Coolify (Dockerized)

---

## 1. Ringkasan Eksekutif

AutoGrade AI adalah aplikasi web internal untuk Kelompok Tahfidz Griya Qur'an "Tunas Ilmu" yang mengotomatiskan rekapitulasi nilai rapor menjadi nilai ijazah. Aplikasi menggunakan Vision LLM untuk memindai rapor (PDF/Gambar), mengekstrak seluruh komponen nilai dan **JUMLAH NILAI** yang tertera, menghitung rata-rata per rapor secara dinamis (`JUMLAH NILAI ÷ jumlah poin penilaian`), dan merata-rata antar semester sebagai **Nilai Ijazah Final**.

Aplikasi bersifat **internal tool** — diakses oleh admin yang berwenang menggunakan username dan password.

---

## 2. Aturan Kalkulasi Nilai

### 2.1. Komponen Nilai yang Dihitung

| Komponen | Status |
|---|---|
| Capaian Hasil Belajar (kolom Angka) | ✅ Dihitung |
| Ujian Tahfidz | ✅ Dihitung |
| Tahfidz Harian (semua sub-komponen) | ✅ Dihitung |
| Ujian Praktik (semua sub-komponen) | ✅ Dihitung |
| Kolom KKM | ❌ Abaikan |
| Kolom Rata-rata Kelas | ❌ Abaikan |
| Baris "Nilai rata-rata" (sub-total mapel) | ❌ Abaikan |

### 2.2. Formula Nilai Rata-rata Per Rapor

```
nilai_rata_rapor = JUMLAH_NILAI ÷ jumlah_poin_penilaian
```

- `JUMLAH_NILAI` → angka pada baris **"JUMLAH NILAI"** di rapor
- `jumlah_poin_penilaian` → dihitung dinamis = total baris nilai individual (kategori ✅)

**Verifikasi data nyata:**

| Siswa | Jumlah Nilai | Poin | Rata-rata Rapor |
|---|---|---|---|
| Hanifah Uswatun Hasanah | 1052,9 | 11 | **95,72** |
| Humaira Althafunnisa | 967,9 | 10 | **96,79** |

### 2.3. Formula Nilai Ijazah Final

```
nilai_ijazah_final = AVG(nilai_rata_rapor seluruh semester)
```

Setiap semester dihitung rata-ratanya dulu, lalu dirata-rata antar semester.

### 2.4. Validasi Batas Wajar (Server-side)

| Field | Aturan |
|---|---|
| `jumlah_nilai` | > 0 |
| `jumlah_poin` | 5 – 30 |
| `nilai_rata_rapor` | 50.00 – 100.00 |
| `semester` | Integer 1 – 12 |

Cross-check: `SUM(score_breakdown)` vs `jumlah_nilai` — jika selisih > 0.5 → flag `needs_review`.

---

## 3. Arsitektur & Teknologi

- **Frontend & Backend:** SvelteKit atau Next.js
- **Database:** MariaDB
- **AI/LLM Engine:** OpenAI-compatible API
- **Deployment:** Coolify (Git Repository + MariaDB One-Click Service)

---

## 4. Fitur Utama

### 4.1. Autentikasi (Login)

Aplikasi dilindungi dengan sistem login username + password sebelum bisa diakses.

**Spesifikasi:**
- Halaman login adalah halaman pertama yang muncul sebelum seluruh fitur aplikasi
- Field: Username + Password
- Password disimpan di database dalam bentuk **hash bcrypt** (bukan plain text)
- Session berlaku selama browser terbuka, atau maksimal **8 jam** (auto-logout)
- Jika session habis atau belum login → redirect ke halaman login
- Tidak ada fitur registrasi publik — akun admin dibuat melalui **seeder/migration database** atau script CLI saat pertama deploy

**Tabel `admin_users`:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `username` | VARCHAR(50) UNIQUE | |
| `password_hash` | VARCHAR(255) | Hash bcrypt |
| `last_login` | TIMESTAMP | |
| `created_at` | TIMESTAMP | |

**Catatan keamanan:**
- Tambahkan rate limiting pada endpoint login: maksimal 10 percobaan gagal per IP per 15 menit → lockout sementara
- HTTPS wajib diaktifkan di Coolify (Let's Encrypt otomatis tersedia)

### 4.2. Modul Konfigurasi LLM (Settings)

Konfigurasi disimpan **permanen di database** — admin hanya input sekali.

**Alur Settings:**
```
1. Buka halaman Settings
2. Input Base URL + API Key
3. Klik [Cek Koneksi] → sistem hit /v1/models
   - Sukses: muncul dropdown daftar model
   - Gagal: tampil pesan error spesifik
4. Pilih model dari dropdown
5. Klik [Simpan] → tersimpan permanen
```

**Ganti model:** Buka Settings → pilih model lain dari dropdown → [Simpan].
**Ganti provider:** Ubah URL + Key → [Cek Koneksi] → pilih model baru → [Simpan].

**Tabel `app_settings`:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | INT PK | Selalu 1 (single-row config) |
| `llm_base_url` | VARCHAR(255) | |
| `llm_api_key` | VARCHAR(500) | Plain text (internal tool) |
| `llm_model` | VARCHAR(100) | |
| `updated_at` | TIMESTAMP | |

### 4.3. Modul Pemindai Rapor (Scanner)

**Upload:**
- Drag-and-drop atau klik pilih file
- Format: PDF, JPG, PNG
- Batch upload tanpa batas jumlah file (tipikal: 12 file per siswa)
- Diproses dalam **antrian berurutan** (bukan paralel) — mencegah rate limit API

**Pra-pemrosesan server-side:**
- PDF → render halaman 1 saja ke PNG, minimum **150 DPI**
- Tujuan: memastikan Vision LLM membaca secara visual

**Proses AI:**
- Kirim gambar + system prompt → terima JSON
- Gagal parse → **retry 1x** dengan prompt lebih eksplisit
- Retry gagal → status `failed`, buka **form manual pre-filled**

**Progress indicator:**
- Progress bar: "Memproses file 3 dari 12..."
- Status per file: `menunggu` → `memproses` → `selesai` / `perlu review` / `gagal`

### 4.4. Modul Tabel Review

Setelah proses selesai, tampil tabel review:

| Kolom | Keterangan |
|---|---|
| Thumbnail | Gambar kecil rapor, klik untuk perbesar |
| Nama / NIS / Kelas | Hasil ekstraksi AI |
| Semester / Tahun Ajaran | Hasil ekstraksi AI |
| Jumlah Nilai / Poin / Rata-rata | Hasil hitung server |
| Status | ✅ ok / ⚠️ perlu review / ❌ gagal |
| Aksi | Tombol edit per baris |

Tombol **[Simpan Semua ke Database]** aktif setelah admin selesai memeriksa.

### 4.5. Modul Identitas Siswa & Resolusi NIS

```
1. Cek NIS exact match → ditemukan: langsung assign
2. Tidak ditemukan → fuzzy match nama (Jaro-Winkler ≥ 85%)
   → Ada yang mirip: dialog konfirmasi side-by-side
     Admin pilih: [Siswa yang sama] atau [Buat profil baru]
3. Tidak ada yang mirip → buat profil baru otomatis
   → Form muncul: Nama (prefilled), NIS (prefilled), Jenis Kelamin (input manual)
```

Cek duplikat: jika `student_id + semester + academic_year` sudah ada → warning sebelum simpan.

### 4.6. Modul Data Siswa

**Pencarian & Filter:**
- Search real-time by nama atau NIS
- Filter by kelas / angkatan
- Filter kelengkapan: "Lengkap (12 semester)" / "Belum lengkap" / "Semua"

**Indikator kelengkapan:** Progress `7 / 12 semester` per siswa.

**Detail siswa:** Riwayat semua semester + Nilai Ijazah Final (jika data lengkap).

**Export:**
- [Export Excel] → `.xlsx`: Nama, NIS, JK, nilai per semester, Nilai Ijazah Final
- [Export PDF] → layout rapi untuk arsip digital

### 4.7. Modul Cetak Nilai Ijazah

**Format:** F4 portrait (215,9mm × 330,2mm)

**Komponen yang ditampilkan:**
1. **Header lembaga** — tulisan Arab (حَلَقَةُ التَّحْفِيظِ), nama lembaga, alamat, logo
2. **Judul dokumen** — "Rekap Nilai Ijazah"
3. **Identitas siswa** — Nama lengkap, NIS, Jenis Kelamin, Total semester ditempuh
4. **Tabel riwayat nilai per semester** dengan kolom:
   - Semester | Tahun Ajaran | Kelas | Jumlah Nilai | Jumlah Poin | Rata-rata
   - Baris footer: total jumlah nilai + rata-rata keseluruhan
5. **Nilai Ijazah Final** — ditampilkan besar dengan angka + terbilang huruf Indonesia
6. **Tanda tangan** — Kepala Kelompok Tahfidz (nama + jabatan, tanggal otomatis)
7. **Footer strip** — identitas lembaga

**Desain:**
- Border ornamental emas ganda (luar + dalam)
- Ornamen sudut di 4 pojok
- Watermark logo lembaga di tengah (transparan)
- Warna utama: hijau tua `#1a4d2e` + emas `#8b6914`
- Font: Times New Roman (latin) + Scheherazade New (Arab)

**Tombol di halaman web:** [Cetak / Simpan PDF] + [Pratinjau]

**Implementasi:** Template HTML dengan CSS `@page { size: 215.9mm 330.2mm; }` — dicetak langsung dari browser atau dikonversi ke PDF via Puppeteer/wkhtmltopdf di server.

---

## 5. Alur Pengguna Lengkap

```
LOGIN
└── /login → username + password → session dibuat → redirect ke dashboard

SETUP (sekali saja)
└── Settings → URL + Key → [Cek Koneksi] → pilih model → [Simpan]

SCAN RAPOR
└── Upload batch → pra-proses PDF → antrian AI
    ├── Sukses → parse JSON → validasi → tabel review
    └── Gagal → retry → form manual pre-filled

SIMPAN
└── Tabel review → admin verifikasi → [Simpan Semua]
    └── Resolusi identitas (NIS match / fuzzy / profil baru + JK)
        └── Insert DB → recalculate final_score

OUTPUT
└── Data Siswa → search/filter → detail siswa
    ├── Export Excel / PDF
    └── [Cetak Nilai Ijazah] → template F4 → print/PDF
```

---

## 6. Desain Database

### `admin_users`
| Kolom | Tipe |
|---|---|
| `id` | INT PK AUTO_INCREMENT |
| `username` | VARCHAR(50) UNIQUE |
| `password_hash` | VARCHAR(255) |
| `last_login` | TIMESTAMP |
| `created_at` | TIMESTAMP |

### `app_settings`
| Kolom | Tipe |
|---|---|
| `id` | INT PK (selalu 1) |
| `llm_base_url` | VARCHAR(255) |
| `llm_api_key` | VARCHAR(500) |
| `llm_model` | VARCHAR(100) |
| `updated_at` | TIMESTAMP |

### `students`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `latest_nis` | VARCHAR(20) | NIS terbaru |
| `name` | VARCHAR(100) | |
| `gender` | ENUM('L','P') | Input manual admin |
| `final_score` | DECIMAL(5,2) | Auto-update |
| `created_at` | TIMESTAMP | |

### `report_cards`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `student_id` | INT FK → students.id | |
| `nis_on_document` | VARCHAR(20) | NIS persis di rapor |
| `class_name` | VARCHAR(50) | Contoh: Mustawa 6 |
| `semester` | INT | 1 – 12 |
| `academic_year` | VARCHAR(10) | Contoh: 2025/2026 |
| `total_score` | DECIMAL(7,2) | JUMLAH NILAI dari rapor |
| `score_count` | INT | Jumlah poin (dinamis) |
| `average_score` | DECIMAL(5,2) | total_score ÷ score_count |
| `score_breakdown` | JSON | Semua nilai individual |
| `file_url` | VARCHAR(255) | Path file di VPS |
| `status` | ENUM('ok','needs_review','failed') | |
| `created_at` | TIMESTAMP | |

**Format `score_breakdown`:**
```json
{
  "capaian_belajar": [{"nama": "Aqidah Akhlaq", "nilai": 94.5}, ...],
  "ujian_tahfidz":   [{"nama": "Juz 28, 27, 26, 25 & 24", "nilai": 93.0}],
  "tahfidz_harian":  [{"nama": "Keaktifan", "nilai": 96.0}, {"nama": "Manzil", "nilai": 85.0}],
  "ujian_praktik":   [{"nama": "Do'a sebelum tidur", "nilai": 98.0}, ...]
}
```

**Query update `final_score`:**
```sql
UPDATE students
SET final_score = (
  SELECT ROUND(AVG(average_score), 2)
  FROM report_cards
  WHERE student_id = :student_id AND status = 'ok'
)
WHERE id = :student_id;
```

---

## 7. System Prompt LLM

```
Anda adalah asisten administrasi yang membaca dokumen rapor dari Kelompok Tahfidz
berbahasa Indonesia dan Arab. Ekstrak data spesifik menjadi JSON valid.

=== FIELD YANG DICARI ===
1. "nama_santri"    → teks di sebelah "Nama Santri :"
2. "nis"            → teks di sebelah "NIS :"
3. "kelas"          → teks di sebelah "Kelas :"
4. "semester"       → ANGKA SAJA ("1 (Satu)" → 1)
5. "tahun_ajaran"   → teks di sebelah "Tahun Ajaran :"
6. "jumlah_nilai"   → angka pada baris "JUMLAH NILAI" (bagian bawah dokumen)
7. "score_breakdown"→ semua nilai individual dikelompokkan:
   - "capaian_belajar" : kolom "Angka" dari tabel Capaian Hasil Belajar
   - "ujian_tahfidz"   : semua baris seksi Ujian Tahfidz
   - "tahfidz_harian"  : semua baris seksi Tahfidz Harian
   - "ujian_praktik"   : semua baris seksi Ujian Praktik

=== ATURAN WAJIB ===
- AMBIL kolom "Angka", ABAIKAN "KKM" dan "Rata-rata Kelas"
- ABAIKAN baris "Nilai rata-rata" (sub-total mapel, bukan total akhir)
- Ubah koma desimal → titik (96,98 → 96.98)
- Hitung sendiri "jumlah_poin" = total semua item di score_breakdown
- Nilai tidak terbaca → isi null, JANGAN mengarang

=== OUTPUT (strict JSON, tanpa teks lain) ===
{
  "nama_santri": "string",
  "nis": "string",
  "kelas": "string",
  "semester": number,
  "tahun_ajaran": "string",
  "jumlah_nilai": float,
  "jumlah_poin": number,
  "score_breakdown": {
    "capaian_belajar": [{"nama": "string", "nilai": float}],
    "ujian_tahfidz":   [{"nama": "string", "nilai": float}],
    "tahfidz_harian":  [{"nama": "string", "nilai": float}],
    "ujian_praktik":   [{"nama": "string", "nilai": float}]
  }
}
```

---

## 8. Validasi Server

```
1. Parse JSON → gagal: retry 1x
2. Cek semua field wajib hadir
3. sum_check = SUM(semua nilai di score_breakdown)
   → |sum_check - jumlah_nilai| > 0.5: flag needs_review
4. average_score = jumlah_nilai ÷ jumlah_poin
5. Validasi range (jumlah_poin 5–30, average_score 50–100, semester 1–12)
6. Cek duplikat student_id + semester + academic_year
```

---

## 9. Panduan Deployment di Coolify

1. Push kode ke GitHub/GitLab
2. Buat **MariaDB service** di Coolify → catat connection string
3. Set environment variables:
   ```
   DATABASE_URL=mysql://user:pass@host:3306/dbname
   SESSION_SECRET=random_string_panjang_minimal_32_karakter
   ```
4. Set **Storage Bind Mounts**: `/app/uploads` → persistent volume
5. Aktifkan **HTTPS** (Let's Encrypt) di Coolify — wajib untuk keamanan login
6. Jalankan migration + seeder akun admin pertama saat pertama deploy:
   ```bash
   # Contoh seeder CLI
   npm run seed:admin -- --username=admin --password=passwordAman123
   ```
7. **Backup:** Aktifkan snapshot database harian di Coolify atau cron job `mysqldump`

---

## 10. Fase Pengembangan (6 Minggu)

| Fase | Minggu | Deliverable |
|---|---|---|
| 1 | Minggu 1 | Schema DB + migration, halaman Login (bcrypt + session), halaman Settings |
| 2 | Minggu 2 | Upload antrian file, pra-proses PDF→PNG 150 DPI, integrasi Vision LLM, progress indicator |
| 3 | Minggu 3 | Parse JSON, retry logic, form manual pre-filled, validasi cross-check server |
| 4 | Minggu 4 | Tabel review, resolusi identitas (NIS/fuzzy/profil baru + JK), insert DB, recalculate |
| 5 | Minggu 5 | Halaman Data Siswa (search/filter/kelengkapan), export Excel/PDF, template cetak ijazah F4 |
| 6 | Minggu 6 | Deployment Coolify + HTTPS, seeder admin, backup strategy, uji lapangan, bugfix |

---

## 11. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Format rapor berubah di masa depan | Poin salah hitung | `score_breakdown` JSON + cross-check SUM |
| AI salah baca angka | Nilai kacau | Validasi range 50–100 + cross-check |
| NIS berubah antar semester | Data terfragmentasi | Fuzzy match + `nis_on_document` per rapor |
| PDF buram / miring | Ekstraksi gagal | Render 150 DPI + retry + form manual |
| Duplikat upload semester | Data ganda | Cek duplikat sebelum insert |
| Kehilangan data | Bencana permanen | Bind mount + backup harian |
| Rate limit API LLM | Proses crash | Antrian berurutan |
| Akses tidak sah | Data nilai bocor | Login bcrypt + HTTPS + session timeout 8 jam + rate limit login |
