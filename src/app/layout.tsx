import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sistem Tabungan Qurban — Masjid Al-Bina',
  description:
    'Platform digital untuk mengelola tabungan dan pembayaran Qurban jamaah Masjid Al-Bina. Mudah, transparan, dan terpercaya.',
  keywords: 'tabungan qurban, masjid al-bina, qurban online, idul adha',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
