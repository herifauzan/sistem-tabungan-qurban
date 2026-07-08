# Sistem Tabungan Qurban — Masjid Al-Bina

Web application for managing Qurban (Islamic Sacrifice) savings, built with Next.js (App Router), TypeScript, Tailwind CSS, and Google Workspace APIs.

---

## Open Questions

> [!IMPORTANT]
> Please answer these before I start building:

1. **Versi Tailwind**: Spec menyebut Tailwind CSS — apakah menggunakan **Tailwind v3** (stabil) atau **Tailwind v4** (beta)?
2. **Next.js Version**: Gunakan **Next.js 14** (stable App Router) atau **Next.js 15**?
3. **Google Service Account**: Apakah Anda sudah punya Service Account JSON key & Spreadsheet ID, atau saya cukup buat `.env.example` saja?
4. **Logo / Warna Tema**: Apakah ada preferensi warna tema (misal: hijau Islami, emas)? Atau saya pilihkan sendiri?
5. **Bahasa UI**: Apakah UI menggunakan **Bahasa Indonesia** sepenuhnya, atau campuran dengan Bahasa Inggris?

---

## Proposed Changes

### 1. Project Initialization

#### [NEW] `package.json`
- Next.js App Router + TypeScript
- Tailwind CSS
- NextAuth.js (credentials + JWT)
- `googleapis` (Sheets & Drive)
- `bcryptjs` (password hashing)
- `sharp` (image optimization)
- `zod` (validation)

#### [NEW] `.env.example`
```
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SPREADSHEET_ID=
GOOGLE_DRIVE_FOLDER_ID=
```

---

### 2. Project Structure

```
/app
  /api
    /auth/[...nextauth]/route.ts    ← NextAuth handler
    /register/route.ts              ← User registration
    /transactions/route.ts          ← Submit & list transactions
    /transactions/[id]/route.ts     ← Approve / Reject
    /qurban-types/route.ts          ← Fetch Tipe_Qurban
    /admin/stats/route.ts           ← Admin overview stats
  /(auth)
    /login/page.tsx
    /register/page.tsx
  /(dashboard)
    /user/page.tsx                  ← User dashboard
    /admin/page.tsx                 ← Admin dashboard
  /layout.tsx
  /page.tsx                         ← Redirect to login
/lib
  /google/sheets.ts                 ← Google Sheets utility
  /google/drive.ts                  ← Google Drive utility
  /auth.ts                          ← NextAuth config
  /types.ts                         ← Shared TypeScript types
/components
  /ui/ (Button, Card, Badge, Table, Modal, etc.)
  /TransactionForm.tsx
  /TransactionTable.tsx
  /SavingsProgress.tsx
  /AdminStatsCard.tsx
  /ValidationTable.tsx
/middleware.ts                      ← Route protection
Dockerfile
.env.example
```

---

### 3. Google API Utility (`lib/google/`)

#### `sheets.ts`
- Singleton Google Sheets client using service account
- CRUD helpers: `getRows`, `appendRow`, `updateRow`, `findRowById`
- Rate-limit handling with exponential backoff retry (up to 3 retries)

#### `drive.ts`
- Upload file buffer to a specific Google Drive folder
- Return `webViewLink` for the uploaded file
- Error retry on transient failures

---

### 4. API Routes (Backend)

| Route | Method | Description |
|---|---|---|
| `/api/auth/[...nextauth]` | POST | Login (Credentials) |
| `/api/register` | POST | Register new user (role=User) |
| `/api/transactions` | GET | List user's own transactions |
| `/api/transactions` | POST | Submit deposit + upload receipt |
| `/api/transactions/[id]` | PATCH | Admin: Approve / Reject |
| `/api/qurban-types` | GET | List all Tipe_Qurban |
| `/api/admin/stats` | GET | Admin stats (totals, pending count) |

---

### 5. Frontend Pages & Components

#### Authentication
- **Login page**: Email + password form, with logo & Islamic-themed UI
- **Register page**: Name, phone, email, password

#### User Dashboard
- **Savings Progress Bar**: Shows saved amount vs. Qurban price target
- **Transaction Form**: Amount input + receipt image upload (drag & drop)
- **Transaction History Table**: Date, Amount, Status badge (Pending/Approved/Rejected)

#### Admin Dashboard
- **Stats Cards**: Total funds, total users, pending count
- **Validation Table**: Pending transactions with "View Receipt" button (opens modal with Drive image) and Approve/Reject actions

---

### 6. Middleware & Auth

- `middleware.ts` protects `/user/*` and `/admin/*` routes
- Admin routes redirect non-admin users to user dashboard
- Session via JWT (stateless — suitable for Cloud Run)

---

### 7. Dockerfile (Cloud Run optimized)

- Multi-stage build (builder → runner)
- Exposes port **8080**
- Runs as non-root user
- Supports `NEXTAUTH_URL` via env at runtime

---

## Verification Plan

### Manual Verification
1. Run `npm run dev` locally with `.env` filled in
2. Register a new user → verify row appears in Jamaah sheet
3. Submit a transaction with receipt image → verify Drive upload & Transaksi sheet row
4. Log in as Admin → verify stats, approve a transaction → verify Total_Saved updates
5. Test Docker build: `docker build -t tabungan-qurban .`

### Automated
- TypeScript compiler: `npx tsc --noEmit`
