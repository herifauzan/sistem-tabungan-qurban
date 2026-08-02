// ============================================================
// Google Sheets File Storage — Sistem Tabungan Qurban
// ============================================================
// Menyimpan file bukti transfer sebagai base64 di tab "BuktiTransfer"
// pada Google Spreadsheet yang sama.
//
// Schema tab BuktiTransfer:
//   A: FileId       — ID unik file (dipakai sebagai kode akses)
//   B: ChunkIdx     — Indeks chunk (0, 1, 2, ...)
//   C: TotalChunks  — Total jumlah chunk untuk file ini
//   D: MimeType     — Tipe MIME file (image/jpeg, image/png, ...)
//   E: FileName     — Nama asli file
//   F: ChunkData    — Data base64 untuk chunk ini
//   G: CreatedAt    — Waktu upload (ISO string)

import { google, sheets_v4 } from 'googleapis';
import { randomBytes } from 'crypto';

const SHEET_NAME = 'BuktiTransfer';
const CHUNK_SIZE = 40_000; // max chars per cell (Google Sheets safe limit)
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

function getAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

// ⚡ Bolt: Cache Google Sheets client to utilize internal GoogleAuth token cache.
// Re-instantiating GoogleAuth circumvents caching and causes severe latency due to redundant OAuth network requests.
let sheetsClient: sheets_v4.Sheets | null = null;

async function getSheetsClient() {
  if (!sheetsClient) {
    const auth = getAuth();
    sheetsClient = google.sheets({ version: 'v4', auth: await auth.getClient() as never });
  }
  return sheetsClient;
}

// ---- Pastikan header sheet ada ----
// ⚡ Bolt: Cache ensureSheetExists promise so it only checks once per instance lifecycle
let ensureSheetPromise: Promise<void> | null = null;
async function ensureSheetExists() {
  if (!ensureSheetPromise) {
    ensureSheetPromise = (async () => {
      const sheets = await getSheetsClient();
      // Cek apakah sheet BuktiTransfer sudah ada
      const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sheetNames = meta.data.sheets?.map(s => s.properties?.title) ?? [];

      if (!sheetNames.includes(SHEET_NAME)) {
        // Buat tab baru
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [{
              addSheet: {
                properties: { title: SHEET_NAME },
              },
            }],
          },
        });

        // Tambah header row
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['FileId', 'ChunkIdx', 'TotalChunks', 'MimeType', 'FileName', 'ChunkData', 'CreatedAt']],
          },
        });
      }
    })();
  }
  return ensureSheetPromise;
}

// ============================================================
// Public API
// ============================================================

export interface UploadResult {
  fileId: string;
  webViewLink: string; // URL API route untuk akses file
}

/**
 * Simpan file sebagai base64 di Google Sheets.
 * File dibagi per chunk agar tidak melebihi batas cell.
 *
 * @param buffer   - Konten file
 * @param fileName - Nama file asli
 * @param mimeType - Tipe MIME
 * @returns fileId dan URL akses
 */
export async function uploadFileToSheets(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<UploadResult> {
  await ensureSheetExists();

  const sheets = await getSheetsClient();
  const fileId = randomBytes(16).toString('hex'); // 32-char unique ID
  const base64 = buffer.toString('base64');
  const createdAt = new Date().toISOString();

  // Bagi base64 menjadi chunks
  const chunks: string[] = [];
  for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
    chunks.push(base64.slice(i, i + CHUNK_SIZE));
  }
  const totalChunks = chunks.length;

  // Append satu row per chunk
  const rows = chunks.map((chunkData, idx) => [
    fileId,
    idx,
    totalChunks,
    mimeType,
    fileName,
    chunkData,
    createdAt,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });

  return {
    fileId,
    webViewLink: `/api/files/${fileId}`,
  };
}

/**
 * Ambil file dari Google Sheets berdasarkan fileId.
 * Mengembalikan buffer dan metadata file.
 */
export async function getFileFromSheets(fileId: string): Promise<{
  buffer: Buffer;
  mimeType: string;
  fileName: string;
} | null> {
  await ensureSheetExists();

  const sheets = await getSheetsClient();

  // ⚡ Bolt: Fetch only FileIds first to avoid downloading all base64 data for all files
  const idRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:A`,
  });

  const idRows = idRes.data.values ?? [];

  let startIdx = -1;
  let endIdx = -1;

  for (let i = 0; i < idRows.length; i++) {
    if (idRows[i][0] === fileId) {
      if (startIdx === -1) startIdx = i;
      endIdx = i;
    }
  }

  if (startIdx === -1) return null;

  // Convert to 1-based row numbers, A2 starts at index 0 + 2 = row 2
  const startRow = startIdx + 2;
  const endRow = endIdx + 2;

  // ⚡ Bolt: Fetch only the specific row range containing the requested file's chunks
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${startRow}:G${endRow}`,
  });

  const rows = res.data.values ?? [];
  // Filter baris yang sesuai fileId dan sort berdasarkan ChunkIdx
  const fileRows = rows
    .filter(r => r[0] === fileId)
    .sort((a, b) => parseInt(a[1]) - parseInt(b[1]));

  if (fileRows.length === 0) return null;

  const mimeType = fileRows[0][3] ?? 'application/octet-stream';
  const fileName = fileRows[0][4] ?? 'file';
  const base64 = fileRows.map(r => r[5] ?? '').join('');
  const buffer = Buffer.from(base64, 'base64');

  return { buffer, mimeType, fileName };
}

/**
 * Hapus file dari Google Sheets berdasarkan fileId.
 * (Menghapus semua baris yang berhubungan dengan fileId)
 */
export async function deleteFileFromSheets(fileId: string): Promise<void> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:A`,
  });

  const rows = res.data.values ?? [];
  // Temukan row indices yang perlu dihapus (dalam urutan terbalik)
  const rowIndicesToDelete = rows
    .map((r, i) => ({ fileId: r[0], rowIndex: i + 2 }))
    .filter(item => item.fileId === fileId)
    .map(item => item.rowIndex)
    .reverse();

  if (rowIndicesToDelete.length === 0) return;

  // Ambil sheet ID
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets?.find(s => s.properties?.title === SHEET_NAME);
  const sheetId = sheet?.properties?.sheetId;

  if (sheetId == null) return;

  // Hapus rows (dari bawah ke atas agar index tidak bergeser)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: rowIndicesToDelete.map(rowIdx => ({
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIdx - 1, // 0-indexed
            endIndex: rowIdx,        // exclusive
          },
        },
      })),
    },
  });
}
