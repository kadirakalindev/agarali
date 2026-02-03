'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import PostCard from '@/components/PostCard';
import type { Profile, Post } from '@/types';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'users' | 'posts'>('users');
  const [users, setUsers] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    }
    getCurrentUser();
  }, [supabase]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setUsers([]);
      setPosts([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    // Update URL
    router.push(`/ara?q=${encodeURIComponent(searchQuery)}`, { scroll: false });

    // Search users
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
      .limit(20);

    setUsers(usersData || []);

    // Search posts
    const { data: postsData } = await supabase
      .from('posts')
      .select(`
        *,
        profiles(*),
        post_media(*),
        likes(*),
        comments(*, profiles(*))
      `)
      .ilike('content', `%${searchQuery}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    setPosts(postsData || []);
    setLoading(false);
  }, [supabase, router]);

  // Search on initial load if query exists
  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery, handleSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(posts.filter((p) => p.id !== postId));
  };

  return (
    <div className="animate-fadeIn">
      {/* Search Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 mb-4">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kullanıcı veya gönderi ara..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setUsers([]);
                  setPosts([]);
                  setSearched(false);
                  router.push('/ara', { scroll: false });
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </form>

        {/* Tabs */}
        {searched && (
          <div className="flex mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-2 text-center font-medium rounded-lg transition-colors ${
                activeTab === 'users'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Kullanıcılar ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 py-2 text-center font-medium rounded-lg transition-colors ${
                activeTab === 'posts'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Gönderiler ({posts.length})
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <>
          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-2">
              {users.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">"{query}" ile eşleşen kullanıcı bulunamadı</p>
                </div>
              ) : (
                users.map((user) => (
                  <Link
                    key={user.id}
                    href={`/profil/${user.username}`}
                    className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <Avatar src={user.avatar_url} alt={user.full_name} size="lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {user.full_name}
                      </p>
                      <p className="text-gray-500 text-sm">@{user.username}</p>
                      {user.bio && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-1">
                          {user.bio}
                        </p>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))
              )}
            </div>
          )}

          {/* Posts Tab */}
          {activeTab === 'posts' && (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">"{query}" ile eşleşen gönderi bulunamadı</p>
                </div>
              ) : (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUserId || undefined}
                    onDelete={handlePostDeleted}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Initial State */}
      {!loading && !searched && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ara</h2>
          <p className="text-gray-500">Kullanıcıları veya gönderileri aramak için yukarıdaki arama kutusunu kullan</p>
        </div>
      )}
    </div>
  );
}
