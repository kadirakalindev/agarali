'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  const supabase = createClient();

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
    <main className="min-h-screen bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-emerald-700">
            🏡 Agara Köyü
          </Link>
          <p className="text-gray-600 mt-2">Aramıza katılın</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad Soyad
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                fieldErrors.fullName ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Ahmet Yılmaz"
              required
            />
            {fieldErrors.fullName && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.fullName}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">Gerçek adınızı ve soyadınızı yazın</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kullanıcı Adı
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className={`w-full pl-8 pr-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                  fieldErrors.username ? 'border-red-300 bg-red-50' :
                  usernameAvailable === true ? 'border-emerald-300 bg-emerald-50' :
                  usernameAvailable === false ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="ahmet_yilmaz"
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
              <p className="text-amber-600 text-sm mt-1">{fieldErrors.username}</p>
            )}
            {usernameAvailable === false && !fieldErrors.username && (
              <p className="text-red-500 text-sm mt-1">Bu kullanıcı adı alınmış, başka bir tane deneyin</p>
            )}
            {usernameAvailable === true && !fieldErrors.username && (
              <p className="text-emerald-500 text-sm mt-1">Bu kullanıcı adı uygun!</p>
            )}
            <p className="text-gray-500 text-xs mt-1">Sadece harf, rakam ve alt çizgi (_) kullanılabilir</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                fieldErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="ornek@email.com"
              required
            />
            {fieldErrors.email && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                fieldErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="••••••••"
              required
            />
            {fieldErrors.password && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">En az 6 karakter olmalı</p>
          </div>

          <button
            type="submit"
            disabled={loading || usernameAvailable === false || checkingUsername}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Zaten hesabınız var mı?{' '}
          <Link href="/giris" className="text-emerald-600 font-semibold hover:underline">
            Giriş Yap
          </Link>
        </p>
      </div>
    </main>
  );
}
