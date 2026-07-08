/**
 * check-sheets.mjs - Verifikasi data BuktiTransfer di Google Sheets
 */
import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
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

async function check() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: env['GOOGLE_SPREADSHEET_ID'] });
  const sheetNames = meta.data.sheets?.map(s => s.properties?.title) ?? [];
  console.log('📋 Tabs yang ada:', sheetNames.join(', '));

  if (sheetNames.includes('BuktiTransfer')) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: env['GOOGLE_SPREADSHEET_ID'],
      range: 'BuktiTransfer!A1:G5',
    });
    const rows = res.data.values ?? [];
    console.log(`\n✅ Tab BuktiTransfer ditemukan! ${rows.length - 1} data rows.`);
    rows.forEach((row, i) => {
      const display = row.map((cell, j) => j === 5 ? `[Base64: ${cell.length} chars]` : cell);
      console.log(`  Row ${i}: ${display.join(' | ')}`);
    });
  } else {
    console.log('\n❌ Tab BuktiTransfer belum ada!');
  }
}

check().catch(err => console.error('Error:', err.message));
