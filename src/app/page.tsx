import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/feed');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-600 to-green-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        {/* Header */}
        <nav className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-12 sm:mb-16">
          <h1 className="text-xl sm:text-2xl font-bold text-white">🏡 Agara Köyü</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/giris"
              className="px-4 sm:px-6 py-2 text-sm sm:text-base text-white hover:text-emerald-200 transition-colors"
            >
              Giriş Yap
            </Link>
            <Link
              href="/kayit"
              className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-white text-emerald-700 rounded-full hover:bg-emerald-100 transition-colors"
            >
              Kayıt Ol
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="text-center text-white px-2">
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6">
            Agara Köyü<br />Sosyal Ağı
          </h2>
          <p className="text-base sm:text-xl md:text-2xl text-emerald-100 mb-8 sm:mb-12 max-w-2xl mx-auto">
            Köyümüzün dijital buluşma noktası. Haberler, etkinlikler ve
            anılarımızı birlikte paylaşalım.
          </p>
          <Link
            href="/kayit"
            className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-white text-emerald-700 text-base sm:text-lg font-semibold rounded-full hover:bg-emerald-100 transition-colors shadow-lg"
          >
            Hemen Katıl →
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mt-12 sm:mt-16 md:mt-24">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 sm:p-6 text-white">
            <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">📸</div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">Anıları Paylaş</h3>
            <p className="text-sm sm:text-base text-emerald-100">
              Köyümüzden fotoğraflar, hikayeler ve güncel paylaşımlar yapın.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 sm:p-6 text-white">
            <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">📅</div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">Etkinlikler</h3>
            <p className="text-sm sm:text-base text-emerald-100">
              Köy etkinliklerini takip edin, yeni organizasyonlar düzenleyin.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 sm:p-6 text-white sm:col-span-2 md:col-span-1">
            <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">👥</div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">Bağlantı Kur</h3>
            <p className="text-sm sm:text-base text-emerald-100">
              Köylülerimizle iletişimde kalın, eski dostlukları yenileyin.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 sm:mt-16 md:mt-24 text-center text-emerald-200">
          <p className="text-sm sm:text-base">© 2026 Agara Köyü Sosyal Ağ</p>
        </footer>
      </div>
    </main>
  );
}
