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

    // ⚡ Bolt: Optimize array aggregations with single-pass O(n) loops to avoid redundant iterations and memory allocations
    let totalUsers = 0;
    for (let i = 0; i < jamaahRows.length; i++) {
      if (jamaahRows[i][5] === 'User') totalUsers++;
    }

    let pendingCount = 0;
    let approvedCount = 0;
    let totalFunds = 0;
    for (let i = 0; i < transaksiRows.length; i++) {
      const status = transaksiRows[i][5];
      if (status === 'Pending') {
        pendingCount++;
      } else if (status === 'Approved') {
        approvedCount++;
        totalFunds += parseFloat(transaksiRows[i][3]) || 0;
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
