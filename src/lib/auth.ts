// ============================================================
// NextAuth Configuration — Sistem Tabungan Qurban
// ============================================================

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getRows } from '@/lib/google/sheets';
import { Jamaah } from '@/lib/types';

function rowToJamaah(row: string[]): Jamaah {
  return {
    id: row[0] ?? '',
    name: row[1] ?? '',
    phone: row[2] ?? '',
    email: row[3] ?? '',
    passwordHash: row[4] ?? '',
    role: (row[5] as 'Admin' | 'Jamaah' | 'User') ?? 'User',
    totalSaved: parseFloat(row[6] ?? '0') || 0,
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const rows = await getRows('Jamaah');
        const jamaahRow = rows.find(
          (row) => row[3]?.toLowerCase() === credentials.email.toLowerCase()
        );

        if (!jamaahRow) return null;

        const jamaah = rowToJamaah(jamaahRow);
        const isValid = await bcrypt.compare(credentials.password, jamaah.passwordHash);
        if (!isValid) return null;

        return {
          id: jamaah.id,
          name: jamaah.name,
          email: jamaah.email,
          role: jamaah.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 jam
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
