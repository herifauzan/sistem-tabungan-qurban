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
  findRowIndexById,
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

    // Find transaction row
    const transaksiRowIndex = await findRowIndexById('Transaksi', transaksiId);
    if (transaksiRowIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

    const transaksiRows = await getRows('Transaksi');
    const transaksiRow = transaksiRows.find((r) => r[0] === transaksiId);
    if (!transaksiRow) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

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

      // Sum all Approved transactions for this user
      const allTrans = await getRows('Transaksi');
      const totalSaved = allTrans
        .filter((r) => r[2] === userId && r[5] === 'Approved')
        .reduce((sum, r) => sum + (parseFloat(r[3]) || 0), 0);

      // Update Jamaah Total_Saved
      const jamaahRowIndex = await findRowIndexById('Jamaah', userId);
      if (jamaahRowIndex !== -1) {
        const jamaahRows = await getRows('Jamaah');
        const jamaahRow = jamaahRows.find((r) => r[0] === userId);
        if (jamaahRow) {
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
    }

    return NextResponse.json({ success: true, data: { id: transaksiId, status: action } });
  } catch (err) {
    console.error('PATCH /api/transactions/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
