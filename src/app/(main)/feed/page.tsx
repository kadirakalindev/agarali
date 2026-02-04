'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import StoryBar from '@/components/StoryBar';
import CreatePost from '@/components/CreatePost';
import PostCard from '@/components/PostCard';
import { AnnouncementCard } from '@/components/AnnouncementCard';
import { PollCard } from '@/components/PollCard';
import { PostSkeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { SuggestedUsersSlider } from '@/components/SuggestedUsersSlider';
import type { Post, Profile, Event, Announcement, Poll } from '@/types';

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [suggestedUsers, setSuggestedUsers] = useState<Profile[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);

  // Supabase client'ı memoize et
  const supabase = useMemo(() => createClient(), []);

  const fetchPosts = useCallback(async (offset = 0) => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles(*),
        post_media(*),
        likes(*),
        comments(*, profiles(*))
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + 9);

    if (!error && data) {
      if (offset === 0) {
        setPosts(data);
      } else {
        setPosts((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === 10);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [supabase]);

  const fetchSidebar = useCallback(async (userId: string) => {
    const now = new Date().toISOString();

    // Tüm fetch'leri paralel yap (Promise.all ile)
    const [
      { data: followingData },
      { data: allUsers },
      { data: events },
      { data: announcementsData },
      { data: pollsData },
    ] = await Promise.all([
      // Get following IDs
      supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId),

      // Suggested users (daha fazla çek slider için)
      supabase
        .from('profiles')
        .select('*')
        .neq('id', userId)
        .eq('is_approved', true)
        .limit(15),

      // Upcoming events
      supabase
        .from('events')
        .select('*, profiles(*), event_participants(*)')
        .gte('event_date', now)
        .order('event_date', { ascending: true })
        .limit(3),

      // Active announcements
      supabase
        .from('announcements')
        .select('*, profiles(*)')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5),

      // Active polls
      supabase
        .from('polls')
        .select(`
          *,
          profiles(*),
          poll_options(*),
          poll_votes(*, profiles(*))
        `)
        .eq('is_active', true)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    const followIds = followingData?.map((f) => f.following_id) || [];
    setFollowingIds(followIds);

    if (allUsers) {
      const notFollowing = allUsers.filter((u) => !followIds.includes(u.id));
      setSuggestedUsers(notFollowing.slice(0, 10)); // Slider için 10 kişi
    }

    if (events) {
      setUpcomingEvents(events);
    }

    if (announcementsData) {
      setAnnouncements(announcementsData);
    }

    if (pollsData) {
      setPolls(pollsData);
    }
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);
        if (data) {
          fetchSidebar(data.id);
        }
      }
      fetchPosts();
    }
    init();
  }, [supabase, fetchPosts, fetchSidebar]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 500
      ) {
        if (!loadingMore && hasMore && !loading) {
          setLoadingMore(true);
          fetchPosts(posts.length);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, loading, posts.length, fetchPosts]);

  const handleFollow = async (userId: string) => {
    if (!profile) return;

    await supabase.from('follows').insert({
      follower_id: profile.id,
      following_id: userId,
    });

    setFollowingIds([...followingIds, userId]);
    setSuggestedUsers(suggestedUsers.filter((u) => u.id !== userId));
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(posts.filter((p) => p.id !== postId));
  };

  const handlePostCreated = () => {
    fetchPosts(0);
  };

  const refreshPolls = useCallback(async () => {
    const { data: pollsData } = await supabase
      .from('polls')
      .select(`
        *,
        profiles(*),
        poll_options(*),
        poll_votes(*, profiles(*))
      `)
      .eq('is_active', true)
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })
      .limit(3);

    if (pollsData) {
      setPolls(pollsData);
    }
  }, [supabase]);

  return (
    <div className="animate-fadeIn">
      <div className="flex gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0 max-w-2xl">
          {/* Stories */}
          <StoryBar currentUserId={profile?.id} />

          {/* Suggested Users Slider - Only on mobile/tablet */}
          {suggestedUsers.length > 0 && (
            <div className="xl:hidden mb-4">
              <SuggestedUsersSlider
                users={suggestedUsers}
                currentUserId={profile?.id}
                onFollowChange={(userId, isFollowing) => {
                  if (isFollowing) {
                    setFollowingIds([...followingIds, userId]);
                    setSuggestedUsers(suggestedUsers.filter((u) => u.id !== userId));
                  }
                }}
              />
            </div>
          )}

          {/* Pinned Announcements */}
          {announcements.filter(a => a.is_pinned).length > 0 && (
            <div className="space-y-3 mb-4">
              {announcements.filter(a => a.is_pinned).map((announcement) => (
                <AnnouncementCard key={announcement.id} announcement={announcement} />
              ))}
            </div>
          )}

          {/* Active Polls */}
          {polls.length > 0 && (
            <div className="space-y-4 mb-4">
              {polls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  currentUserId={profile?.id}
                  onVoteChange={refreshPolls}
                />
              ))}
            </div>
          )}

          {/* Create Post */}
          {profile && (
            <CreatePost profile={profile} onPostCreated={handlePostCreated} />
          )}

          {/* Other Announcements (not pinned) */}
          {announcements.filter(a => !a.is_pinned).length > 0 && (
            <div className="space-y-3 mb-4">
              {announcements.filter(a => !a.is_pinned).slice(0, 2).map((announcement) => (
                <AnnouncementCard key={announcement.id} announcement={announcement} />
              ))}
            </div>
          )}

          {/* Posts */}
          <div className="space-y-4">
            {loading ? (
              <>
                <PostSkeleton />
                <PostSkeleton />
                <PostSkeleton />
              </>
            ) : posts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center animate-fadeIn">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Henüz gönderi yok
                </h3>
                <p className="text-gray-500 mb-4">
                  İlk gönderiyi sen paylaş ve sohbeti başlat!
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
                    currentUserId={profile?.id}
                    onDelete={handlePostDeleted}
                  />
                </div>
              ))
            )}

            {loadingMore && (
              <div className="py-4">
                <PostSkeleton />
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">Tüm gönderileri gördünüz</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Hidden on mobile and tablet */}
        <aside className="hidden xl:block w-72 flex-shrink-0">
          <div className="sticky top-20 space-y-4">
            {/* Profile Card */}
            {profile && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                <Link href={`/profil/${profile.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <Avatar src={profile.avatar_url} alt={profile.full_name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {profile.full_name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">@{profile.username}</p>
                  </div>
                </Link>
              </div>
            )}

            {/* Suggested Users */}
            {suggestedUsers.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Önerilen Kişiler
                  </h3>
                  <Link href="/kesfet" className="text-sm text-emerald-600 hover:underline">
                    Tümü
                  </Link>
                </div>
                <div className="space-y-3">
                  {suggestedUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3">
                      <Link href={`/profil/${user.username}`}>
                        <Avatar src={user.avatar_url} alt={user.full_name} size="sm" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/profil/${user.username}`}>
                          <p className="font-medium text-gray-900 dark:text-white text-sm truncate hover:underline">
                            {user.full_name}
                          </p>
                        </Link>
                        <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleFollow(user.id)}
                      >
                        Takip Et
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Yaklaşan Etkinlikler
                  </h3>
                  <Link href="/etkinlikler" className="text-sm text-emerald-600 hover:underline">
                    Tümü
                  </Link>
                </div>
                <div className="space-y-3">
                  {upcomingEvents.map((event) => {
                    const eventDate = new Date(event.event_date);
                    const participantCount = event.event_participants?.length || 0;

                    return (
                      <Link
                        key={event.id}
                        href="/etkinlikler"
                        className="flex items-start gap-3 p-2 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="w-12 flex-shrink-0 text-center">
                          <div className="text-xs text-emerald-600 font-medium">
                            {eventDate.toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase()}
                          </div>
                          <div className="text-xl font-bold text-gray-900 dark:text-white">
                            {eventDate.getDate()}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {event.title}
                          </p>
                          {event.location && (
                            <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              {event.location}
                            </p>
                          )}
                          <p className="text-xs text-emerald-600 mt-1">
                            {participantCount} kişi katılıyor
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Links */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Hızlı Erişim
              </h3>
              <div className="space-y-1">
                <Link
                  href="/kesfet"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Keşfet</span>
                </Link>
                <Link
                  href="/etkinlikler"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Etkinlikler</span>
                </Link>
                <Link
                  href="/bildirimler"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Bildirimler</span>
                </Link>
                <Link
                  href="/ayarlar"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Ayarlar</span>
                </Link>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 py-4">
              <p>Agara Köyü Sosyal Ağı</p>
              <p className="mt-1">&copy; 2026</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
