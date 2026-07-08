// ============================================================
// API Route: GET /api/qurban-types
// ============================================================

import { NextResponse } from 'next/server';
import { getRows } from '@/lib/google/sheets';
import { TipeQurban } from '@/lib/types';

function rowToTipeQurban(row: string[]): TipeQurban {
  return {
    id: row[0] ?? '',
    animalName: row[1] ?? '',
    price: parseFloat(row[2] ?? '0') || 0,
    quota: parseInt(row[3] ?? '0') || 0,
  };
}

export async function GET() {
  try {
    const rows = await getRows('Tipe_Qurban');
    const types = rows.map(rowToTipeQurban);
    return NextResponse.json({ success: true, data: types });
  } catch (err) {
    console.error('GET /api/qurban-types error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
