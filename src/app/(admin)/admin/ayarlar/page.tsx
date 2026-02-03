'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface SettingItem {
  key: string;
  value: string | null;
  label: string;
  type: 'text' | 'textarea' | 'color' | 'image';
  placeholder?: string;
}

export default function SiteSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const supabase = createClient();

  const settingItems: SettingItem[] = [
    { key: 'site_name', value: null, label: 'Site Adı', type: 'text', placeholder: 'Agara Köyü' },
    { key: 'site_description', value: null, label: 'Site Açıklaması', type: 'textarea', placeholder: 'Agara Köyü Sosyal Ağı' },
    { key: 'welcome_message', value: null, label: 'Karşılama Mesajı', type: 'textarea', placeholder: 'Hoş geldiniz!' },
    { key: 'primary_color', value: null, label: 'Ana Renk', type: 'color' },
    { key: 'site_logo', value: null, label: 'Site Logosu', type: 'image' },
    { key: 'site_favicon', value: null, label: 'Favicon', type: 'image' },
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value');

    if (data) {
      const settingsMap: Record<string, string | null> = {};
      data.forEach((item) => {
        settingsMap[item.key] = item.value;
      });
      setSettings(settingsMap);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase
          .from('site_settings')
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      }
      setMessage({ type: 'success', text: 'Ayarlar başarıyla kaydedildi!' });
    } catch {
      setMessage({ type: 'error', text: 'Ayarlar kaydedilirken hata oluştu' });
    }

    setSaving(false);
  };

  const handleImageUpload = async (key: string, file: File) => {
    const isLogo = key === 'site_logo';
    if (isLogo) setUploadingLogo(true);
    else setUploadingFavicon(true);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${key}-${Date.now()}.${fileExt}`;
      const filePath = `site/${fileName}`;

      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Dosya boyutu 2MB\'dan küçük olmalı');
      }

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
          throw new Error('Storage bucket bulunamadı. Supabase Dashboard > Storage bölümünden "media" adında public bir bucket oluşturun.');
        }
        throw new Error(uploadError.message);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      setSettings((prev) => ({ ...prev, [key]: publicUrl }));
      setMessage({ type: 'success', text: `${isLogo ? 'Logo' : 'Favicon'} yüklendi! Kaydet butonuna basmayı unutmayın.` });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Dosya yüklenirken hata oluştu';
      setMessage({ type: 'error', text: errorMessage });
    }

    if (isLogo) setUploadingLogo(false);
    else setUploadingFavicon(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Site Ayarları</h1>
        <p className="text-gray-500 mt-1">Sitenin genel ayarlarını yönetin</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
            : 'bg-red-50 dark:bg-red-900/20 text-red-600'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Text Settings */}
          {settingItems.filter((item) => item.type === 'text' || item.type === 'textarea').map((item) => (
            <div key={item.key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {item.label}
              </label>
              {item.type === 'text' ? (
                <input
                  type="text"
                  value={settings[item.key] || ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, [item.key]: e.target.value }))}
                  placeholder={item.placeholder}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              ) : (
                <textarea
                  value={settings[item.key] || ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, [item.key]: e.target.value }))}
                  placeholder={item.placeholder}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              )}
            </div>
          ))}

          {/* Color Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ana Renk
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={settings.primary_color || '#10b981'}
                onChange={(e) => setSettings((prev) => ({ ...prev, primary_color: e.target.value }))}
                className="w-16 h-12 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer"
              />
              <input
                type="text"
                value={settings.primary_color || '#10b981'}
                onChange={(e) => setSettings((prev) => ({ ...prev, primary_color: e.target.value }))}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div
                className="w-12 h-12 rounded-xl"
                style={{ backgroundColor: settings.primary_color || '#10b981' }}
              />
            </div>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Site Logosu
            </label>
            <div className="flex items-center gap-4">
              {settings.site_logo ? (
                <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  <img
                    src={settings.site_logo}
                    alt="Logo"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="flex-1">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    {uploadingLogo ? (
                      <Spinner size="sm" className="mr-2" />
                    ) : (
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    )}
                    Logo Yükle
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload('site_logo', file);
                    }}
                  />
                </label>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG veya SVG (max 2MB)</p>
              </div>
              {settings.site_logo && (
                <button
                  onClick={() => setSettings((prev) => ({ ...prev, site_logo: null }))}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Favicon Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Favicon
            </label>
            <div className="flex items-center gap-4">
              {settings.site_favicon ? (
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  <img
                    src={settings.site_favicon}
                    alt="Favicon"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="flex-1">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    {uploadingFavicon ? (
                      <Spinner size="sm" className="mr-2" />
                    ) : (
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    )}
                    Favicon Yükle
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload('site_favicon', file);
                    }}
                  />
                </label>
                <p className="text-xs text-gray-400 mt-1">ICO, PNG veya SVG (32x32 px önerilen)</p>
              </div>
              {settings.site_favicon && (
                <button
                  onClick={() => setSettings((prev) => ({ ...prev, site_favicon: null }))}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Değişiklikler kaydedildikten sonra sayfa yenilendiğinde uygulanacaktır.
            </p>
            <Button onClick={handleSave} loading={saving}>
              Kaydet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
