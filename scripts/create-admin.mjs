/**
 * create-admin.mjs
 * Membuat akun Admin pertama langsung ke Google Sheets
 * Jalankan: node scripts/create-admin.mjs
 */

import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHash } from 'crypto';

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

const auth = new google.auth.GoogleAuth({
  credentials: { client_email: CLIENT_EMAIL, private_key: PRIVATE_KEY },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// bcrypt hash untuk "Admin@2024!"
// Pre-computed agar tidak perlu install bcrypt di script
// Gunakan: node -e "const b=require('bcryptjs');b.hash('Admin@2024!',12).then(h=>console.log(h))"
// Tapi kita langsung panggil bcryptjs via require
async function run() {
  console.log('='.repeat(50));
  console.log('👑 Membuat Akun Admin — Masjid Al-Bina');
  console.log('='.repeat(50));

  // Gunakan bcryptjs yang sudah ada di node_modules
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  let bcrypt;
  try {
    bcrypt = require('bcryptjs');
  } catch {
    console.error('❌ bcryptjs tidak ditemukan. Jalankan: npm install');
    process.exit(1);
  }

  const adminData = {
    email: 'admin@masjid-albina.com',
    password: 'Admin@2024!',
    name: 'Admin Takmir',
    phone: '081234567890',
  };

  console.log(`📧 Email   : ${adminData.email}`);
  console.log(`🔐 Password: ${adminData.password}`);
  console.log('');

  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  // Cek apakah email sudah ada
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Jamaah!A2:G',
  });
  const rows = res.data.values ?? [];
  const exists = rows.some(r => r[3]?.toLowerCase() === adminData.email.toLowerCase());

  if (exists) {
    const existingRow = rows.find(r => r[3]?.toLowerCase() === adminData.email.toLowerCase());
    if (existingRow?.[5] === 'Admin') {
      console.log('✅ Akun Admin sudah ada! Login dengan:');
      console.log(`   Email   : ${adminData.email}`);
      console.log(`   Password: ${adminData.password}`);
      return;
    } else {
      console.log('⚠️  Email sudah ada tapi bukan Admin. Update role ke Admin...');
      // Find row index and update role
      const rowIndex = rows.findIndex(r => r[3]?.toLowerCase() === adminData.email.toLowerCase());
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Jamaah!F${rowIndex + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['Admin']] },
      });
      console.log('✅ Role berhasil diubah ke Admin');
      return;
    }
  }

  // Hash password
  console.log('🔒 Hashing password...');
  const passwordHash = await bcrypt.hash(adminData.password, 12);

  // Generate ID
  const adminId = `ADMIN-${Date.now()}`;

  // Append ke sheet Jamaah
  // Schema: ID | Nama | No_HP | Email | Password_Hash | Role | Total_Saved
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Jamaah!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        adminId,
        adminData.name,
        adminData.phone,
        adminData.email,
        passwordHash,
        'Admin',
        0,
      ]],
    },
  });

  console.log('✅ Akun Admin berhasil dibuat!');
  console.log('');
  console.log('='.repeat(50));
  console.log('📝 KREDENSIAL LOGIN ADMIN:');
  console.log(`   Email   : ${adminData.email}`);
  console.log(`   Password: ${adminData.password}`);
  console.log('='.repeat(50));
  console.log('');
  console.log('🚀 Buka: http://localhost:3000/login');
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
