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

    // ⚡ Bolt: Replace multiple filter/reduce passes with a single-pass loop
    // This avoids creating temporary arrays and iterating the dataset multiple times,
    // which is critical since the entire Sheets data is loaded into memory.
    let totalUsers = 0;
    for (const r of jamaahRows) {
      if (r[5] === 'User') totalUsers++;
    }

    let pendingCount = 0;
    let approvedCount = 0;
    let totalFunds = 0;
    for (const r of transaksiRows) {
      if (r[5] === 'Pending') {
        pendingCount++;
      } else if (r[5] === 'Approved') {
        approvedCount++;
        totalFunds += parseFloat(r[3]) || 0;
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
