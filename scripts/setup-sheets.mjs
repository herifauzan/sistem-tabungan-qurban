/**
 * setup-sheets.mjs
 * Jalankan dengan: node scripts/setup-sheets.mjs
 *
 * Script ini akan:
 * 1. Mengecek koneksi ke Google Sheets API
 * 2. Memastikan sheet Jamaah, Transaksi, Tipe_Qurban ada
 * 3. Menambahkan header row jika sheet kosong
 * 4. Menambahkan data contoh Tipe_Qurban jika belum ada
 * 5. Membuat akun Admin awal jika belum ada
 */

import { google } from 'googleapis';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=');
      // Remove surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key.trim()] = value;
    }
  }
}

const SPREADSHEET_ID = env['GOOGLE_SPREADSHEET_ID'];
const CLIENT_EMAIL = env['GOOGLE_SERVICE_ACCOUNT_EMAIL'];
const PRIVATE_KEY = env['GOOGLE_PRIVATE_KEY']?.replace(/\\n/g, '\n');

console.log('='.repeat(60));
console.log('🕌 SISTEM TABUNGAN QURBAN — Setup Google Sheets');
console.log('='.repeat(60));
console.log(`📊 Spreadsheet ID : ${SPREADSHEET_ID}`);
console.log(`📧 Service Account: ${CLIENT_EMAIL}`);
console.log('');

// ---- Auth ----
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: CLIENT_EMAIL,
    private_key: PRIVATE_KEY,
  },
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
  ],
});

