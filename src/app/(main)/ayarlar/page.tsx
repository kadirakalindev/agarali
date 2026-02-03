'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmModal } from '@/components/ui/Modal';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import type { Profile, Nickname } from '@/types';

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'notifications' | 'privacy'>('profile');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Form states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Nickname states
  const [nicknameRequest, setNicknameRequest] = useState<Nickname | null>(null);
  const [newNickname, setNewNickname] = useState('');
  const [nicknameLoading, setNicknameLoading] = useState(false);

  // Push notification hook
  const pushNotifications = usePushNotifications(profile?.id || null);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/giris');
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
        setFullName(data.full_name);
        setUsername(data.username);
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url);

        // Fetch nickname request
        const { data: nicknameData } = await supabase
          .from('nicknames')
          .select('*')
          .eq('user_id', data.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (nicknameData) {
          setNicknameRequest(nicknameData);
        }
      }
      setLoading(false);
    }
    fetchProfile();
  }, [supabase, router]);

  const handleNicknameSubmit = async () => {
    if (!profile || !newNickname.trim()) return;

    setNicknameLoading(true);

    // Check if there's already a pending request
    const { data: existingPending } = await supabase
      .from('nicknames')
      .select('id')
      .eq('user_id', profile.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingPending) {
      // Delete the old pending request
      await supabase
        .from('nicknames')
        .delete()
        .eq('id', existingPending.id);
    }

    const { data, error } = await supabase
      .from('nicknames')
      .insert({
        user_id: profile.id,
        nickname: newNickname.trim(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      alert('Lakap gönderilemedi: ' + error.message);
    } else {
      setNicknameRequest(data);
      setNewNickname('');
      showSuccess('Lakap talebiniz gönderildi!');
    }
    setNicknameLoading(false);
  };

  const handleCancelNicknameRequest = async () => {
    if (!nicknameRequest || nicknameRequest.status !== 'pending') return;

    setNicknameLoading(true);

    const { error } = await supabase
      .from('nicknames')
      .delete()
      .eq('id', nicknameRequest.id);

    if (!error) {
      setNicknameRequest(null);
      showSuccess('Lakap talebi iptal edildi');
    }
    setNicknameLoading(false);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Dosya boyutu 5MB\'dan küçük olmalıdır');
      return;
    }

    setUploadingAvatar(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.id}/avatar.${fileExt}`;

    // Delete old avatar if exists
    if (profile.avatar_url) {
      const oldPath = profile.avatar_url.split('/').pop();
      if (oldPath) {
        await supabase.storage.from('avatars').remove([`${profile.id}/${oldPath}`]);
      }
    }

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      alert('Yükleme hatası: ' + uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Add timestamp to bust cache
    const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlWithTimestamp })
      .eq('id', profile.id);

    if (updateError) {
      alert('Profil güncellenemedi');
    } else {
      setAvatarUrl(urlWithTimestamp);
      setProfile({ ...profile, avatar_url: urlWithTimestamp });
      showSuccess('Profil fotoğrafı güncellendi!');
    }
    setUploadingAvatar(false);
  };

  const handleRemoveAvatar = async () => {
    if (!profile || !profile.avatar_url) return;

    setUploadingAvatar(true);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', profile.id);

    if (!updateError) {
      setAvatarUrl(null);
      setProfile({ ...profile, avatar_url: null });
      showSuccess('Profil fotoğrafı kaldırıldı');
    }
    setUploadingAvatar(false);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    if (!fullName.trim()) {
      alert('Ad soyad boş olamaz');
      return;
    }

    if (!username.trim() || username.length < 3) {
      alert('Kullanıcı adı en az 3 karakter olmalıdır');
      return;
    }

    setSaving(true);

    // Check if username is taken (if changed)
    if (username !== profile.username) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .neq('id', profile.id)
        .single();

      if (existingUser) {
        alert('Bu kullanıcı adı zaten alınmış');
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        username: username.toLowerCase().trim(),
        bio: bio.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (error) {
      alert('Profil güncellenemedi: ' + error.message);
    } else {
      setProfile({
        ...profile,
        full_name: fullName.trim(),
        username: username.toLowerCase().trim(),
        bio: bio.trim() || null,
      });
      showSuccess('Profil başarıyla güncellendi!');
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Tüm alanları doldurun');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Yeni şifre en az 6 karakter olmalıdır');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Şifreler eşleşmiyor');
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordError('Şifre değiştirilemedi: ' + error.message);
    } else {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showSuccess('Şifre başarıyla değiştirildi!');
    }
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    // This would need a server-side function to fully delete the account
    // For now, just sign out
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slideDown">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Ayarlar</h1>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 overflow-x-auto">
        {[
          { id: 'profile', label: 'Profil' },
          { id: 'account', label: 'Hesap' },
          { id: 'notifications', label: 'Bildirimler' },
          { id: 'privacy', label: 'Gizlilik' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Profil Fotoğrafı
            </h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                {uploadingAvatar ? (
                  <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Spinner size="md" />
                  </div>
                ) : (
                  <Avatar src={avatarUrl} alt={fullName} size="xl" />
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  Fotoğraf Değiştir
                </Button>
                {avatarUrl && (
                  <Button
                    variant="ghost"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    className="text-red-600"
                  >
                    Fotoğrafı Kaldır
                  </Button>
                )}
                <p className="text-sm text-gray-500">JPG, PNG veya GIF. Max 5MB.</p>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Profil Bilgileri
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kullanıcı Adı
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Biyografi
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Kendinden bahset..."
                  maxLength={160}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
                <p className="text-sm text-gray-500 mt-1">{bio.length}/160</p>
              </div>

              <Button onClick={handleSaveProfile} loading={saving} className="w-full sm:w-auto">
                Değişiklikleri Kaydet
              </Button>
            </div>
          </div>

          {/* Nickname Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Lakap
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Lakapınız profilinizde ve paylaşımlarınızda adınızın yanında görünecektir. Lakap talebiniz admin tarafından onaylanmalıdır.
            </p>

            {/* Current approved nickname */}
            {profile?.nickname && (
              <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-medium">Mevcut Lakap:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    &quot;{profile.nickname}&quot;
                  </span>
                </div>
              </div>
            )}

            {/* Pending request */}
            {nicknameRequest?.status === 'pending' && (
              <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-amber-700 dark:text-amber-400">
                      Onay bekleyen: <strong>&quot;{nicknameRequest.nickname}&quot;</strong>
                    </span>
                  </div>
                  <button
                    onClick={handleCancelNicknameRequest}
                    disabled={nicknameLoading}
                    className="text-sm text-red-500 hover:text-red-600"
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}

            {/* Rejected request */}
            {nicknameRequest?.status === 'rejected' && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-red-600 dark:text-red-400">
                    &quot;{nicknameRequest.nickname}&quot; lakabı reddedildi. Yeni bir lakap talep edebilirsiniz.
                  </span>
                </div>
              </div>
            )}

            {/* New nickname request form */}
            {(!nicknameRequest || nicknameRequest.status !== 'pending') && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {profile?.nickname ? 'Yeni Lakap Talebi' : 'Lakap Talebi'}
                  </label>
                  <input
                    type="text"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    placeholder="Örn: Çelik, Deli Murat, Kara Ali..."
                    maxLength={30}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Maksimum 30 karakter</p>
                </div>
                <Button
                  onClick={handleNicknameSubmit}
                  loading={nicknameLoading}
                  disabled={!newNickname.trim()}
                  variant="secondary"
                >
                  Lakap Talep Et
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Email */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              E-posta Adresi
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              E-posta değiştirme özelliği yakında eklenecek.
            </p>
          </div>

          {/* Password Change */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Şifre Değiştir
            </h2>
            <div className="space-y-4">
              {passwordError && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {passwordError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mevcut Şifre
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Yeni Şifre
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Yeni Şifre (Tekrar)
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <Button onClick={handleChangePassword} loading={saving}>
                Şifreyi Değiştir
              </Button>
            </div>
          </div>

          {/* Delete Account */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-red-200 dark:border-red-900">
            <h2 className="text-lg font-semibold text-red-600 mb-2">
              Hesabı Sil
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Hesabınızı sildiğinizde tüm verileriniz kalıcı olarak silinir. Bu işlem geri alınamaz.
            </p>
            <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
              Hesabımı Sil
            </Button>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Push Notifications */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Anlık Bildirimler
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Yeni beğeni, yorum ve takipçi bildirimleri alın
            </p>

            {!pushNotifications.isSupported ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Tarayıcınız anlık bildirimleri desteklemiyor</span>
                </div>
              </div>
            ) : pushNotifications.permission === 'denied' ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <span>Bildirim izni reddedildi. Tarayıcı ayarlarından izin verin.</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    pushNotifications.isSubscribed
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <svg
                      className={`w-6 h-6 ${
                        pushNotifications.isSubscribed
                          ? 'text-emerald-600'
                          : 'text-gray-400'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {pushNotifications.isSubscribed ? 'Bildirimler Açık' : 'Bildirimler Kapalı'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {pushNotifications.isSubscribed
                        ? 'Yeni aktivitelerde bildirim alacaksınız'
                        : 'Bildirimleri açarak hiçbir şeyi kaçırmayın'}
                    </p>
                  </div>
                </div>
                <Button
                  variant={pushNotifications.isSubscribed ? 'secondary' : 'primary'}
                  onClick={pushNotifications.isSubscribed ? pushNotifications.unsubscribe : pushNotifications.subscribe}
                  loading={pushNotifications.isLoading}
                >
                  {pushNotifications.isSubscribed ? 'Kapat' : 'Aç'}
                </Button>
              </div>
            )}

            {pushNotifications.error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 text-sm">
                {pushNotifications.error}
              </div>
            )}
          </div>

          {/* Notification Types */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Bildirim Türleri
            </h2>
            <div className="space-y-4">
              {[
                { id: 'likes', label: 'Beğeniler', desc: 'Gönderileriniz beğenildiğinde' },
                { id: 'comments', label: 'Yorumlar', desc: 'Gönderilerinize yorum yapıldığında' },
                { id: 'follows', label: 'Takipler', desc: 'Biri sizi takip ettiğinde' },
                { id: 'mentions', label: 'Bahsetmeler', desc: 'Bir gönderide sizden bahsedildiğinde' },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Gizlilik Ayarları
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Gizlilik ayarları yakında eklenecek. Profil gizliliği, hikaye gizliliği gibi özellikler burada yer alacak.
            </p>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Hesabı Sil"
        message="Hesabınızı silmek istediğinize emin misiniz? Tüm gönderileriniz, yorumlarınız ve verileriniz kalıcı olarak silinecektir."
        confirmText="Evet, Hesabımı Sil"
        cancelText="Vazgeç"
        variant="danger"
      />
    </div>
  );
}
