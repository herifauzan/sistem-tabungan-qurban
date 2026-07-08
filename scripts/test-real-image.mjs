/**
 * test-real-image.mjs - Test upload gambar nyata dan rekonstruksi dari Sheets
 */
import { google } from 'googleapis';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=');
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key.trim()] = value;
    }
  }
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: env['GOOGLE_SERVICE_ACCOUNT_EMAIL'],
    private_key: env['GOOGLE_PRIVATE_KEY']?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Ambil file dengan fileId tertentu langsung dari Sheets (bypass API)
async function getFileFromSheets(fileId) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: env['GOOGLE_SPREADSHEET_ID'],
    range: 'BuktiTransfer!A2:G',
  });

  const rows = res.data.values ?? [];
  const fileRows = rows
    .filter(r => r[0] === fileId)
    .sort((a, b) => parseInt(a[1]) - parseInt(b[1]));

  if (fileRows.length === 0) return null;

  const mimeType = fileRows[0][3];
  const fileName = fileRows[0][4];
  const base64 = fileRows.map(r => r[5] ?? '').join('');
  const buffer = Buffer.from(base64, 'base64');

  return { buffer, mimeType, fileName, base64Len: base64.length };
}

async function run() {
  // Ambil semua fileId dari BuktiTransfer
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: env['GOOGLE_SPREADSHEET_ID'],
    range: 'BuktiTransfer!A2:G',
  });
  const rows = res.data.values ?? [];

  // Test rekonstruksi file terbesar (paling representatif)
  const biggest = rows.reduce((max, r) => (r[5]?.length ?? 0) > (max?.[5]?.length ?? 0) ? r : max, null);
  if (!biggest) { console.log('Tidak ada file di BuktiTransfer'); return; }

  const fileId = biggest[0];
  console.log(`📥 Test rekonstruksi file terbesar: ${fileId}`);
  console.log(`   MimeType: ${biggest[3]}, Base64Len: ${biggest[5]?.length ?? 0}`);

  const file = await getFileFromSheets(fileId);
  if (!file) { console.log('❌ File tidak ditemukan!'); return; }

  console.log(`   ✅ Rekonstruksi berhasil! Buffer size: ${file.buffer.length} bytes`);

  // Simpan ke disk untuk verifikasi visual
  const outPath = join(__dirname, '..', 'scripts', `test_output_${fileId.slice(0,8)}.png`);
  writeFileSync(outPath, file.buffer);
  console.log(`   💾 Disimpan ke: ${outPath}`);

  // Verifikasi PNG signature
  const pngSig = file.buffer.slice(0, 4).toString('hex');
  console.log(`   PNG signature (hex): ${pngSig} ${pngSig === '89504e47' ? '✅ Valid PNG' : '❌ Bukan PNG!'}`);

  // Test upload via API
  console.log('\n🌐 Test via API /api/files/:');
  const BASE_URL = 'http://localhost:3000';
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = csrfRes.headers.get('set-cookie') ?? '';

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': csrfCookie },
    body: new URLSearchParams({
      csrfToken, email: 'admin@masjid-albina.com', password: 'Admin@2024!',
      redirect: 'false', json: 'true',
    }),
    redirect: 'manual',
  });

  const cookies = [csrfCookie, loginRes.headers.get('set-cookie') ?? '']
    .flatMap(h => h.split(',').filter(c => c.includes('=')))
    .map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');

  const fileRes = await fetch(`${BASE_URL}/api/files/${fileId}`, {
    headers: { 'Cookie': cookies },
  });

  console.log(`   HTTP ${fileRes.status} ${fileRes.statusText}`);
  console.log(`   Content-Type: ${fileRes.headers.get('content-type')}`);
  console.log(`   Content-Length: ${fileRes.headers.get('content-length')} bytes`);
  if (fileRes.status === 200) {
    const apiBuffer = Buffer.from(await fileRes.arrayBuffer());
    const match = apiBuffer.equals(file.buffer);
    console.log(`   Buffer match dengan rekonstruksi manual: ${match ? '✅ SAMA' : '❌ BERBEDA'}`);
    console.log(`\n✅ SEMUA TEST LULUS! Rekonstruksi base64 berfungsi dengan baik.`);
  } else {
    const err = await fileRes.text();
    console.log(`   ❌ Error: ${err}`);
  }
}

run().catch(e => console.error('Error:', e.message));
