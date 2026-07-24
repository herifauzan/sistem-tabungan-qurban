'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { AdminStats, TransaksiWithUser } from '@/lib/types';

// ⚡ Bolt: Cache Intl formatter instances to avoid expensive initialization on every call
const rupiahFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
function formatRupiah(n: number) {
  return rupiahFormatter.format(n);
}

// ⚡ Bolt: Cache Intl formatter instances to avoid expensive initialization on every call
const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
function formatDate(iso: string) {
  if (!iso) return '—';
  return dateFormatter.format(new Date(iso));
}

// ---- Receipt Modal ----
function ReceiptModal({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  // Deteksi apakah ini fileId hex baru (dari Sheets) atau URL Drive lama
  const isLocalFile = url.startsWith('/api/files/');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">Bukti Transfer</h3>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center min-h-64">
          {isLocalFile ? (
            // File dari Sheets storage — tampilkan sebagai gambar
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Bukti Transfer"
              className="max-w-full max-h-96 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML =
                  '<p class="text-slate-500 text-sm p-8">Gagal memuat gambar</p>';
              }}
            />
          ) : (
            // File lama dari Google Drive — tampilkan via iframe
            <iframe
              src={url}
              className="w-full h-96 border-0"
              title="Bukti Transfer"
            />
          )}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline text-sm"
          >
            Buka di Tab Baru →
          </a>
          <button onClick={onClose} className="btn-ghost text-sm">Tutup</button>
        </div>
      </div>
    </div>
  );
}

// ---- Stats Card ----
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="stat-card animate-fadeIn">
      <div className={`stat-icon ${color}`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [transactions, setTransactions] = useState<TransaksiWithUser[]>([]);
  const [filter, setFilter] = useState<'Pending' | 'All'>('Pending');
  const [receiptModal, setReceiptModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, tRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/transactions'),
      ]);
      const sData = await sRes.json();
      const tData = await tRes.json();
      if (sData.success) setStats(sData.data);
      if (tData.success) setTransactions(tData.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleAction(id: string, action: 'Approved' | 'Rejected') {
    setActionLoading(id + action);
    setActionMsg('');
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(`Transaksi berhasil ${action === 'Approved' ? 'disetujui' : 'ditolak'}.`);
        fetchAll();
      } else {
        setActionMsg(`Error: ${data.error}`);
      }
    } finally {
      setActionLoading(null);
    }
  }

  const displayed = filter === 'Pending'
    ? transactions.filter((t) => t.status === 'Pending')
    : transactions;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-amber-100 border border-amber-300 flex items-center justify-center flex-shrink-0">
            <Image src="/logo.png" alt="Logo" width={36} height={36} className="object-contain" />
          </div>
          <div>
            <p className="font-bold text-amber-900 text-sm leading-tight">Masjid Al-Bina</p>
            <p className="text-xs text-amber-600">Dashboard Admin Takmir</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-100 rounded-xl border border-amber-300">
            <span className="text-amber-700 text-xs font-bold">👑 ADMIN</span>
            <span className="text-sm font-medium text-amber-900">{session?.user?.name}</span>
          </div>
          <button
            id="btn-admin-logout"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="btn-ghost text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Keluar
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* HEADING */}
        <div className="animate-fadeIn">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Takmir</h1>
          <p className="text-slate-500 mt-1">Kelola dan validasi setoran tabungan Qurban jamaah.</p>
        </div>

        {/* STATS */}
        {!loading && stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
            <StatCard
              icon="💰"
              label="Total Dana Terkumpul"
              value={formatRupiah(stats.totalFunds)}
              color="bg-green-50"
            />
            <StatCard
              icon="👥"
              label="Total Jamaah"
              value={stats.totalUsers.toString()}
              color="bg-blue-50"
            />
            <StatCard
              icon="⏳"
              label="Menunggu Validasi"
              value={stats.pendingCount.toString()}
              color="bg-amber-50"
            />
            <StatCard
              icon="✅"
              label="Transaksi Disetujui"
              value={stats.approvedCount.toString()}
              color="bg-emerald-50"
            />
          </div>
        )}

        {/* ACTION MESSAGE */}
        {actionMsg && (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm animate-fadeIn">
            ℹ️ {actionMsg}
          </div>
        )}

        {/* TRANSACTIONS TABLE */}
        <div className="card animate-fadeIn" style={{ animationDelay: '0.15s' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Validasi Setoran</h2>
              <p className="text-sm text-slate-500 mt-0.5">Tinjau dan setujui setoran jamaah</p>
            </div>
            <div className="flex gap-2">
              <button
                id="filter-pending"
                className={`btn text-sm px-4 py-2 ${filter === 'Pending' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter('Pending')}
              >
                ⏳ Pending {stats?.pendingCount ? `(${stats.pendingCount})` : ''}
              </button>
              <button
                id="filter-all"
                className={`btn text-sm px-4 py-2 ${filter === 'All' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter('All')}
              >
                📋 Semua
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Memuat data transaksi...
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <span className="text-5xl block mb-3">🎉</span>
              <p className="font-semibold">
                {filter === 'Pending' ? 'Tidak ada setoran yang menunggu validasi!' : 'Belum ada transaksi.'}
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Jamaah</th>
                    <th>Tanggal</th>
                    <th>Jumlah</th>
                    <th>Bukti</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {[...displayed].reverse().map((t) => {
                    const isActing = actionLoading?.startsWith(t.id);
                    return (
                      <tr key={t.id}>
                        <td>
                          <div>
                            <p className="font-semibold text-slate-800">{t.userName}</p>
                            <p className="text-xs text-slate-400">{t.userPhone}</p>
                          </div>
                        </td>
                        <td className="whitespace-nowrap text-slate-600">{formatDate(t.date)}</td>
                        <td className="font-bold text-green-700">{formatRupiah(t.amount)}</td>
                        <td>
                          {t.receiptDriveFileId ? (
                            <button
                            onClick={() => {
                              const fileId = t.receiptDriveFileId;
                              const url = /^[a-f0-9]{32}$/.test(fileId)
                                ? `/api/files/${fileId}`
                                : `https://drive.google.com/file/d/${fileId}/preview`;
                              setReceiptModal(url);
                            }}
                              className="btn-outline text-xs py-1.5 px-3"
                            >
                              🖼️ Lihat
                            </button>
                          ) : '—'}
                        </td>
                        <td>
                          {t.status === 'Pending' && (
                            <span className="badge-pending">⏳ Pending</span>
                          )}
                          {t.status === 'Approved' && (
                            <span className="badge-approved">✅ Disetujui</span>
                          )}
                          {t.status === 'Rejected' && (
                            <span className="badge-rejected">❌ Ditolak</span>
                          )}
                        </td>
                        <td>
                          {t.status === 'Pending' ? (
                            <div className="flex gap-2">
                              <button
                                id={`btn-approve-${t.id}`}
                                onClick={() => handleAction(t.id, 'Approved')}
                                disabled={!!isActing}
                                className="btn-primary text-xs py-1.5 px-3"
                              >
                                {actionLoading === t.id + 'Approved' ? '...' : '✅ Setujui'}
                              </button>
                              <button
                                id={`btn-reject-${t.id}`}
                                onClick={() => handleAction(t.id, 'Rejected')}
                                disabled={!!isActing}
                                className="btn-danger text-xs py-1.5 px-3"
                              >
                                {actionLoading === t.id + 'Rejected' ? '...' : '❌ Tolak'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* RECEIPT MODAL */}
      {receiptModal && (
        <ReceiptModal url={receiptModal} onClose={() => setReceiptModal(null)} />
      )}
    </div>
  );
}
