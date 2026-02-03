'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import type { Nickname, Profile } from '@/types';

interface NicknameWithProfile extends Nickname {
  profiles: Profile;
}

export default function AdminNicknamesPage() {
  const [nicknames, setNicknames] = useState<NicknameWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchNicknames();
  }, [activeTab]);

  const fetchNicknames = async () => {
    setLoading(true);
    let query = supabase
      .from('nicknames')
      .select('*, profiles:user_id(*)')
      .order('created_at', { ascending: false });

    if (activeTab !== 'all') {
      query = query.eq('status', activeTab);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Nicknames fetch error:', error);
    }

    setNicknames(data || []);
    setLoading(false);
  };

  const handleApprove = async (nickname: NicknameWithProfile) => {
    setProcessingId(nickname.id);

    const { data: { user } } = await supabase.auth.getUser();

    // Update nickname status
    await supabase
      .from('nicknames')
      .update({
        status: 'approved',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', nickname.id);

    // Update user's profile with the approved nickname
    await supabase
      .from('profiles')
      .update({ nickname: nickname.nickname })
      .eq('id', nickname.user_id);

    // Reject any other pending nicknames for this user
    await supabase
      .from('nicknames')
      .update({ status: 'rejected' })
      .eq('user_id', nickname.user_id)
      .eq('status', 'pending')
      .neq('id', nickname.id);

    setProcessingId(null);
    fetchNicknames();
  };

  const handleReject = async (nickname: NicknameWithProfile) => {
    setProcessingId(nickname.id);

    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from('nicknames')
      .update({
        status: 'rejected',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', nickname.id);

    setProcessingId(null);
    fetchNicknames();
  };

  const handleRemoveNickname = async (userId: string) => {
    setProcessingId(userId);

    await supabase
      .from('profiles')
      .update({ nickname: null })
      .eq('id', userId);

    setProcessingId(null);
    fetchNicknames();
  };

  const pendingCount = nicknames.filter((n) => n.status === 'pending').length;

  const tabs = [
    { id: 'pending', label: 'Bekleyen', count: activeTab === 'all' ? pendingCount : undefined },
    { id: 'approved', label: 'Onaylı' },
    { id: 'rejected', label: 'Reddedilen' },
    { id: 'all', label: 'Tümü' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Bekliyor
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            Onaylı
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Reddedildi
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lakap Yönetimi</h1>
        <p className="text-gray-500 mt-1">Kullanıcı lakap taleplerini yönetin</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Nicknames List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        ) : nicknames.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <p className="text-gray-500">Bu kategoride lakap talebi yok</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {nicknames.map((nickname) => (
              <div key={nickname.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <Avatar
                      src={nickname.profiles?.avatar_url}
                      alt={nickname.profiles?.full_name}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {nickname.profiles?.full_name}
                        </span>
                        {nickname.profiles?.nickname && (
                          <span className="text-emerald-600 dark:text-emerald-400 text-sm">
                            &quot;{nickname.profiles.nickname}&quot;
                          </span>
                        )}
                        {getStatusBadge(nickname.status)}
                      </div>
                      <p className="text-sm text-gray-500">@{nickname.profiles?.username}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Talep edilen:
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          &quot;{nickname.nickname}&quot;
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(nickname.created_at).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {nickname.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(nickname)}
                          loading={processingId === nickname.id}
                        >
                          Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleReject(nickname)}
                          loading={processingId === nickname.id}
                        >
                          Reddet
                        </Button>
                      </>
                    )}
                    {nickname.status === 'approved' && nickname.profiles?.nickname === nickname.nickname && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRemoveNickname(nickname.user_id)}
                        loading={processingId === nickname.user_id}
                      >
                        Lakabı Kaldır
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
