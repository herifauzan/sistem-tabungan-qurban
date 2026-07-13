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

    // Fetch Transaksi once
    // ⚡ Bolt: Reduces API calls from up to 5 to exactly 2.
    // Instead of using findRowIndexById which calls getRows internally,
    // we fetch once, find the index, and calculate the total in memory.
    const transaksiRows = await getRows('Transaksi');

    // Find transaction row
    const rawIdx = transaksiRows.findIndex((r) => r[0] === transaksiId);
    if (rawIdx === -1) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }
    const transaksiRowIndex = rawIdx + 2; // +1 for 0-based to 1-based, +1 for header row
    const transaksiRow = transaksiRows[rawIdx];

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

      // Sum all Approved transactions for this user using in-memory rows
      const totalSaved = transaksiRows
        .filter((r) => r[2] === userId && r[5] === 'Approved')
        .reduce((sum, r) => sum + (parseFloat(r[3]) || 0), 0);

      // Fetch Jamaah once
      const jamaahRows = await getRows('Jamaah');
      const jamaahRawIdx = jamaahRows.findIndex((r) => r[0] === userId);

      if (jamaahRawIdx !== -1) {
        const jamaahRowIndex = jamaahRawIdx + 2;
        const jamaahRow = jamaahRows[jamaahRawIdx];

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
