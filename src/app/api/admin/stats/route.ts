// ============================================================
// API Route: GET /api/admin/stats
// ============================================================

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRows } from '@/lib/google/sheets';
import { AdminStats } from '@/lib/types';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const [jamaahRows, transaksiRows] = await Promise.all([
      getRows('Jamaah'),
      getRows('Transaksi'),
    ]);

    const totalUsers = jamaahRows.filter((r) => r[5] === 'User').length;
    const pendingCount = transaksiRows.filter((r) => r[5] === 'Pending').length;
    const approvedCount = transaksiRows.filter((r) => r[5] === 'Approved').length;
    const totalFunds = transaksiRows
      .filter((r) => r[5] === 'Approved')
      .reduce((sum, r) => sum + (parseFloat(r[3]) || 0), 0);

    const stats: AdminStats = { totalFunds, totalUsers, pendingCount, approvedCount };

    return NextResponse.json({ success: true, data: stats });
  } catch (err) {
    console.error('GET /api/admin/stats error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
