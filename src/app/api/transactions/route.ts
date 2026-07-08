// ============================================================
// API Route: GET & POST /api/transactions
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { getRows, appendRow, generateId } from '@/lib/google/sheets';
import { uploadFileToSheets } from '@/lib/storage/sheets-storage';
import { Transaksi } from '@/lib/types';

function rowToTransaksi(row: string[]): Transaksi {
  return {
    id: row[0] ?? '',
    date: row[1] ?? '',
    userId: row[2] ?? '',
    amount: parseFloat(row[3] ?? '0') || 0,
    receiptDriveFileId: row[4] ?? '',
    status: (row[5] as 'Pending' | 'Approved' | 'Rejected') ?? 'Pending',
  };
}

// GET /api/transactions — list logged-in user's transactions
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await getRows('Transaksi');
    let transaksis: Transaksi[];

    if (session.user.role === 'Admin') {
      // Admin sees all
      transaksis = rows.map(rowToTransaksi);
    } else {
      // User sees only their own
      transaksis = rows
        .filter((row) => row[2] === session.user.id)
        .map(rowToTransaksi);
    }

    return NextResponse.json({ success: true, data: transaksis });
  } catch (err) {
    console.error('GET /api/transactions error:', err);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

const SubmitSchema = z.object({
  amount: z.number().positive('Jumlah harus lebih dari 0'),
});

// POST /api/transactions — submit new deposit
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const amountStr = formData.get('amount') as string;
    const receiptFile = formData.get('receipt') as File | null;

    const parsed = SubmitSchema.safeParse({ amount: parseFloat(amountStr) });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    if (!receiptFile) {
      return NextResponse.json(
        { success: false, error: 'Bukti transfer wajib diunggah' },
        { status: 400 }
      );
    }

    // Simpan bukti transfer ke Google Sheets sebagai base64
    const buffer = Buffer.from(await receiptFile.arrayBuffer());
    const mimeType = receiptFile.type || 'image/jpeg';
    const ext = receiptFile.name.split('.').pop() ?? 'jpg';
    const fileName = `receipt_${session.user.id}_${Date.now()}.${ext}`;

    let fileId = '';
    try {
      const result = await uploadFileToSheets(buffer, fileName, mimeType);
      fileId = result.fileId;
    } catch (uploadErr: unknown) {
      const errMsg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
      console.warn('⚠️ Upload file ke Sheets gagal (transaksi tetap disimpan):', errMsg);
    }

    const id = generateId();
    const date = new Date().toISOString();

    // Schema: ID | Date | User_ID | Amount | Receipt_Drive_File_ID | Status
    await appendRow('Transaksi', [
      id,
      date,
      session.user.id,
      parsed.data.amount,
      fileId,
      'Pending',
    ]);

    return NextResponse.json({ success: true, data: { id, status: 'Pending' } }, { status: 201 });
  } catch (err) {
    console.error('POST /api/transactions error:', err);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
