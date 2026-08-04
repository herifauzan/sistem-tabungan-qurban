// ============================================================
// Google Drive Utility — Sistem Tabungan Qurban
// ============================================================
// Handles file uploads to a designated Google Drive folder
// and returns a public webViewLink.

import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
];
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

// ---- Singleton client ----
let driveClient: drive_v3.Drive | null = null;

// ⚡ Bolt: Cache GoogleAuth instance to utilize internal token cache and prevent redundant OAuth network requests
let authClient: InstanceType<typeof google.auth.GoogleAuth> | null = null;

function getAuth() {
  if (!authClient) {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    authClient = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey,
      },
      scopes: SCOPES,
    });
  }
  return authClient;
}

async function getDriveClient(): Promise<drive_v3.Drive> {
  if (!driveClient) {
    const auth = getAuth();
    driveClient = google.drive({ version: 'v3', auth: await auth.getClient() as never });
  }
  return driveClient;
}

// ---- Retry Wrapper ----
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isTransient =
        (err as { code?: number })?.code === 429 ||
        (err as { code?: number })?.code === 503 ||
        (err as { message?: string })?.message?.includes('Rate Limit');
      if (isTransient && attempt < retries) {
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

export interface UploadResult {
  fileId: string;
  webViewLink: string;
}

/**
 * Upload a file buffer to the configured Google Drive folder.
 * Makes the file readable by anyone with the link.
 *
 * @param buffer   - File buffer content
 * @param fileName - Desired file name in Drive
 * @param mimeType - MIME type, e.g. 'image/jpeg'
 */
export async function uploadFileToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<UploadResult> {
  const drive = await getDriveClient();

  // Convert Buffer to readable stream
  const stream = Readable.from(buffer);

  const file = await withRetry(() =>
    drive.files.create({
      requestBody: {
        name: fileName,
        parents: DRIVE_FOLDER_ID ? [DRIVE_FOLDER_ID] : undefined,
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    })
  );

  const fileId = file.data.id!;
  const webViewLink = file.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`;

  // Make the file publicly viewable
  try {
    await withRetry(() =>
      drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
        supportsAllDrives: true,
      })
    );
  } catch (permErr) {
    // Non-fatal: file uploaded but permission setting failed
    console.warn('Warning: could not set public permission on file:', fileId, permErr);
  }

  return { fileId, webViewLink };
}

/**
 * Get the webViewLink for an existing file by ID.
 */
export async function getFileViewLink(fileId: string): Promise<string> {
  const drive = await getDriveClient();
  const res = await withRetry(() =>
    drive.files.get({ fileId, fields: 'webViewLink' })
  );
  return res.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`;
}

/**
 * Delete a file from Drive by ID.
 */
export async function deleteFile(fileId: string): Promise<void> {
  const drive = await getDriveClient();
  await withRetry(() => drive.files.delete({ fileId }));
}
