/**
 * test-upload.mjs
 * Langsung test upload bukti transfer ke API tanpa browser
 */
import { readFileSync, writeFileSync } from 'fs';
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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key.trim()] = value;
    }
  }
}

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('='.repeat(50));
  console.log('🧪 Test Upload Bukti Transfer ke Google Sheets');
  console.log('='.repeat(50));

  // Step 1: Login
  console.log('\n1️⃣  Login sebagai jamaah...');
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const setCookieHeader = csrfRes.headers.get('set-cookie') ?? '';

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': setCookieHeader,
    },
    body: new URLSearchParams({
      csrfToken,
      email: 'jamaah@masjid-albina.com',
      password: 'Jamaah@2024!',
      redirect: 'false',
      json: 'true',
    }).toString(),
    redirect: 'manual',
  });

  // Kumpulkan semua cookies
  const allCookies = [
    setCookieHeader,
    loginRes.headers.get('set-cookie') ?? '',
  ]
    .flatMap(h => h.split(',').filter(c => c.includes('=')))
    .map(c => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');

  console.log(`   Status login: ${loginRes.status}`);

  // Step 2: Verifikasi session
  const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { 'Cookie': allCookies },
  });
  const session = await sessionRes.json();
  if (!session?.user?.id) {
    console.error('❌ Login gagal! Session tidak valid.');
    console.log('   Session response:', JSON.stringify(session, null, 2));
    process.exit(1);
  }
  console.log(`   ✅ Login berhasil! User: ${session.user.name} (${session.user.email})`);

  // Step 3: Buat file gambar PNG kecil (1x1 pixel)
  console.log('\n2️⃣  Membuat file gambar test (PNG 1x1 pixel)...');
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk length + type
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // width=1, height=1
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth, color type, etc.
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, // compressed data
    0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, // CRC
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND
    0x44, 0xAE, 0x42, 0x60, 0x82,                   // IEND data
  ]);
  console.log(`   Ukuran file: ${pngBuffer.length} bytes`);

  // Step 4: Upload via POST /api/transactions
  console.log('\n3️⃣  Mengirim setoran dengan bukti transfer...');
  const formData = new FormData();
  formData.append('amount', '500000');
  formData.append('receipt', new Blob([pngBuffer], { type: 'image/png' }), 'bukti_test.png');

  const transRes = await fetch(`${BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: { 'Cookie': allCookies },
    body: formData,
  });
  const transData = await transRes.json();

  console.log(`   HTTP Status: ${transRes.status}`);
  console.log(`   Response: ${JSON.stringify(transData, null, 2)}`);

  if (transRes.status === 201 && transData.success) {
    console.log('\n✅ Upload BERHASIL!');
    console.log(`   Transaction ID: ${transData.data.id}`);
    console.log(`   Status: ${transData.data.status}`);

    // Step 5: Coba akses file via API
    if (transData.data.fileId) {
      console.log('\n4️⃣  Test akses file via /api/files/[fileId]...');
      const fileRes = await fetch(`${BASE_URL}/api/files/${transData.data.fileId}`, {
        headers: { 'Cookie': allCookies },
      });
      console.log(`   HTTP Status akses file: ${fileRes.status}`);
      if (fileRes.status === 200) {
        const contentType = fileRes.headers.get('content-type');
        const contentLength = fileRes.headers.get('content-length');
        console.log(`   Content-Type: ${contentType}`);
        console.log(`   Content-Length: ${contentLength} bytes`);
        console.log(`   ✅ File berhasil diakses!`);
      }
    }
  } else {
    console.log('\n❌ Upload GAGAL!');
  }

  console.log('\n' + '='.repeat(50));
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
