'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    username?: string;
    email?: string;
    password?: string;
  }>({});
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Kullanıcı adı için Türkçe karakter dönüşümü
  const turkishToEnglish = (text: string): string => {
    const map: { [key: string]: string } = {
      'ç': 'c', 'Ç': 'c',
      'ğ': 'g', 'Ğ': 'g',
      'ı': 'i', 'İ': 'i',
      'ö': 'o', 'Ö': 'o',
      'ş': 's', 'Ş': 's',
      'ü': 'u', 'Ü': 'u',
    };
    return text.replace(/[çÇğĞıİöÖşŞüÜ]/g, (char) => map[char] || char);
  };

  // Kullanıcı adı değiştiğinde kontrol et
  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      setUsernameAvailable(!data);
      setCheckingUsername(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [username, supabase]);

  // Kullanıcı adı formatla
  const handleUsernameChange = (value: string) => {
    // Önce Türkçe karakterleri dönüştür
    let formatted = turkishToEnglish(value);
    // Sonra sadece izin verilen karakterleri bırak
    formatted = formatted.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(formatted);

    // Kullanıcı farklı bir şey yazdıysa uyar
    if (value !== formatted && value.length > 0) {
      setFieldErrors(prev => ({
        ...prev,
        username: 'Türkçe karakterler otomatik dönüştürüldü'
      }));
    } else {
      setFieldErrors(prev => ({ ...prev, username: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};

    // Ad Soyad kontrolü
    if (fullName.trim().length < 3) {
      errors.fullName = 'Ad soyad en az 3 karakter olmalı';
    } else if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/.test(fullName)) {
      errors.fullName = 'Ad soyad sadece harf içermeli';
    }

    // Kullanıcı adı kontrolü
    if (username.length < 3) {
      errors.username = 'Kullanıcı adı en az 3 karakter olmalı';
    } else if (username.length > 20) {
      errors.username = 'Kullanıcı adı en fazla 20 karakter olmalı';
    } else if (!/^[a-z][a-z0-9_]*$/.test(username)) {
      errors.username = 'Kullanıcı adı harf ile başlamalı';
    }

    // E-posta kontrolü
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Geçerli bir e-posta adresi girin';
    }

    // Şifre kontrolü
    if (password.length < 6) {
      errors.password = 'Şifre en az 6 karakter olmalı';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    if (usernameAvailable === false) {
      setError('Bu kullanıcı adı zaten alınmış. Lütfen başka bir kullanıcı adı deneyin.');
      return;
    }

    setLoading(true);

    // Tekrar kontrol et (race condition için)
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      setError('Bu kullanıcı adı zaten alınmış. Lütfen başka bir kullanıcı adı deneyin.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          username: username,
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        setError('Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin veya farklı bir e-posta kullanın.');
      } else if (error.message.includes('valid email')) {
        setError('Geçerli bir e-posta adresi girin');
      } else if (error.message.includes('password')) {
        setError('Şifre en az 6 karakter olmalı');
      } else {
        setError('Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      }
      setLoading(false);
    } else {
      router.push('/beklemede');
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-amber-50 flex items-center justify-center p-4 py-8">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-200/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100">
          {/* Logo and Title */}
          <div className="text-center mb-6">
            <Link href="/" className="inline-block">
              <Image
                src="/icons/android/android-launchericon-96-96.png"
                alt="Agara Köyü"
                width={56}
                height={56}
                className="mx-auto rounded-2xl shadow-md mb-3"
              />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              Aramıza Katılın
            </h1>
            <p className="text-gray-500 text-sm">Agara Köyü ailesine hoş geldiniz</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Ad Soyad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Adınız ve Soyadınız
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 ${
                  fieldErrors.fullName ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                placeholder="Adınızı ve soyadınızı yazın"
                required
              />
              {fieldErrors.fullName ? (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {fieldErrors.fullName}
                </p>
              ) : (
                <p className="text-gray-400 text-xs mt-1.5">Kimliğinizdeki adınızı ve soyadınızı girin</p>
              )}
            </div>

            {/* Kullanıcı Adı */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Kullanıcı Adınız
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className={`w-full pl-9 pr-10 py-3 rounded-xl border bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 ${
                    fieldErrors.username ? 'border-red-300 bg-red-50' :
                    usernameAvailable === true ? 'border-emerald-300 bg-emerald-50' :
                    usernameAvailable === false ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  placeholder="kullanici_adi"
                  required
                />
                {/* Status icon */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingUsername && (
                    <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {!checkingUsername && usernameAvailable === true && (
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {!checkingUsername && usernameAvailable === false && (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              </div>
              {fieldErrors.username && (
                <p className="text-amber-600 text-xs mt-1.5">{fieldErrors.username}</p>
              )}
              {usernameAvailable === false && !fieldErrors.username && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Bu isim alınmış, başka bir tane deneyin
                </p>
              )}
              {usernameAvailable === true && !fieldErrors.username && (
                <p className="text-emerald-500 text-xs mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Bu kullanıcı adı uygun!
                </p>
              )}
              {!fieldErrors.username && usernameAvailable === null && (
                <p className="text-gray-400 text-xs mt-1.5">Harf, rakam ve alt çizgi (_) kullanabilirsiniz</p>
              )}
            </div>

            {/* E-posta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                E-posta Adresiniz
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                className={`w-full px-4 py-3 rounded-xl border bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 ${
                  fieldErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                placeholder="E-posta adresinizi yazın"
                required
              />
              {fieldErrors.email ? (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {fieldErrors.email}
                </p>
              ) : (
                <p className="text-gray-400 text-xs mt-1.5">Giriş için bu e-postayı kullanacaksınız</p>
              )}
            </div>

            {/* Şifre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Şifreniz
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 ${
                  fieldErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                placeholder="En az 6 karakterli bir şifre belirleyin"
                required
              />
              {fieldErrors.password ? (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {fieldErrors.password}
                </p>
              ) : (
                <p className="text-gray-400 text-xs mt-1.5">Şifrenizi unutmayacağınız bir şey seçin</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || usernameAvailable === false || checkingUsername}
              className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-semibold text-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200 hover:shadow-xl mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Kayıt yapılıyor...
                </span>
              ) : (
                'Kayıt Ol'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-white text-sm text-gray-500">veya</span>
            </div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-gray-600 mb-2 text-sm">Zaten hesabınız var mı?</p>
            <Link
              href="/giris"
              className="inline-block w-full py-3 border-2 border-emerald-600 text-emerald-600 rounded-xl font-semibold hover:bg-emerald-50 transition-colors"
            >
              Giriş Yap
            </Link>
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center mt-5">
          <Link href="/" className="text-gray-500 hover:text-emerald-600 transition-colors inline-flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </main>
  );
}
