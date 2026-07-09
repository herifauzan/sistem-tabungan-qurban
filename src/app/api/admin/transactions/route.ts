// ============================================================
// API Route: GET /api/admin/transactions
// Admin: All transactions with user details
// ============================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRows } from '@/lib/google/sheets';
import { getFileViewLink } from '@/lib/google/drive';
import { TransaksiWithUser } from '@/lib/types';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const [transaksiRows, jamaahRows] = await Promise.all([
      getRows('Transaksi'),
      getRows('Jamaah'),
    ]);

    const jamaahMap = new Map(
      jamaahRows.map((r) => [r[0], { name: r[1], phone: r[2] }])
    );

    const transaksis: TransaksiWithUser[] = transaksiRows.map((row) => {
      const user = jamaahMap.get(row[2]);
      return {
        id: row[0] ?? '',
        date: row[1] ?? '',
        userId: row[2] ?? '',
        amount: parseFloat(row[3] ?? '0') || 0,
        receiptDriveFileId: row[4] ?? '',
        receiptWebViewLink: row[4]
          ? /^[a-f0-9]{32}$/.test(row[4])
            ? `/api/files/${row[4]}`
            : `https://drive.google.com/file/d/${row[4]}/view`
          : '',
        status: (row[5] as 'Pending' | 'Approved' | 'Rejected') ?? 'Pending',
        userName: user?.name ?? 'Unknown',
        userPhone: user?.phone ?? '-',
      };
    });

    return NextResponse.json({ success: true, data: transaksis });
  } catch (err) {
    console.error('GET /api/admin/transactions error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
