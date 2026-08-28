import './globals.css';
import { Providers } from './providers';
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.className}>
      <body className="min-h-screen bg-[#F8FAFC] text-ink antialiased">
        <header className="sticky top-0 z-10 bg-grafite text-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-indigo-400 text-sm font-extrabold">
                B
              </div>
              <span className="font-bold tracking-tight">
                BIUD <span className="text-indigo-300">Dashboard</span>
              </span>
            </div>
            <a
              href="/transactions/new"
              className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              + Nova transação
            </a>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
