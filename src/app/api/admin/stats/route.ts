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

    // ⚡ Bolt: Single-pass loops for O(N) aggregation, avoiding temporary array allocations from .filter()
    let totalUsers = 0;
    for (let i = 0; i < jamaahRows.length; i++) {
      if (jamaahRows[i][5] === 'User') totalUsers++;
    }

    let pendingCount = 0;
    let approvedCount = 0;
    let totalFunds = 0;
    for (let i = 0; i < transaksiRows.length; i++) {
      const row = transaksiRows[i];
      const status = row[5];
      if (status === 'Pending') {
        pendingCount++;
      } else if (status === 'Approved') {
        approvedCount++;
        totalFunds += parseFloat(row[3]) || 0;
      }
    }

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
