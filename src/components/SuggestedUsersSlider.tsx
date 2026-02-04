'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import type { Profile } from '@/types';

interface SuggestedUsersSliderProps {
  users: Profile[];
  currentUserId?: string;
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
}

export function SuggestedUsersSlider({ users, currentUserId, onFollowChange }: SuggestedUsersSliderProps) {
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const supabase = createClient();

  if (users.length === 0) return null;

  const handleFollow = async (userId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUserId || loadingId) return;

    setLoadingId(userId);
    const isCurrentlyFollowing = followingIds.includes(userId);

    try {
      if (isCurrentlyFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', userId);
        setFollowingIds((prev) => prev.filter((id) => id !== userId));
        onFollowChange?.(userId, false);
      } else {
        await supabase.from('follows').insert({
          follower_id: currentUserId,
          following_id: userId,
        });
        setFollowingIds((prev) => [...prev, userId]);
        onFollowChange?.(userId, true);

        // Create notification
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', currentUserId)
          .single();

        if (currentProfile) {
          await supabase.from('notifications').insert({
            user_id: userId,
            type: 'follow',
            data: {
              user_id: currentUserId,
              user_name: currentProfile.full_name,
              user_username: currentProfile.username,
            },
          });
        }
      }
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Önerilen Kişiler
        </h3>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-3 p-4" style={{ minWidth: 'min-content' }}>
          {users.map((user) => {
            const isFollowing = followingIds.includes(user.id);
            const isLoading = loadingId === user.id;

            return (
              <Link
                key={user.id}
                href={`/profil/${user.username}`}
                className="flex-shrink-0 w-36 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
              >
                {/* Avatar */}
                <div className="relative mx-auto mb-3">
                  <Avatar
                    src={user.avatar_url}
                    alt={user.full_name}
                    size="lg"
                  />
                  <div className="absolute inset-0 rounded-full ring-2 ring-emerald-500/0 group-hover:ring-emerald-500/50 transition-all" />
                </div>

                {/* Name */}
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                  {user.full_name}
                </p>

                {/* Username */}
                <p className="text-xs text-gray-500 truncate mb-3">
                  @{user.username}
                </p>

                {/* Nickname if exists */}
                {user.nickname && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2 truncate">
                    "{user.nickname}"
                  </p>
                )}

                {/* Follow Button */}
                <Button
                  size="sm"
                  variant={isFollowing ? 'secondary' : 'primary'}
                  onClick={(e) => handleFollow(user.id, e)}
                  loading={isLoading}
                  className="w-full text-xs"
                >
                  {isFollowing ? 'Takipte' : 'Takip Et'}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
