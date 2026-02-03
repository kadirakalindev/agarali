'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

export default function PendingApprovalPage() {
  const [checking, setChecking] = useState(false);
  const supabase = createClient();

  const checkApproval = async () => {
    setChecking(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('id', user.id)
        .single();

      if (profile?.is_approved) {
        window.location.href = '/feed';
      }
    }
    setChecking(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // Her 30 saniyede bir otomatik kontrol
  useEffect(() => {
    const interval = setInterval(checkApproval, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Hesabınız Onay Bekliyor
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Kayıt işleminiz başarıyla tamamlandı. Hesabınızın onaylanması için
            site yöneticisinin onayını beklemeniz gerekmektedir.
          </p>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-700 dark:text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-200 text-left">
                Onay işlemi genellikle 24 saat içinde tamamlanır. Lütfen sabırlı olun.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={checkApproval}
              loading={checking}
              className="w-full"
            >
              {checking ? 'Kontrol Ediliyor...' : 'Durumu Kontrol Et'}
            </Button>

            <button
              onClick={handleLogout}
              className="w-full py-3 text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors"
            >
              Çıkış Yap
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            Sayfa her 30 saniyede otomatik olarak kontrol eder
          </p>
        </div>
      </div>
    </div>
  );
}
