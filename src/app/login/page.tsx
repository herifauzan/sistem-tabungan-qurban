'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: form.email,
        password: form.password,
      });

      if (res?.error) {
        setError('Email atau password salah. Silakan coba lagi.');
      } else {
        router.push('/');
        router.refresh();
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
          {/* Logo Masjid */}
          <div className="w-36 h-36 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-8 shadow-xl p-2">
            <Image
              src="/logo.png"
              alt="Logo Masjid Al-Bina"
              width={120}
              height={120}
              className="object-contain"
              priority
            />
          </div>

          <h1 className="text-4xl font-bold mb-3 tracking-tight text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            Masjid Al-Bina
          </h1>
          <p className="text-yellow-200 text-lg font-semibold mb-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
            Sistem Tabungan Qurban
          </p>
          <div className="w-16 h-0.5 bg-yellow-300 rounded-full my-4 mx-auto" />
          <p className="text-green-100 text-sm leading-relaxed max-w-xs font-medium" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            Platform digital untuk mengelola tabungan dan pembayaran Qurban jamaah secara mudah, transparan, dan terpercaya.
          </p>

          {/* Decorative elements */}
          <div className="mt-12 flex gap-4">
            {[
              { emoji: '🕌', label: 'Masjid' },
              { emoji: '🐑', label: 'Qurban' },
              { emoji: '💚', label: 'Amanah' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl border border-white/30">
                  {item.emoji}
                </div>
                <span className="text-xs text-white font-bold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-panel-right">
        <div className="w-full max-w-md animate-slideUp">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="Logo" width={44} height={44} className="object-contain" />
            </div>
            <div>
              <p className="font-bold text-amber-900">Masjid Al-Bina</p>
              <p className="text-xs text-amber-700">Sistem Tabungan Qurban</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-amber-900 mb-2">Selamat Datang</h2>
          <p className="text-amber-700 mb-8">Masuk ke akun Anda untuk melanjutkan.</p>

          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="form-group">
              <label htmlFor="email" className="label">Alamat Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="jamaah@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              id="btn-login"
              type="submit"
              className="btn-primary w-full py-3 text-base"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Memproses...
                </>
              ) : 'Masuk'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-amber-700">
            Belum punya akun?{' '}
            <Link href="/register" className="text-green-700 font-semibold hover:text-green-800 transition-colors">
              Daftar sekarang
            </Link>
          </p>

          <div className="mt-8 pt-6 border-t border-amber-200">
            <p className="text-xs text-center text-amber-600">
              © {new Date().getFullYear()} Masjid Al-Bina — Sistem Tabungan Qurban
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
