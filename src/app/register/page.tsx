'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Pendaftaran gagal.');
      } else {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 2500);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* LEFT PANEL */}
      <div
        className="auth-panel-left islamic-pattern"
        style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 40%, #166534 70%, #b45309 100%)' }}
      >
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 text-center w-full">
          <div className="w-36 h-36 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-8 shadow-xl p-2">
            <Image
              src="/logo.png"
              alt="Logo Masjid Al-Bina"
              width={120}
              height={120}
              className="object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold mb-3 tracking-tight text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>Bergabung</h1>
          <p className="text-yellow-200 text-lg font-semibold mb-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>Bersama Jamaah Al-Bina</p>
          <div className="w-16 h-0.5 bg-yellow-300 rounded-full my-4 mx-auto" />
          <p className="text-green-100 text-sm leading-relaxed max-w-xs font-medium" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            Daftarkan diri Anda dan mulai menabung untuk ibadah Qurban bersama jamaah Masjid Al-Bina.
          </p>

          {/* Steps */}
          <div className="mt-10 space-y-4 text-left w-full max-w-xs">
            {[
              { num: '01', text: 'Daftar akun jamaah' },
              { num: '02', text: 'Mulai setor tabungan' },
              { num: '03', text: 'Pantau progress Qurban Anda' },
            ].map((step) => (
              <div key={step.num} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-yellow-300 flex-shrink-0 border border-white/30">
                  {step.num}
                </span>
                <span className="text-sm text-white font-medium" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>{step.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-panel-right">
        <div className="w-full max-w-md animate-slideUp">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="Logo" width={44} height={44} className="object-contain" />
            </div>
            <div>
              <p className="font-bold text-amber-900">Masjid Al-Bina</p>
              <p className="text-xs text-amber-700">Daftar Akun Jamaah</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-amber-900 mb-2">Daftar Akun</h2>
          <p className="text-amber-700 mb-8">Isi data diri Anda untuk membuat akun jamaah.</p>

          {success && (
            <div className="mb-5 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              Pendaftaran berhasil! Mengalihkan ke halaman login...
            </div>
          )}

          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label htmlFor="name" className="label">Nama Lengkap</label>
              <input id="name" type="text" className="input" placeholder="Ahmad Fauzi" value={form.name} onChange={(e) => update('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="phone" className="label">Nomor HP / WhatsApp</label>
              <input id="phone" type="tel" className="input" placeholder="08123456789" value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="reg-email" className="label">Alamat Email</label>
              <input id="reg-email" type="email" className="input" placeholder="email@example.com" value={form.email} onChange={(e) => update('email', e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label htmlFor="reg-password" className="label">Password</label>
                <input id="reg-password" type="password" className="input" placeholder="Min. 6 karakter" value={form.password} onChange={(e) => update('password', e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password" className="label">Konfirmasi</label>
                <input id="confirm-password" type="password" className="input" placeholder="Ulangi password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} required />
              </div>
            </div>

            <button id="btn-register" type="submit" className="btn-primary w-full py-3 text-base mt-2" disabled={loading || success}>
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Mendaftarkan...
                </>
              ) : 'Daftar Sekarang'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-amber-700">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-green-700 font-semibold hover:text-green-800 transition-colors">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
