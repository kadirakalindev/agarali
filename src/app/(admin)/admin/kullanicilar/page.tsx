'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import type { Profile } from '@/types';

interface ExtendedProfile extends Profile {
  _count?: {
    posts: number;
    followers: number;
    following: number;
  };
}

type TabType = 'pending' | 'approved' | 'banned' | 'all';

export default function UsersManagement() {
  const [users, setUsers] = useState<ExtendedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<ExtendedProfile | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      const usersWithCounts = await Promise.all(
        data.map(async (user) => {
          const [
            { count: postsCount },
            { count: followersCount },
            { count: followingCount },
          ] = await Promise.all([
            supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
          ]);

          return {
            ...user,
            _count: {
              posts: postsCount || 0,
              followers: followersCount || 0,
              following: followingCount || 0,
            },
          };
        })
      );

      setUsers(usersWithCounts);
    }

    setLoading(false);
  };

  const handleApprove = async (userId: string) => {
    setActionLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: true })
      .eq('id', userId);

    if (!error) {
      setUsers(users.map((u) => (u.id === userId ? { ...u, is_approved: true } : u)));
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, is_approved: true });
      }
    }

    setActionLoading(false);
  };

  const handleReject = async (userId: string) => {
    setActionLoading(true);

    // Delete user's content first
    await supabase.from('posts').delete().eq('user_id', userId);
    await supabase.from('comments').delete().eq('user_id', userId);
    await supabase.from('stories').delete().eq('user_id', userId);
    await supabase.from('follows').delete().eq('follower_id', userId);
    await supabase.from('follows').delete().eq('following_id', userId);

    // Delete profile
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (!error) {
      setUsers(users.filter((u) => u.id !== userId));
      setShowUserModal(false);
      setSelectedUser(null);
    }

    setActionLoading(false);
  };

  const handleBan = async (userId: string, isBanned: boolean) => {
    setActionLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: !isBanned })
      .eq('id', userId);

    if (!error) {
      setUsers(users.map((u) => (u.id === userId ? { ...u, is_approved: !isBanned } : u)));
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, is_approved: !isBanned });
      }
    }

    setActionLoading(false);
  };

  const handleChangeRole = async (userId: string, newRole: 'user' | 'moderator' | 'admin') => {
    setActionLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (!error) {
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, role: newRole });
      }
    }

    setActionLoading(false);
  };

  const handleApproveAll = async () => {
    setActionLoading(true);
    const pendingUsers = users.filter((u) => !u.is_approved);

    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: true })
      .in('id', pendingUsers.map((u) => u.id));

    if (!error) {
      setUsers(users.map((u) => ({ ...u, is_approved: true })));
    }

    setActionLoading(false);
  };

  // Count users by status
  const pendingCount = users.filter((u) => !u.is_approved && u.role === 'user').length;
  const approvedCount = users.filter((u) => u.is_approved).length;
  const bannedCount = users.filter((u) => !u.is_approved && u.role !== 'user').length;

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'pending' && !user.is_approved && user.role === 'user') ||
      (activeTab === 'approved' && user.is_approved) ||
      (activeTab === 'banned' && !user.is_approved && user.role !== 'user');

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesTab && matchesRole;
  });

  const tabs = [
    { id: 'pending' as TabType, label: 'Onay Bekleyen', count: pendingCount, color: 'text-amber-600' },
    { id: 'approved' as TabType, label: 'Onaylı', count: approvedCount, color: 'text-emerald-600' },
    { id: 'banned' as TabType, label: 'Yasaklı', count: bannedCount, color: 'text-red-600' },
    { id: 'all' as TabType, label: 'Tümü', count: users.length, color: 'text-gray-600' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kullanıcı Yönetimi</h1>
          <p className="text-gray-500 mt-1">{users.length} kayıtlı kullanıcı</p>
        </div>
        {pendingCount > 0 && (
          <Button onClick={handleApproveAll} loading={actionLoading}>
            Tümünü Onayla ({pendingCount})
          </Button>
        )}
      </div>

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-700 dark:text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {pendingCount} kullanıcı onay bekliyor
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Yeni kayıt olan kullanıcıları inceleyip onaylayın
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 shadow-sm ' + tab.color
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Kullanıcı ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Tüm Roller</option>
          <option value="user">Kullanıcı</option>
          <option value="moderator">Moderatör</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
            <p className="text-gray-500">Kullanıcı bulunamadı</p>
          </div>
        ) : (
          filteredUsers.map((user, index) => (
            <div
              key={user.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm animate-slideUp"
              style={{ animationDelay: `${index * 0.02}s` }}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-lg">
                    {user.full_name.charAt(0)}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {user.full_name}
                    </p>
                    {/* Status Badge */}
                    {!user.is_approved ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 font-medium">
                        Onay Bekliyor
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 font-medium">
                        Onaylı
                      </span>
                    )}
                    {/* Role Badge */}
                    {user.role !== 'user' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        user.role === 'admin'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'Moderatör'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                    <span>{user._count?.posts || 0} gönderi</span>
                    <span>{user._count?.followers || 0} takipçi</span>
                    <span>{new Date(user.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!user.is_approved && user.role === 'user' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(user.id)}
                        loading={actionLoading}
                      >
                        Onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                        }}
                      >
                        Reddet
                      </Button>
                    </>
                  )}
                  {(user.is_approved || user.role !== 'user') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowUserModal(true);
                      }}
                    >
                      Detay
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* User Detail Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUser(null);
        }}
        title="Kullanıcı Detayları"
      >
        {selectedUser && (
          <div className="p-6 space-y-6">
            {/* User Info */}
            <div className="flex items-center gap-4">
              {selectedUser.avatar_url ? (
                <img
                  src={selectedUser.avatar_url}
                  alt={selectedUser.full_name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-2xl font-semibold">
                  {selectedUser.full_name.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedUser.full_name}
                </h3>
                <p className="text-gray-500">@{selectedUser.username}</p>
                <div className="flex items-center gap-2 mt-1">
                  {selectedUser.is_approved ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 font-medium">
                      Onaylı
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 font-medium">
                      Onay Bekliyor
                    </span>
                  )}
                </div>
              </div>
            </div>

            {selectedUser.bio && (
              <p className="text-gray-600 dark:text-gray-400">{selectedUser.bio}</p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedUser._count?.posts || 0}
                </p>
                <p className="text-sm text-gray-500">Gönderi</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedUser._count?.followers || 0}
                </p>
                <p className="text-sm text-gray-500">Takipçi</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedUser._count?.following || 0}
                </p>
                <p className="text-sm text-gray-500">Takip</p>
              </div>
            </div>

            {/* Role Management */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kullanıcı Rolü
              </label>
              <div className="flex gap-2">
                {(['user', 'moderator', 'admin'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => handleChangeRole(selectedUser.id, role)}
                    disabled={actionLoading}
                    className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
                      selectedUser.role === role
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {role === 'admin' ? 'Admin' : role === 'moderator' ? 'Moderatör' : 'Kullanıcı'}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              {!selectedUser.is_approved && selectedUser.role === 'user' && (
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleApprove(selectedUser.id)}
                    loading={actionLoading}
                    className="flex-1"
                  >
                    Onayla
                  </Button>
                  <Button
                    onClick={() => handleReject(selectedUser.id)}
                    loading={actionLoading}
                    className="flex-1 bg-red-500 hover:bg-red-600"
                  >
                    Reddet & Sil
                  </Button>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => window.open(`/profil/${selectedUser.username}`, '_blank')}
                  className="flex-1"
                >
                  Profili Görüntüle
                </Button>
                {selectedUser.is_approved && (
                  <Button
                    onClick={() => handleBan(selectedUser.id, true)}
                    loading={actionLoading}
                    className="flex-1 bg-red-500 hover:bg-red-600"
                  >
                    Yasakla
                  </Button>
                )}
                {!selectedUser.is_approved && selectedUser.role !== 'user' && (
                  <Button
                    onClick={() => handleBan(selectedUser.id, false)}
                    loading={actionLoading}
                    className="flex-1"
                  >
                    Yasağı Kaldır
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
