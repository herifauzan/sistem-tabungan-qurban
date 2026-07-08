# 🕌 Sistem Tabungan Qurban — Masjid Al-Bina

Platform digital untuk mengelola tabungan dan pembayaran ibadah Qurban jamaah Masjid Al-Bina.

## ✨ Fitur Utama

- 🔐 **Autentikasi** — Login & Registrasi dengan NextAuth.js (JWT, credentials)
- 👤 **Dashboard Jamaah** — Pantau progress tabungan, setor dengan upload bukti transfer
- 👑 **Dashboard Admin Takmir** — Statistik, validasi & persetujuan setoran
- 📊 **Google Sheets** sebagai database (CRUD + retry otomatis)
- 🗂️ **Google Drive** untuk penyimpanan bukti transfer
- 🐳 **Docker** siap deploy ke Google Cloud Run

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS v3 |
| Auth | NextAuth.js (Credentials + JWT) |
| Database | Google Sheets API |
| File Storage | Google Drive API |
| Deployment | Docker → Google Cloud Run |

## 🚀 Mulai Development

### 1. Clone & Install

```bash
npm install
```

### 2. Konfigurasi Environment

```bash
cp .env.example .env.local
```

Isi semua variabel di `.env.local`:
- `NEXTAUTH_SECRET` — Buat dengan: `openssl rand -base64 32`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — Email service account dari Google Cloud Console
- `GOOGLE_PRIVATE_KEY` — Private key dari JSON service account
- `GOOGLE_SPREADSHEET_ID` — ID spreadsheet Google Sheets
- `GOOGLE_DRIVE_FOLDER_ID` — ID folder Google Drive untuk bukti transfer

### 3. Setup Google Sheets

Buat spreadsheet dengan 3 sheet berikut:

**Sheet "Jamaah"** (header baris 1):
```
ID | Name | Phone | Email | Password_Hash | Role | Total_Saved
```

**Sheet "Tipe_Qurban"** (header baris 1):
```
ID | Animal_Name | Price | Quota
```
Contoh data:
```
1 | Kambing | 3000000 | 10
2 | Sapi | 15000000 | 5
```

**Sheet "Transaksi"** (header baris 1):
```
ID | Date | User_ID | Amount | Receipt_Drive_File_ID | Status
```

> **Penting**: Bagikan spreadsheet ke email service account dengan akses **Editor**.

### 4. Setup Google Drive

- Buat folder di Google Drive untuk menyimpan bukti transfer
- Bagikan folder ke email service account dengan akses **Editor**
- Salin ID folder dari URL ke `GOOGLE_DRIVE_FOLDER_ID`

### 5. Buat Akun Admin Pertama

Karena registrasi hanya membuat akun `User`, tambahkan admin langsung ke sheet Jamaah:
1. Hash password dengan bcrypt (bisa via script Node.js)
2. Tambahkan baris di sheet Jamaah dengan Role = `Admin`

### 6. Jalankan

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## 🐳 Docker & Cloud Run

```bash
# Build image
docker build -t tabungan-qurban .

# Test lokal
docker run -p 8080:8080 \
  -e NEXTAUTH_SECRET=... \
  -e NEXTAUTH_URL=http://localhost:8080 \
  -e GOOGLE_SERVICE_ACCOUNT_EMAIL=... \
  -e GOOGLE_PRIVATE_KEY=... \
  -e GOOGLE_SPREADSHEET_ID=... \
  -e GOOGLE_DRIVE_FOLDER_ID=... \
  tabungan-qurban

# Deploy ke Cloud Run
gcloud run deploy tabungan-qurban \
  --image gcr.io/PROJECT_ID/tabungan-qurban \
  --platform managed \
  --region asia-southeast1 \
  --set-env-vars NEXTAUTH_SECRET=...,GOOGLE_SPREADSHEET_ID=... \
  --allow-unauthenticated
```

## 📁 Struktur Proyek

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   ← NextAuth handler
│   │   ├── register/             ← Pendaftaran user
│   │   ├── transactions/         ← GET list & POST setor
│   │   ├── transactions/[id]/    ← PATCH approve/reject
│   │   ├── qurban-types/         ← GET tipe qurban
│   │   └── admin/
│   │       ├── stats/            ← GET statistik admin
│   │       └── transactions/     ← GET semua transaksi
│   ├── login/                    ← Halaman login
│   ├── register/                 ← Halaman daftar
│   ├── dashboard/                ← Dashboard jamaah
│   └── admin/                    ← Dashboard admin
├── lib/
│   ├── google/
│   │   ├── sheets.ts             ← Google Sheets utility
│   │   └── drive.ts              ← Google Drive utility
│   ├── auth.ts                   ← NextAuth config
│   └── types.ts                  ← TypeScript types
└── middleware.ts                  ← Route protection
```

---

Dibuat dengan ❤️ untuk Masjid Al-Bina
