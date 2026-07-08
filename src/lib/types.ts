// ============================================================
// Shared TypeScript Types — Sistem Tabungan Qurban
// ============================================================

export type UserRole = 'Admin' | 'User';

export type TransactionStatus = 'Pending' | 'Approved' | 'Rejected';

// ---- Jamaah (Users) ----
export interface Jamaah {
  id: string;
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  totalSaved: number;
}

export type JamaahPublic = Omit<Jamaah, 'passwordHash'>;

// ---- Tipe Qurban ----
export interface TipeQurban {
  id: string;
  animalName: string;
  price: number;
  quota: number;
}

// ---- Transaksi (Transactions) ----
export interface Transaksi {
  id: string;
  date: string;          // ISO date string
  userId: string;
  amount: number;
  receiptDriveFileId: string;
  receiptWebViewLink?: string;
  status: TransactionStatus;
}

export interface TransaksiWithUser extends Transaksi {
  userName: string;
  userPhone: string;
}

// ---- API Response Wrappers ----
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ---- Admin Stats ----
export interface AdminStats {
  totalFunds: number;
  totalUsers: number;
  pendingCount: number;
  approvedCount: number;
}

// ---- NextAuth Session Extension ----
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
    };
  }
  interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
  }
}
