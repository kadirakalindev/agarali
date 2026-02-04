'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ProfileSkeleton, PostSkeleton } from '@/components/ui/Skeleton';
import PostCard from '@/components/PostCard';
import { sendFollowNotification } from '@/lib/send-push-notification';
import type { Profile, Post } from '@/types';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'media'>('posts');
  const supabase = createClient();

  useEffect(() => {
    async function fetchProfile() {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUser(currentProfile);
      }

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileData) {
        setProfile(profileData);

        // Get posts
        const { data: postsData } = await supabase
          .from('posts')
          .select(`
            *,
            profiles(*),
            post_media(*),
            likes(*),
            comments(*, profiles(*))
          `)
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false });

        setPosts(postsData || []);

        // Get followers count
        const { count: followers } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', profileData.id);
        setFollowersCount(followers || 0);

        // Get following count
        const { count: following } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', profileData.id);
        setFollowingCount(following || 0);

        // Check if following
        if (user) {
          const { data: followData } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', profileData.id)
            .single();
          setIsFollowing(!!followData);
        }
      }

      setLoading(false);
    }

    fetchProfile();
  }, [username, supabase]);

  const handleFollow = async () => {
    if (!currentUser || !profile) return;

    setFollowLoading(true);

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', profile.id);
      setFollowersCount((prev) => prev - 1);
    } else {
      await supabase.from('follows').insert({
        follower_id: currentUser.id,
        following_id: profile.id,
      });
      setFollowersCount((prev) => prev + 1);

      // Create notification
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'follow',
        data: {
          user_id: currentUser.id,
          user_name: currentUser.full_name,
          user_username: currentUser.username,
        },
      });

      // Send push notification
      sendFollowNotification(profile.id, currentUser.full_name, currentUser.username);
    }
    setIsFollowing(!isFollowing);
    setFollowLoading(false);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(posts.filter((p) => p.id !== postId));
  };

  const isOwnProfile = currentUser?.id === profile?.id;
  const mediaPosts = posts.filter((p) => p.post_media && p.post_media.length > 0);

  if (loading) {
    return (
      <div className="space-y-4 animate-fadeIn">
        <ProfileSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center animate-fadeIn">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Kullanıcı bulunamadı</h2>
        <p className="text-gray-500 mb-4">@{username} kullanıcı adına sahip bir hesap yok.</p>
        <Button onClick={() => router.push('/feed')}>Ana Sayfaya Dön</Button>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden mb-4">
        {/* Cover Photo Placeholder */}
        <div className="h-32 bg-gradient-to-r from-emerald-400 to-green-500" />

        <div className="px-6 pb-6">
          {/* Avatar & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-12 sm:-mt-16">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="ring-4 ring-white dark:ring-gray-800 rounded-full overflow-hidden w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold">
                    {profile.full_name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="pb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile.full_name}
                  {profile.nickname && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-normal ml-2">
                      &quot;{profile.nickname}&quot;
                    </span>
                  )}
                </h1>
                <p className="text-gray-500">@{profile.username}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 sm:mt-0 flex gap-2">
              {isOwnProfile ? (
                <Link href="/ayarlar">
                  <Button variant="secondary">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Profili Düzenle
                  </Button>
                </Link>
              ) : (
                <>
                  <Button
                    onClick={handleFollow}
                    loading={followLoading}
                    variant={isFollowing ? 'secondary' : 'primary'}
                  >
                    {isFollowing ? (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Takip Ediliyor
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Takip Et
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="mt-4 text-gray-700 dark:text-gray-300">{profile.bio}</p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="text-center">
              <span className="block font-bold text-xl text-gray-900 dark:text-white">{posts.length}</span>
              <span className="text-sm text-gray-500">gönderi</span>
            </div>
            <button className="text-center hover:opacity-80 transition-opacity">
              <span className="block font-bold text-xl text-gray-900 dark:text-white">{followersCount}</span>
              <span className="text-sm text-gray-500">takipçi</span>
            </button>
            <button className="text-center hover:opacity-80 transition-opacity">
              <span className="block font-bold text-xl text-gray-900 dark:text-white">{followingCount}</span>
              <span className="text-sm text-gray-500">takip</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-4">
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-4 text-center font-medium transition-colors relative ${
              activeTab === 'posts'
                ? 'text-emerald-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Gönderiler
            {activeTab === 'posts' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-4 text-center font-medium transition-colors relative ${
              activeTab === 'media'
                ? 'text-emerald-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Medya
            {activeTab === 'media' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'posts' ? (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <p className="text-gray-500">
                {isOwnProfile ? 'Henüz gönderi paylaşmadın' : 'Henüz gönderi yok'}
              </p>
            </div>
          ) : (
            posts.map((post, index) => (
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
            ))
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4">
          {mediaPosts.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500">Medya içerikli gönderi yok</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {mediaPosts.flatMap((post) =>
                post.post_media?.map((media) => (
                  <div
                    key={media.id}
                    className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg"
                  >
                    {media.file_type === 'image' ? (
                      <img
                        src={media.file_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="relative w-full h-full">
                        <video src={media.file_url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
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
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
