'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import PostCard from '@/components/PostCard';
import type { Profile, Post } from '@/types';

interface UserWithStats extends Profile {
  _count?: {
    followers: number;
    posts: number;
  };
}

export default function ExplorePage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [suggestedUsers, setSuggestedUsers] = useState<UserWithStats[]>([]);
  const [popularPosts, setPopularPosts] = useState<Post[]>([]);
  const [recentMedia, setRecentMedia] = useState<{ post: Post; media: { file_url: string; file_type: string } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUser(profile);

        // Get following IDs
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        setFollowingIds(follows?.map((f) => f.following_id) || []);
      }

      // Get suggested users (users not being followed, excluding self)
      const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .limit(10);

      if (users && user) {
        // Filter out current user and already following
        const { data: currentFollows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingSet = new Set(currentFollows?.map((f) => f.following_id) || []);

        const filtered = users.filter((u) => u.id !== user.id && !followingSet.has(u.id));

        // Get follower counts for each user
        const usersWithStats = await Promise.all(
          filtered.map(async (u) => {
            const { count: followers } = await supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('following_id', u.id);

            const { count: posts } = await supabase
              .from('posts')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', u.id);

            return {
              ...u,
              _count: {
                followers: followers || 0,
                posts: posts || 0,
              },
            };
          })
        );

        setSuggestedUsers(usersWithStats.slice(0, 5));
      }

      // Get popular posts (most liked in last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: posts } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(*),
          post_media(*),
          likes(*),
          comments(*, profiles(*))
        `)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (posts) {
        // Sort by likes count
        const sorted = posts.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
        setPopularPosts(sorted.slice(0, 10));

        // Get recent media posts
        const mediaPosts = posts
          .filter((p) => p.post_media && p.post_media.length > 0)
          .flatMap((p) =>
            p.post_media!.map((m) => ({
              post: p,
              media: m,
            }))
          )
          .slice(0, 9);
        setRecentMedia(mediaPosts);
      }

      setLoading(false);
    }

    fetchData();
  }, [supabase]);

  const handleFollow = async (userId: string) => {
    if (!currentUser) return;

    if (followingIds.includes(userId)) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId);
      setFollowingIds(followingIds.filter((id) => id !== userId));
    } else {
      await supabase.from('follows').insert({
        follower_id: currentUser.id,
        following_id: userId,
      });
      setFollowingIds([...followingIds, userId]);
    }
  };

  const handlePostDeleted = (postId: string) => {
    setPopularPosts(popularPosts.filter((p) => p.id !== postId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Keşfet</h1>
        <Link href="/ara" className="text-emerald-600 hover:text-emerald-700 font-medium">
          Ara →
        </Link>
      </div>

      {/* Suggested Users */}
      {suggestedUsers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Önerilen Kullanıcılar
          </h2>
          <div className="space-y-3">
            {suggestedUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3">
                <Link href={`/profil/${user.username}`}>
                  <Avatar src={user.avatar_url} alt={user.full_name} size="md" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profil/${user.username}`} className="hover:underline">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {user.full_name}
                    </p>
                  </Link>
                  <p className="text-sm text-gray-500">
                    {user._count?.followers || 0} takipçi · {user._count?.posts || 0} gönderi
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={followingIds.includes(user.id) ? 'secondary' : 'primary'}
                  onClick={() => handleFollow(user.id)}
                >
                  {followingIds.includes(user.id) ? 'Takipte' : 'Takip Et'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Media Grid */}
      {recentMedia.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Son Paylaşılan Medyalar
          </h2>
          <div className="grid grid-cols-3 gap-1">
            {recentMedia.map(({ post, media }, index) => (
              <div
                key={`${post.id}-${index}`}
                className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg"
              >
                {media.file_type === 'image' ? (
                  <img
                    src={media.file_url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="relative w-full h-full bg-gray-900">
                    <video src={media.file_url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 bg-white/30 backdrop-blur rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-sm">
                  <span className="flex items-center gap-1">
                    <span>❤️</span>
                    {post.likes?.length || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <span>💬</span>
                    {post.comments?.length || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular Posts */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Popüler Gönderiler
        </h2>
        {popularPosts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
            <p className="text-gray-500">Henüz popüler gönderi yok</p>
          </div>
        ) : (
          <div className="space-y-4">
            {popularPosts.map((post, index) => (
              <div
                key={post.id}
                style={{ animationDelay: `${index * 0.05}s` }}
                className="animate-slideUp"
              >
                <PostCard
                  post={post}
                  currentUserId={currentUser?.id}
                  onDelete={handlePostDeleted}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
