'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { AnnouncementCard } from '@/components/AnnouncementCard';
import type { Announcement, Profile } from '@/types';

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(profile);
    }

    // Fetch all announcements (including inactive for admin)
    const { data } = await supabase
      .from('announcements')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false });

    setAnnouncements(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setPriority('normal');
    setIsPinned(false);
    setExpiresAt('');
    setFormError('');
    setEditingAnnouncement(null);
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setTitle(announcement.title);
    setContent(announcement.content);
    setPriority(announcement.priority);
    setIsPinned(announcement.is_pinned);
    setExpiresAt(announcement.expires_at ? new Date(announcement.expires_at).toISOString().slice(0, 16) : '');
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Başlık gerekli');
      return;
    }

    if (!content.trim()) {
      setFormError('İçerik gerekli');
      return;
    }

    if (!currentUser) return;

    setSubmitting(true);

    try {
      const announcementData = {
        title: title.trim(),
        content: content.trim(),
        priority,
        is_pinned: isPinned,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (editingAnnouncement) {
        // Update existing
        const { error } = await supabase
          .from('announcements')
          .update(announcementData)
          .eq('id', editingAnnouncement.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('announcements')
          .insert({
            ...announcementData,
            user_id: currentUser.id,
          });

        if (error) throw error;
      }

      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Bir hata oluştu';
      setFormError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: !announcement.is_active })
      .eq('id', announcement.id);

    if (!error) {
      fetchData();
    }
  };

  const handleDelete = async (announcement: Announcement) => {
    if (!confirm('Bu duyuruyu silmek istediğinize emin misiniz?')) return;

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcement.id);

    if (!error) {
      fetchData();
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Duyurular</h1>
          <p className="text-gray-500 mt-1">Duyuruları yönetin ve yeni duyuru oluşturun</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Duyuru
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400">Toplam</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{announcements.length}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Aktif</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {announcements.filter((a) => a.is_active).length}
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
          <p className="text-sm text-amber-600 dark:text-amber-400">Sabitlenmiş</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
            {announcements.filter((a) => a.is_pinned).length}
          </p>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Henüz duyuru yok
            </h3>
            <p className="text-gray-500 mb-4">İlk duyuruyu oluşturun</p>
            <Button onClick={() => setShowCreateModal(true)}>
              Duyuru Oluştur
            </Button>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement.id} className="relative">
              <div className={`${!announcement.is_active ? 'opacity-50' : ''}`}>
                <AnnouncementCard announcement={announcement} showFullContent />
              </div>

              {/* Admin Actions */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {!announcement.is_active && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                    Pasif
                  </span>
                )}
                <button
                  onClick={() => handleToggleActive(announcement)}
                  className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  title={announcement.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                >
                  {announcement.is_active ? (
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => openEditModal(announcement)}
                  className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  title="Düzenle"
                >
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(announcement)}
                  className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  title="Sil"
                >
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title={editingAnnouncement ? 'Duyuruyu Düzenle' : 'Yeni Duyuru Oluştur'}
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 px-4 py-3 rounded-xl text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Başlık *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Duyuru başlığı"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              İçerik *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Duyuru içeriği..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Öncelik
            </label>
            <div className="flex gap-2">
              {(['normal', 'important', 'urgent'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2 px-3 rounded-xl border-2 font-medium text-sm transition-all ${
                    priority === p
                      ? p === 'normal'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : p === 'important'
                        ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {p === 'normal' ? 'Normal' : p === 'important' ? 'Önemli' : 'Acil'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Duyuruyu sabitle (Feed&apos;in üstünde göster)
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bitiş Tarihi (Opsiyonel)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Bu tarihten sonra duyuru otomatik olarak gizlenir
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              className="flex-1"
            >
              İptal
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              {editingAnnouncement ? 'Güncelle' : 'Oluştur'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
