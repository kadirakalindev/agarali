'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { PollCard } from '@/components/PollCard';
import type { Poll, Profile } from '@/types';

export default function AdminPollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);

  // Form states
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [pollType, setPollType] = useState<'single' | 'multiple'>('single');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [endsAt, setEndsAt] = useState('');
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

    // Fetch all polls with options and votes
    const { data } = await supabase
      .from('polls')
      .select(`
        *,
        profiles(*),
        poll_options(*),
        poll_votes(*, profiles(*))
      `)
      .order('created_at', { ascending: false });

    setPolls(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setQuestion('');
    setDescription('');
    setPollType('single');
    setOptions(['', '']);
    setEndsAt('');
    setFormError('');
  };

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!question.trim()) {
      setFormError('Soru gerekli');
      return;
    }

    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) {
      setFormError('En az 2 seçenek gerekli');
      return;
    }

    if (!currentUser) return;

    setSubmitting(true);

    try {
      // Create poll
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          user_id: currentUser.id,
          question: question.trim(),
          description: description.trim() || null,
          poll_type: pollType,
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Create options
      const optionsData = validOptions.map((text, index) => ({
        poll_id: poll.id,
        option_text: text.trim(),
        option_order: index,
      }));

      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionsData);

      if (optionsError) throw optionsError;

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

  const handleToggleActive = async (poll: Poll) => {
    const { error } = await supabase
      .from('polls')
      .update({ is_active: !poll.is_active })
      .eq('id', poll.id);

    if (!error) {
      fetchData();
    }
  };

  const handleDelete = async (poll: Poll) => {
    if (!confirm('Bu anketi silmek istediğinize emin misiniz? Tüm oylar da silinecektir.')) return;

    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', poll.id);

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

  const activePolls = polls.filter((p) => p.is_active);
  const inactivePolls = polls.filter((p) => !p.is_active);
  const totalVotes = polls.reduce((sum, p) => sum + (p.poll_votes?.length || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Anketler</h1>
          <p className="text-gray-500 mt-1">Anketleri yönetin ve yeni anket oluşturun</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Anket
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
          <p className="text-sm text-purple-600 dark:text-purple-400">Toplam Anket</p>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{polls.length}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Aktif</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{activePolls.length}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400">Toplam Oy</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalVotes}</p>
        </div>
      </div>

      {/* Polls List */}
      <div className="space-y-6">
        {/* Active Polls */}
        {activePolls.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Aktif Anketler
            </h2>
            <div className="space-y-4">
              {activePolls.map((poll) => (
                <div key={poll.id} className="relative">
                  <PollCard poll={poll} currentUserId={currentUser?.id} onVoteChange={fetchData} />

                  {/* Admin Actions */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(poll)}
                      className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      title="Pasif Yap"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(poll)}
                      className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      title="Sil"
                    >
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inactive Polls */}
        {inactivePolls.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-4">
              Pasif Anketler
            </h2>
            <div className="space-y-4 opacity-60">
              {inactivePolls.map((poll) => (
                <div key={poll.id} className="relative">
                  <PollCard poll={poll} currentUserId={currentUser?.id} onVoteChange={fetchData} />

                  {/* Admin Actions */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      Pasif
                    </span>
                    <button
                      onClick={() => handleToggleActive(poll)}
                      className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      title="Aktif Yap"
                    >
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(poll)}
                      className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      title="Sil"
                    >
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {polls.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Henüz anket yok
            </h3>
            <p className="text-gray-500 mb-4">İlk anketi oluşturun</p>
            <Button onClick={() => setShowCreateModal(true)}>
              Anket Oluştur
            </Button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Yeni Anket Oluştur"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 px-4 py-3 rounded-xl text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Soru *
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Anket sorusu"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Açıklama (Opsiyonel)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anket hakkında ek bilgi..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Anket Türü
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPollType('single')}
                className={`flex-1 py-2 px-3 rounded-xl border-2 font-medium text-sm transition-all ${
                  pollType === 'single'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                Tek Seçimli
              </button>
              <button
                type="button"
                onClick={() => setPollType('multiple')}
                className={`flex-1 py-2 px-3 rounded-xl border-2 font-medium text-sm transition-all ${
                  pollType === 'multiple'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                Çok Seçimli
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {pollType === 'single'
                ? 'Kullanıcılar sadece bir seçenek seçebilir'
                : 'Kullanıcılar birden fazla seçenek seçebilir'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Seçenekler *
            </label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Seçenek ${index + 1}`}
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-2 text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Seçenek Ekle
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bitiş Tarihi (Opsiyonel)
            </label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Bu tarihten sonra oylama kapanır
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
              Oluştur
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
