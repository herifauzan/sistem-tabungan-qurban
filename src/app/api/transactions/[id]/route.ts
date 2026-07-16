// ============================================================
// API Route: PATCH /api/transactions/[id]
// Admin: Approve or Reject a transaction
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import {
  getRows,
  updateRow,
} from '@/lib/google/sheets';

const ActionSchema = z.object({
  action: z.enum(['Approved', 'Rejected']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = ActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Aksi tidak valid (Approved/Rejected)' },
        { status: 400 }
      );
    }

    const { action } = parsed.data;
    const transaksiId = params.id;

    // ⚡ Bolt Optimization: Fetch all transactions once to prevent N+1 read bottlenecks
    // Replaces multiple getRows/findRowIndexById calls reducing API quota and latency
    const transaksiRows = await getRows('Transaksi');

    // Find transaction row and compute its 1-based index (+2 because of 0-index and header)
    const txIndex = transaksiRows.findIndex((r) => r[0] === transaksiId);
    if (txIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }
    const transaksiRowIndex = txIndex + 2;
    const transaksiRow = transaksiRows[txIndex];

    // Update transaction status
    await updateRow('Transaksi', transaksiRowIndex, [
      transaksiRow[0], // ID
      transaksiRow[1], // Date
      transaksiRow[2], // User_ID
      transaksiRow[3], // Amount
      transaksiRow[4], // Receipt_Drive_File_ID
      action,          // Status
    ]);

    // If Approved — recalculate user's Total_Saved
    if (action === 'Approved') {
      const userId = transaksiRow[2];
      const approvedAmount = parseFloat(transaksiRow[3]) || 0;

      // Sum all Approved transactions for this user using previously fetched rows
      const totalSaved = transaksiRows
        .filter((r) => r[2] === userId && r[5] === 'Approved' && r[0] !== transaksiId) // exclude current in case it's already counted
        .reduce((sum, r) => sum + (parseFloat(r[3]) || 0), 0);

      // Fetch Jamaah rows once and compute index
      const jamaahRows = await getRows('Jamaah');
      const jamaahIdx = jamaahRows.findIndex((r) => r[0] === userId);

      if (jamaahIdx !== -1) {
        const jamaahRowIndex = jamaahIdx + 2;
        const jamaahRow = jamaahRows[jamaahIdx];
        await updateRow('Jamaah', jamaahRowIndex, [
          jamaahRow[0], // ID
          jamaahRow[1], // Name
          jamaahRow[2], // Phone
          jamaahRow[3], // Email
          jamaahRow[4], // Password_Hash
          jamaahRow[5], // Role
          totalSaved + approvedAmount, // Total_Saved (recalculated)
        ]);
      }
    }

    return NextResponse.json({ success: true, data: { id: transaksiId, status: action } });
  } catch (err) {
    console.error('PATCH /api/transactions/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
