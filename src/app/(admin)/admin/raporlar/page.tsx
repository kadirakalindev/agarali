'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui/Spinner';

interface DailyStats {
  date: string;
  users: number;
  posts: number;
  comments: number;
}

interface TopUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  postCount: number;
}

interface PopularPost {
  id: string;
  content: string;
  likeCount: number;
  commentCount: number;
  profiles: {
    username: string;
    full_name: string;
  };
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [popularPosts, setPopularPosts] = useState<PopularPost[]>([]);
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('7');
  const supabase = createClient();

  useEffect(() => {
    fetchReports();
  }, [timeRange]);

  const fetchReports = async () => {
    setLoading(true);

    const days = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Generate daily stats (simulated for now as Supabase doesn't have built-in date grouping)
    const stats: DailyStats[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [
        { count: users },
        { count: posts },
        { count: comments },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', dateStr).lt('created_at', nextDate.toISOString().split('T')[0]),
        supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', dateStr).lt('created_at', nextDate.toISOString().split('T')[0]),
        supabase.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', dateStr).lt('created_at', nextDate.toISOString().split('T')[0]),
      ]);

      stats.push({
        date: date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        users: users || 0,
        posts: posts || 0,
        comments: comments || 0,
      });
    }
    setDailyStats(stats);

    // Top users by post count
    const { data: users } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url');

    if (users) {
      const usersWithCounts = await Promise.all(
        users.map(async (user) => {
          const { count } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          return { ...user, postCount: count || 0 };
        })
      );

      setTopUsers(
        usersWithCounts
          .sort((a, b) => b.postCount - a.postCount)
          .slice(0, 5)
      );
    }

    // Popular posts
    const { data: posts } = await supabase
      .from('posts')
      .select('id, content, profiles(username, full_name)')
      .gte('created_at', startDate.toISOString())
      .limit(20);

    if (posts) {
      const postsWithCounts = await Promise.all(
        posts.map(async (post) => {
          const [{ count: likeCount }, { count: commentCount }] = await Promise.all([
            supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
            supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
          ]);
          return {
            ...post,
            likeCount: likeCount || 0,
            commentCount: commentCount || 0,
          };
        })
      );

      setPopularPosts(
        postsWithCounts
          .sort((a, b) => (b.likeCount + b.commentCount) - (a.likeCount + a.commentCount))
          .slice(0, 5) as PopularPost[]
      );
    }

    setLoading(false);
  };

  const maxStat = Math.max(...dailyStats.flatMap((d) => [d.users, d.posts, d.comments]), 1);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Raporlar</h1>
          <p className="text-gray-500 mt-1">Platform aktivite raporları</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as '7' | '30' | '90')}
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="7">Son 7 gün</option>
          <option value="30">Son 30 gün</option>
          <option value="90">Son 90 gün</option>
        </select>
      </div>

      {/* Activity Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Günlük Aktivite</h2>

        {/* Legend */}
        <div className="flex gap-6 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Yeni Üye</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Gönderi</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Yorum</span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64 flex items-end gap-1">
          {dailyStats.map((day, index) => (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center gap-1 animate-slideUp"
              style={{ animationDelay: `${index * 0.02}s` }}
            >
              <div className="w-full flex gap-0.5 items-end h-48">
                <div
                  className="flex-1 bg-blue-500 rounded-t transition-all"
                  style={{ height: `${(day.users / maxStat) * 100}%`, minHeight: day.users > 0 ? '4px' : '0' }}
                  title={`${day.users} yeni üye`}
                />
                <div
                  className="flex-1 bg-emerald-500 rounded-t transition-all"
                  style={{ height: `${(day.posts / maxStat) * 100}%`, minHeight: day.posts > 0 ? '4px' : '0' }}
                  title={`${day.posts} gönderi`}
                />
                <div
                  className="flex-1 bg-purple-500 rounded-t transition-all"
                  style={{ height: `${(day.comments / maxStat) * 100}%`, minHeight: day.comments > 0 ? '4px' : '0' }}
                  title={`${day.comments} yorum`}
                />
              </div>
              <span className="text-xs text-gray-400 transform -rotate-45 origin-top-left whitespace-nowrap">
                {day.date}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-4 mt-8 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {dailyStats.reduce((sum, d) => sum + d.users, 0)}
            </p>
            <p className="text-sm text-gray-500">Toplam Yeni Üye</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {dailyStats.reduce((sum, d) => sum + d.posts, 0)}
            </p>
            <p className="text-sm text-gray-500">Toplam Gönderi</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {dailyStats.reduce((sum, d) => sum + d.comments, 0)}
            </p>
            <p className="text-sm text-gray-500">Toplam Yorum</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Users */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">En Aktif Kullanıcılar</h2>
          <div className="space-y-3">
            {topUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Veri bulunamadı</p>
            ) : (
              topUsers.map((user, index) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors animate-slideUp"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-sm font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
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
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{user.postCount}</p>
                    <p className="text-xs text-gray-500">gönderi</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Popular Posts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Popüler Gönderiler</h2>
          <div className="space-y-3">
            {popularPosts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Veri bulunamadı</p>
            ) : (
              popularPosts.map((post, index) => (
                <div
                  key={post.id}
                  className="p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors animate-slideUp"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-600 text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white text-sm">
                      {post.profiles?.full_name}
                    </span>
                    <span className="text-sm text-gray-500">@{post.profiles?.username}</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 ml-7">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-4 mt-2 ml-7 text-sm">
                    <span className="flex items-center gap-1 text-red-500">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      {post.likeCount}
                    </span>
                    <span className="flex items-center gap-1 text-blue-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {post.commentCount}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
