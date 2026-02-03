'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui/Spinner';

interface Stats {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  totalStories: number;
  totalEvents: number;
  newUsersToday: number;
  newPostsToday: number;
  activeUsers: number;
}

interface RecentUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
}

interface RecentPost {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    full_name: string;
  } | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchStats() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Fetch all counts in parallel
      const [
        { count: totalUsers },
        { count: totalPosts },
        { count: totalComments },
        { count: totalStories },
        { count: totalEvents },
        { count: newUsersToday },
        { count: newPostsToday },
        { data: recentUsersData },
        { data: recentPostsData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('comments').select('*', { count: 'exact', head: true }),
        supabase.from('stories').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
        supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
        supabase.from('profiles').select('id, username, full_name, avatar_url, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('posts').select('id, content, created_at, profiles(username, full_name)').order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        totalPosts: totalPosts || 0,
        totalComments: totalComments || 0,
        totalStories: totalStories || 0,
        totalEvents: totalEvents || 0,
        newUsersToday: newUsersToday || 0,
        newPostsToday: newPostsToday || 0,
        activeUsers: Math.floor((totalUsers || 0) * 0.7), // Simulated active users
      });

      setRecentUsers(recentUsersData || []);
      // Transform posts data to flatten profiles
      const transformedPosts = (recentPostsData || []).map((post: { id: string; content: string; created_at: string; profiles: { username: string; full_name: string } | { username: string; full_name: string }[] | null }) => ({
        ...post,
        profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
      }));
      setRecentPosts(transformedPosts as RecentPost[]);
      setLoading(false);
    }

    fetchStats();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Toplam Kullanıcı',
      value: stats?.totalUsers || 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Toplam Gönderi',
      value: stats?.totalPosts || 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
        </svg>
      ),
      color: 'bg-emerald-500',
      bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: 'Toplam Yorum',
      value: stats?.totalComments || 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      color: 'bg-purple-500',
      bgLight: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'Aktif Hikaye',
      value: stats?.totalStories || 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-orange-500',
      bgLight: 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      label: 'Toplam Etkinlik',
      value: stats?.totalEvents || 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-pink-500',
      bgLight: 'bg-pink-50 dark:bg-pink-900/20',
    },
    {
      label: 'Bugün Yeni Üye',
      value: stats?.newUsersToday || 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      color: 'bg-cyan-500',
      bgLight: 'bg-cyan-50 dark:bg-cyan-900/20',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 mt-1">Agara Köyü sosyal ağ istatistikleri</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => (
          <div
            key={stat.label}
            className={`${stat.bgLight} rounded-2xl p-6 animate-slideUp`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stat.value.toLocaleString()}
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-xl text-white`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Son Kayıt Olanlar
          </h2>
          <div className="space-y-3">
            {recentUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Henüz kullanıcı yok</p>
            ) : (
              recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold">
                      {user.full_name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {user.full_name}
                    </p>
                    <p className="text-sm text-gray-500">@{user.username}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(user.created_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Posts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Son Gönderiler
          </h2>
          <div className="space-y-3">
            {recentPosts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Henüz gönderi yok</p>
            ) : (
              recentPosts.map((post) => (
                <div key={post.id} className="p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {post.profiles?.full_name}
                    </span>
                    <span className="text-sm text-gray-500">
                      @{post.profiles?.username}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                    {post.content}
                  </p>
                  <span className="text-xs text-gray-400 mt-1 block">
                    {new Date(post.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
