/**
 * check-transaksi.mjs - Cek isi tab Transaksi dan BuktiTransfer di Google Sheets
 */
import { google } from 'googleapis';
import { readFileSync } from 'fs';
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

async function run() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // Cek Transaksi
  const txRes = await sheets.spreadsheets.values.get({
    spreadsheetId: env['GOOGLE_SPREADSHEET_ID'],
    range: 'Transaksi!A2:F',
  });
  const txRows = txRes.data.values ?? [];
  console.log('📊 Tab Transaksi:');
  txRows.forEach((r, i) => {
    console.log(`  [${i}] ID=${r[0]} | FileId=${r[4] || '(kosong)'} | Status=${r[5]}`);
  });

  // Cek BuktiTransfer
  const btRes = await sheets.spreadsheets.values.get({
    spreadsheetId: env['GOOGLE_SPREADSHEET_ID'],
    range: 'BuktiTransfer!A2:G',
  });
  const btRows = btRes.data.values ?? [];
  console.log(`\n📁 Tab BuktiTransfer: ${btRows.length} file tersimpan`);
  btRows.forEach((r, i) => {
    console.log(`  [${i}] FileId=${r[0]} | Chunks=${r[1]}/${r[2]} | MimeType=${r[3]} | Base64Len=${r[5]?.length ?? 0}`);
  });

  // Cross-check: apakah setiap transaksi punya file
  console.log('\n🔍 Cross-check Transaksi ↔ BuktiTransfer:');
  const fileIds = new Set(btRows.map(r => r[0]));
  txRows.forEach((r, i) => {
    const fileId = r[4];
    if (!fileId) {
      console.log(`  [${i}] ⚠️  Transaksi tanpa bukti file`);
    } else if (/^[a-f0-9]{32}$/.test(fileId)) {
      const found = fileIds.has(fileId);
      console.log(`  [${i}] ${found ? '✅' : '❌'} fileId=${fileId} ${found ? 'ada di BuktiTransfer' : 'TIDAK ADA di BuktiTransfer!'}`);
    } else {
      console.log(`  [${i}] 📂 Drive fileId (lama): ${fileId}`);
    }
  });
}

run().catch(e => console.error('Error:', e.message));
