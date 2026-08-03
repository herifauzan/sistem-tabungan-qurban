// ============================================================
// Google Sheets Utility — Sistem Tabungan Qurban
// ============================================================
// Provides CRUD operations against Google Sheets with
// exponential-backoff retry for rate-limit handling.

import { google, sheets_v4 } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

// ---- Singleton client ----
let sheetsClient: sheets_v4.Sheets | null = null;
// ⚡ Bolt: Cache GoogleAuth instance to prevent redundant token network requests and private key re-parsing
let cachedAuth: InstanceType<typeof google.auth.GoogleAuth> | null = null;

function getAuth() {
  if (!cachedAuth) {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    cachedAuth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey,
      },
      scopes: SCOPES,
    });
  }
  return cachedAuth;
}

async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (!sheetsClient) {
    const auth = getAuth();
    sheetsClient = google.sheets({ version: 'v4', auth: await auth.getClient() as never });
  }
  return sheetsClient;
}

// ---- Retry Wrapper ----
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isRateLimit =
        (err as { code?: number })?.code === 429 ||
        (err as { message?: string })?.message?.includes('Quota');
      if (isRateLimit && attempt < retries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

// ============================================================
// Public API
// ============================================================

/**
 * Fetch all rows from a sheet (excluding header row).
 * Returns rows as string[][] — caller should map to typed objects.
 */
export async function getRows(sheetName: string): Promise<string[][]> {
  const sheets = await getSheetsClient();
  return withRetry(async () => {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A2:Z`,
    });
    return (res.data.values as string[][]) ?? [];
  });
}

/**
 * Append a new row to the sheet.
 */
export async function appendRow(sheetName: string, values: (string | number)[]): Promise<void> {
  const sheets = await getSheetsClient();
  await withRetry(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    })
  );
}

/**
 * Update a single cell range.
 */
export async function updateCell(range: string, value: string | number): Promise<void> {
  const sheets = await getSheetsClient();
  await withRetry(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[value]] },
    })
  );
}

/**
 * Update an entire row by its 1-based row index.
 */
export async function updateRow(
  sheetName: string,
  rowIndex: number,
  values: (string | number)[]
): Promise<void> {
  const sheets = await getSheetsClient();
  const colEnd = String.fromCharCode(64 + values.length);
  const range = `${sheetName}!A${rowIndex}:${colEnd}${rowIndex}`;
  await withRetry(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    })
  );
}

/**
 * Find the 1-based row index of a row where column 0 matches `id`.
 * Returns -1 if not found. `startRow` is 2 (skipping header).
 */
export async function findRowIndexById(sheetName: string, id: string): Promise<number> {
  const rows = await getRows(sheetName);
  const idx = rows.findIndex((row) => row[0] === id);
  if (idx === -1) return -1;
  return idx + 2; // +1 for 0-based→1-based, +1 for header row
}

/**
 * Generate a simple unique ID using timestamp + random.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
