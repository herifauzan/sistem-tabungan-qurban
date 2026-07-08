'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Transaksi, TipeQurban } from '@/lib/types';

// ---- Helpers ----
function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Pending: 'badge-pending',
    Approved: 'badge-approved',
    Rejected: 'badge-rejected',
  };
  const label: Record<string, string> = {
    Pending: '⏳ Menunggu',
    Approved: '✅ Disetujui',
    Rejected: '❌ Ditolak',
  };
  return <span className={map[status] ?? 'badge'}>{label[status] ?? status}</span>;
}

// ---- Main Page ----
export default function UserDashboard() {
  const { data: session } = useSession();
  const [transaksis, setTransaksis] = useState<Transaksi[]>([]);
  const [qurbanTypes, setQurbanTypes] = useState<TipeQurban[]>([]);
  const [selectedType, setSelectedType] = useState<TipeQurban | null>(null);
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState({ text: '', type: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, qRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/qurban-types'),
      ]);
      const tData = await tRes.json();
      const qData = await qRes.json();
      if (tData.success) setTransaksis(tData.data);
      if (qData.success) {
        setQurbanTypes(qData.data);
        if (qData.data.length > 0) setSelectedType(qData.data[0]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalSaved = transaksis
    .filter((t) => t.status === 'Approved')
    .reduce((sum, t) => sum + t.amount, 0);

  const targetPrice = selectedType?.price ?? 0;
  const progress = targetPrice > 0 ? Math.min((totalSaved / targetPrice) * 100, 100) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!receipt) { setSubmitMsg({ text: 'Mohon unggah bukti transfer.', type: 'error' }); return; }
    if (!amount || parseFloat(amount) <= 0) { setSubmitMsg({ text: 'Masukkan jumlah setoran yang valid.', type: 'error' }); return; }

    setSubmitting(true);
    setSubmitMsg({ text: '', type: '' });
    try {
      const fd = new FormData();
      fd.append('amount', amount);
      fd.append('receipt', receipt);

      const res = await fetch('/api/transactions', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setSubmitMsg({ text: 'Setoran berhasil dikirim! Menunggu validasi admin.', type: 'success' });
        setAmount('');
        setReceipt(null);
        fetchData();
      } else {
        setSubmitMsg({ text: data.error || 'Gagal mengirim setoran.', type: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) setReceipt(file);
  }

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
            <p className="text-xs text-amber-600">Tabungan Qurban</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-100/80 rounded-xl border border-amber-300">
            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
              {session?.user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span className="text-sm font-medium text-amber-900">{session?.user?.name}</span>
          </div>
          <button
            id="btn-logout"
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

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* GREETING */}
        <div className="animate-fadeIn">
          <h1 className="text-2xl font-bold text-slate-900">
            Assalamu&apos;alaikum, {session?.user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 mt-1">Pantau dan kelola tabungan Qurban Anda di sini.</p>
        </div>

        {/* PROGRESS SECTION */}
        {!loading && (
          <div className="card animate-fadeIn" style={{ animationDelay: '0.05s' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Progress Tabungan</h2>
                <p className="text-sm text-slate-500 mt-0.5">Target hewan Qurban yang dipilih</p>
              </div>
              {qurbanTypes.length > 0 && (
                <select
                  id="select-qurban-type"
                  className="input max-w-xs text-sm"
                  value={selectedType?.id ?? ''}
                  onChange={(e) => {
                    const t = qurbanTypes.find((q) => q.id === e.target.value);
                    if (t) setSelectedType(t);
                  }}
                >
                  {qurbanTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.animalName} — {formatRupiah(t.price)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Terkumpul</p>
                <p className="text-xl font-bold text-green-700">{formatRupiah(totalSaved)}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl">
                <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1">Target</p>
                <p className="text-xl font-bold text-amber-700">{formatRupiah(targetPrice)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Sisa</p>
                <p className="text-xl font-bold text-slate-700">{formatRupiah(Math.max(targetPrice - totalSaved, 0))}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-slate-500">0%</span>
              <span className="text-sm font-bold text-green-600">{progress.toFixed(1)}%</span>
              <span className="text-xs text-slate-500">100%</span>
            </div>

            {progress >= 100 && (
              <div className="mt-4 p-3 bg-green-50 rounded-xl text-center text-green-700 font-semibold text-sm">
                🎉 Alhamdulillah! Target tabungan Qurban Anda sudah tercapai!
              </div>
            )}
          </div>
        )}

        {/* SUBMIT FORM */}
        <div className="card animate-fadeIn" style={{ animationDelay: '0.10s' }}>
          <h2 className="text-lg font-bold text-slate-800 mb-5">Setor Tabungan</h2>

          {submitMsg.text && (
            <div className={`mb-5 p-4 rounded-xl text-sm flex items-center gap-2 ${
              submitMsg.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              <span>{submitMsg.type === 'success' ? '✅' : '❌'}</span>
              {submitMsg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="form-group">
              <label htmlFor="deposit-amount" className="label">Jumlah Setoran (Rp)</label>
              <input
                id="deposit-amount"
                type="number"
                className="input"
                placeholder="Contoh: 500000"
                min="1000"
                step="1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Bukti Transfer</label>
              <div
                className={`dropzone ${dragActive ? 'drag-active' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                {receipt ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">🖼️</span>
                    <p className="font-semibold text-slate-700 text-sm">{receipt.name}</p>
                    <p className="text-xs text-slate-400">{(receipt.size / 1024).toFixed(1)} KB</p>
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:text-red-700"
                      onClick={(e) => { e.stopPropagation(); setReceipt(null); }}
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-4xl mb-2">📤</span>
                    <p className="font-semibold text-slate-600">Klik atau drag & drop bukti transfer</p>
                    <p className="text-xs text-slate-400 mt-1">Format: JPG, PNG, WEBP (maks. 5MB)</p>
                  </>
                )}
              </div>
              <input
                id="file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setReceipt(f);
                }}
              />
            </div>

            <button
              id="btn-submit-deposit"
              type="submit"
              className="btn-primary w-full py-3"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Mengunggah...
                </>
              ) : '💚 Kirim Setoran'}
            </button>
          </form>
        </div>

        {/* TRANSACTION HISTORY */}
        <div className="card animate-fadeIn" style={{ animationDelay: '0.15s' }}>
          <h2 className="text-lg font-bold text-slate-800 mb-5">Riwayat Setoran</h2>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Memuat data...
            </div>
          ) : transaksis.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <span className="text-4xl block mb-3">📋</span>
              <p className="font-medium">Belum ada riwayat setoran</p>
              <p className="text-sm mt-1">Mulai setor tabungan Qurban Anda hari ini!</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jumlah</th>
                    <th>Status</th>
                    <th>Bukti</th>
                  </tr>
                </thead>
                <tbody>
                  {[...transaksis].reverse().map((t) => (
                    <tr key={t.id}>
                      <td className="text-slate-600 whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="font-semibold text-slate-800">{formatRupiah(t.amount)}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td>
                        {t.receiptDriveFileId ? (
                          <a
                            href={/^[a-f0-9]{32}$/.test(t.receiptDriveFileId)
                              ? `/api/files/${t.receiptDriveFileId}`
                              : `https://drive.google.com/file/d/${t.receiptDriveFileId}/view`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800 text-sm font-medium underline"
                          >
                            Lihat →
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
