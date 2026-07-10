// ============================================================
// Local File Storage Utility — Sistem Tabungan Qurban
// ============================================================
// Menyimpan file bukti transfer ke folder public/uploads di server.
// File bisa diakses via URL langsung: /uploads/filename
// Cocok untuk deployment lokal / VPS.

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export interface UploadResult {
  fileId: string;      // nama file unik
  webViewLink: string; // URL publik untuk akses file
}

/**
 * Simpan file buffer ke folder public/uploads.
 * File dapat diakses via /uploads/<fileName>
 */
export async function uploadFileToLocal(
  buffer: Buffer,
  fileName: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _mimeType: string
): Promise<UploadResult> {
  // Pastikan folder uploads ada
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  const filePath = path.join(UPLOAD_DIR, fileName);
  await writeFile(filePath, buffer);

  return {
    fileId: fileName,
    webViewLink: `/uploads/${fileName}`,
  };
}

/**
 * Kembalikan URL akses file berdasarkan nama file.
 */
export function getFileViewLink(fileName: string): string {
  return `/uploads/${fileName}`;
}
