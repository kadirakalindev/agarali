import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/feed');
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-amber-50">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 right-0 w-80 h-80 bg-amber-200/30 rounded-full blur-3xl translate-x-1/2" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-green-200/30 rounded-full blur-3xl translate-y-1/2" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <nav className="flex items-center justify-between mb-12 sm:mb-20">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/icons/android/android-launchericon-96-96.png"
              alt="Agara Köyü"
              width={48}
              height={48}
              className="rounded-xl shadow-md"
            />
            <span className="text-xl sm:text-2xl font-bold text-emerald-800 hidden sm:block">
              Agara Köyü
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/giris"
              className="px-4 sm:px-5 py-2.5 text-sm sm:text-base font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 rounded-xl transition-colors"
            >
              Giriş Yap
            </Link>
            <Link
              href="/kayit"
              className="px-4 sm:px-6 py-2.5 text-sm sm:text-base font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200"
            >
              Kayıt Ol
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="text-center mb-16 sm:mb-24">
          {/* Logo büyük */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-2xl scale-150" />
              <Image
                src="/icons/android/android-launchericon-192-192.png"
                alt="Agara Köyü"
                width={120}
                height={120}
                className="relative rounded-3xl shadow-xl"
              />
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
            <span className="text-emerald-700">Agara Köyü</span>
            <br />
            <span className="text-gray-700">Sosyal Ağı</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-10 max-w-xl mx-auto leading-relaxed">
            Köyümüzün dijital buluşma noktası.
            <span className="block mt-1">Haberler, etkinlikler ve anılarımızı birlikte paylaşalım.</span>
          </p>

          <Link
            href="/kayit"
            className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white text-lg font-semibold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:shadow-xl hover:-translate-y-0.5"
          >
            Hemen Aramıza Katıl
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* Features - Daha sade, ikon yerine metin odaklı */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-16 sm:mb-24">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-sm border border-emerald-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Fotoğraf ve Anılar</h3>
            <p className="text-gray-600 leading-relaxed">
              Köyümüzden fotoğraflar paylaşın, eski hatıraları tazeleyin.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-sm border border-amber-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Köy Etkinlikleri</h3>
            <p className="text-gray-600 leading-relaxed">
              Düğün, bayram, toplantı... Tüm etkinlikleri takip edin.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-sm border border-green-100 hover:shadow-md transition-shadow md:col-span-1">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Hemşerilerimiz</h3>
            <p className="text-gray-600 leading-relaxed">
              Köylülerimizle bağlantıda kalın, eski dostları bulun.
            </p>
          </div>
        </div>

        {/* Trust / Info Section */}
        <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-3xl p-8 sm:p-12 text-white text-center mb-12 shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Köyümüzün Dijital Meydanı
          </h2>
          <p className="text-emerald-100 text-lg max-w-2xl mx-auto mb-6">
            Nerede olursanız olun, köyünüzle bağınızı koparmayın.
            Gurbetteki hemşerilerimiz de, köydekiler de burada buluşuyor.
          </p>
          <div className="flex flex-wrap justify-center gap-8 sm:gap-12 text-sm sm:text-base">
            <div>
              <div className="text-3xl sm:text-4xl font-bold">100+</div>
              <div className="text-emerald-200">Hemşerimiz</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold">Ücretsiz</div>
              <div className="text-emerald-200">Tamamen Bedava</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold">Güvenli</div>
              <div className="text-emerald-200">Sadece Köylüler</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-500 pb-8">
          <p className="mb-2">Agara Köyü Sosyal Ağ Platformu</p>
          <p className="text-sm">Köyümüz için, köylülerimiz tarafından</p>
        </footer>
      </div>
    </main>
  );
}
