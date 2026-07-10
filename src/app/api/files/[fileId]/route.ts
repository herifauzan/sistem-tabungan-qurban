// ============================================================
// GET /api/files/[fileId]
// ============================================================
// Melayani file bukti transfer dari Google Sheets.
// Hanya bisa diakses oleh user yang sudah login.
// Admin bisa akses semua file; Jamaah hanya file miliknya.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getFileFromSheets } from '@/lib/storage/sheets-storage';
import { getRows } from '@/lib/google/sheets';

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId } = params;
    if (!fileId || !/^[a-f0-9]{32}$/.test(fileId)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
    }

    // Untuk jamaah biasa: verifikasi bahwa file ini memang miliknya
    if (session.user.role !== 'Admin') {
      const rows = await getRows('Transaksi');
      const ownsFile = rows.some(
        r => r[4] === fileId && r[2] === session.user.id
      );
      if (!ownsFile) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Ambil file dari Google Sheets
    const file = await getFileFromSheets(fileId);
    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 });
    }

    // Kembalikan file sebagai response binary
    return new NextResponse(Buffer.from(file.buffer), {
      status: 200,
      headers: {
        'Content-Type': file.mimeType,
        'Content-Length': file.buffer.length.toString(),
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.fileName)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    console.error('GET /api/files/[fileId] error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
