/**
 * create-jamaah.mjs
 * Membuat akun Jamaah (non-admin) contoh langsung ke Google Sheets
 * Jalankan: node scripts/create-jamaah.mjs
 */

import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

const jamaahData = {
  email: 'jamaah@masjid-albina.com',
  password: 'Jamaah@2024!',
  name: 'Ahmad Jamaah',
  phone: '081234500001',
};

async function run() {
  console.log('='.repeat(50));
  console.log('👤 Membuat Akun Jamaah — Masjid Al-Bina');
  console.log('='.repeat(50));
  console.log(`📧 Email   : ${jamaahData.email}`);
  console.log(`🔐 Password: ${jamaahData.password}`);
  console.log('');

  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  let bcrypt;
  try {
    bcrypt = require('bcryptjs');
  } catch {
    console.error('❌ bcryptjs tidak ditemukan. Jalankan: npm install');
    process.exit(1);
  }

  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  // Cek apakah email sudah ada
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Jamaah!A2:G',
  });
  const rows = res.data.values ?? [];
  const exists = rows.some(r => r[3]?.toLowerCase() === jamaahData.email.toLowerCase());

  if (exists) {
    console.log('✅ Akun Jamaah sudah ada! Login dengan:');
    console.log(`   Email   : ${jamaahData.email}`);
    console.log(`   Password: ${jamaahData.password}`);
    return;
  }

  // Hash password
  console.log('🔒 Hashing password...');
  const passwordHash = await bcrypt.hash(jamaahData.password, 12);

  // Generate ID
  const jamaahId = `JMH-${Date.now()}`;

  // Schema: ID | Nama | No_HP | Email | Password_Hash | Role | Total_Saved
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Jamaah!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        jamaahId,
        jamaahData.name,
        jamaahData.phone,
        jamaahData.email,
        passwordHash,
        'Jamaah',
        0,
      ]],
    },
  });

  console.log('✅ Akun Jamaah berhasil dibuat!');
  console.log('');
  console.log('='.repeat(50));
  console.log('📝 KREDENSIAL LOGIN JAMAAH:');
  console.log(`   Email   : ${jamaahData.email}`);
  console.log(`   Password: ${jamaahData.password}`);
  console.log('='.repeat(50));
  console.log('');
  console.log('🚀 Buka: http://localhost:3000/login');
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