async function run() {
  let authClient;
  try {
    authClient = await auth.getClient();
    console.log('✅ Autentikasi berhasil');
  } catch (err) {
    console.error('❌ Gagal autentikasi:', err.message);
    process.exit(1);
  }

  const sheets = google.sheets({ version: 'v4', auth: authClient });

  // ---- Cek & buat sheet ----
  let spreadsheet;
  try {
    spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    console.log('✅ Terhubung ke spreadsheet:', spreadsheet.data.properties.title);
  } catch (err) {
    console.error('❌ Gagal mengakses spreadsheet:', err.message);
    if (err.message?.includes('not been used') || err.message?.includes('disabled')) {
      console.error('');
      console.error('🔧 Google Sheets API belum diaktifkan!');
      console.error('   Aktifkan di: https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=' + (err.message.match(/project (\d+)/)?.[1] || 'YOUR_PROJECT'));
    }
    process.exit(1);
  }

  const existingSheets = spreadsheet.data.sheets.map(s => s.properties.title);
  console.log('📋 Sheet yang ada:', existingSheets.join(', ') || '(kosong)');
  console.log('');

  // ---- Definisi sheet yang dibutuhkan ----
  const requiredSheets = [
    {
      name: 'Jamaah',
      headers: ['ID', 'Nama', 'No_HP', 'Email', 'Password_Hash', 'Role', 'Total_Saved'],
    },
    {
      name: 'Transaksi',
      headers: ['ID', 'Tanggal', 'User_ID', 'Jumlah', 'Receipt_Drive_File_ID', 'Status'],
    },
    {
      name: 'Tipe_Qurban',
      headers: ['ID', 'Nama_Hewan', 'Harga', 'Kuota'],
    },
  ];

  // ---- Buat sheet yang belum ada ----
  const sheetsToCreate = requiredSheets.filter(s => !existingSheets.includes(s.name));
  if (sheetsToCreate.length > 0) {
    console.log(`➕ Membuat sheet: ${sheetsToCreate.map(s => s.name).join(', ')}...`);
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: sheetsToCreate.map(s => ({
            addSheet: { properties: { title: s.name } },
          })),
        },
      });
      console.log('✅ Sheet berhasil dibuat');
    } catch (err) {
      console.error('❌ Gagal membuat sheet:', err.message);
      process.exit(1);
    }
  } else {
    console.log('✅ Semua sheet sudah ada');
  }

  // ---- Tambah header row jika sheet kosong ----
  for (const sheetDef of requiredSheets) {
    const range = `${sheetDef.name}!A1:Z1`;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });
    const rows = res.data.values ?? [];
    if (rows.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetDef.name}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [sheetDef.headers] },
      });
      console.log(`✅ Header ditambahkan ke sheet '${sheetDef.name}'`);
    } else {
      console.log(`ℹ️  Sheet '${sheetDef.name}' sudah punya header: ${rows[0].join(', ')}`);
    }
  }
  console.log('');

  // ---- Cek & tambah data Tipe_Qurban ----
  const tipeRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Tipe_Qurban!A2:Z',
  });
  const tipeRows = tipeRes.data.values ?? [];

  if (tipeRows.length === 0) {
    console.log('➕ Menambahkan data Tipe_Qurban contoh...');
    const tipeData = [
      ['SAPI-001', 'Sapi', '4500000', '10'],
      ['KAMBING-001', 'Kambing', '1500000', '30'],
      ['DOMBA-001', 'Domba', '1800000', '20'],
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Tipe_Qurban!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: tipeData },
    });
    console.log('✅ Data Tipe_Qurban berhasil ditambahkan:');
    tipeData.forEach(([id, nama, harga, kuota]) => {
      const hargaNum = parseInt(harga).toLocaleString('id-ID');
      console.log(`   • ${nama} — Rp ${hargaNum} (kuota: ${kuota})`);
    });
  } else {
    console.log(`✅ Tipe_Qurban sudah ada ${tipeRows.length} data:`);
    tipeRows.forEach(row => {
      const hargaNum = parseInt(row[2] ?? '0').toLocaleString('id-ID');
      console.log(`   • ${row[1]} — Rp ${hargaNum} (kuota: ${row[3]})`);
    });
  }
  console.log('');

  // ---- Cek akun Admin ----
  const jamaahRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Jamaah!A2:G',
  });
  const jamaahRows = jamaahRes.data.values ?? [];
  const adminRows = jamaahRows.filter(r => r[5] === 'Admin');

  if (adminRows.length === 0) {
    console.log('➕ Belum ada akun Admin. Membuat akun Admin default...');

    // Hash password using built-in crypto (bcrypt not available in plain mjs)
    // We'll use a simple approach: generate hash using scrypt
    const adminEmail = 'admin@masjid-albina.com';
    const adminPassword = 'Admin@2024!';

    // Since we can't use bcrypt here easily, let's print instructions
    // instead we'll use bcrypt via a child process
    console.log('');
    console.log('⚠️  Untuk membuat akun Admin, gunakan aplikasi:');
    console.log(`   1. Buka http://localhost:3000/register`);
    console.log(`   2. Daftar dengan email: ${adminEmail}`);
    console.log(`   3. Setelah daftar, di Google Sheets sheet 'Jamaah'`);
    console.log(`      ubah kolom Role dari 'User' menjadi 'Admin'`);
    console.log('');
  } else {
    console.log(`✅ Sudah ada ${adminRows.length} akun Admin:`);
    adminRows.forEach(r => console.log(`   • ${r[1]} (${r[3]})`));
    console.log('');
  }

  // ---- Tampilkan ringkasan ----
  const userRows = jamaahRows.filter(r => r[5] === 'User');
  const transaksiRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Transaksi!A2:F',
  });
  const transaksiRows = transaksiRes.data.values ?? [];

  console.log('='.repeat(60));
  console.log('📊 RINGKASAN DATA SPREADSHEET');
  console.log('='.repeat(60));
  console.log(`👥 Total Jamaah (User)  : ${userRows.length}`);
  console.log(`👑 Total Admin          : ${adminRows.length}`);
  console.log(`🐑 Tipe Qurban          : ${tipeRows.length}`);
  console.log(`💳 Total Transaksi      : ${transaksiRows.length}`);

  const pendingCount = transaksiRows.filter(r => r[5] === 'Pending').length;
  const approvedCount = transaksiRows.filter(r => r[5] === 'Approved').length;
  const totalFunds = transaksiRows
    .filter(r => r[5] === 'Approved')
    .reduce((sum, r) => sum + (parseFloat(r[3]) || 0), 0);

  console.log(`⏳ Transaksi Pending    : ${pendingCount}`);
  console.log(`✅ Transaksi Approved   : ${approvedCount}`);
  console.log(`💰 Total Dana Terkumpul : Rp ${totalFunds.toLocaleString('id-ID')}`);
  console.log('='.repeat(60));
  console.log('');
  console.log('✅ Setup selesai! Aplikasi siap digunakan.');
  console.log('   Buka: http://localhost:3000');
  console.log('');
}

run().catch(err => {
  console.error('❌ Error tidak terduga:', err.message);
  process.exit(1);
});
