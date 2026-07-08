// ============================================================
// API Route: POST /api/register
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getRows, appendRow, generateId } from '@/lib/google/sheets';

const RegisterSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  phone: z.string().min(8, 'Nomor HP tidak valid'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, phone, email, password } = parsed.data;

    // Check if email already exists
    const rows = await getRows('Jamaah');
    const exists = rows.some(
      (row) => row[3]?.toLowerCase() === email.toLowerCase()
    );
    if (exists) {
      return NextResponse.json(
        { success: false, error: 'Email sudah terdaftar' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = generateId();

    // Schema: ID | Name | Phone | Email | Password_Hash | Role | Total_Saved
    await appendRow('Jamaah', [id, name, phone, email, passwordHash, 'User', 0]);

    return NextResponse.json({ success: true, data: { id, name, email } }, { status: 201 });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
