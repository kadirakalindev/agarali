'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from './ui/Avatar';
import { Modal } from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { StorySkeleton } from './ui/Skeleton';
import type { Story, Profile } from '@/types';

interface StoryGroup {
  user: Profile;
  stories: Story[];
  hasUnviewed: boolean;
}

interface StoryBarProps {
  currentUserId?: string;
}

export default function StoryBar({ currentUserId }: StoryBarProps) {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeGroup, setActiveGroup] = useState<StoryGroup | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const supabase = createClient();

  const fetchStories = useCallback(async () => {
    const { data: stories } = await supabase
      .from('stories')
      .select('*, profiles(*), story_views(*)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (stories) {
      const groups: Record<string, StoryGroup> = {};
      stories.forEach((story) => {
        if (!groups[story.user_id]) {
          groups[story.user_id] = {
            user: story.profiles!,
            stories: [],
            hasUnviewed: false,
          };
        }
        groups[story.user_id].stories.push(story);
        if (!story.story_views?.some((v: { user_id: string }) => v.user_id === currentUserId)) {
          groups[story.user_id].hasUnviewed = true;
        }
      });
      setStoryGroups(Object.values(groups));
    }
    setLoading(false);
  }, [supabase, currentUserId]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Story progress timer
  useEffect(() => {
    if (showViewModal && !isPaused) {
      setProgress(0);
      const duration = 5000; // 5 seconds
      const interval = 50;
      const increment = (interval / duration) * 100;

      progressRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            nextStory();
            return 0;
          }
          return prev + increment;
        });
      }, interval);

      return () => {
        if (progressRef.current) clearInterval(progressRef.current);
      };
    }
  }, [showViewModal, activeIndex, isPaused]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('Dosya boyutu 50MB\'dan küçük olmalıdır');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;
    const isVideo = file.type.startsWith('video/');

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    const { error: uploadError } = await supabase.storage
      .from('stories')
      .upload(fileName, file);

    clearInterval(progressInterval);

    if (uploadError) {
      alert('Yükleme hatası: ' + uploadError.message);
      setUploading(false);
      return;
    }

    setUploadProgress(100);

    const { data: { publicUrl } } = supabase.storage
      .from('stories')
      .getPublicUrl(fileName);

    const { error } = await supabase.from('stories').insert({
      user_id: currentUserId,
      file_url: publicUrl,
      file_type: isVideo ? 'video' : 'image',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) {
      alert('Hikaye oluşturulamadı: ' + error.message);
      setUploading(false);
      setUploadProgress(0);
    } else {
      setUploadSuccess(true);
      fetchStories();
      setTimeout(() => {
        setShowCreateModal(false);
        setUploading(false);
        setUploadProgress(0);
        setUploadSuccess(false);
      }, 1500);
    }
  };

  const openStory = async (group: StoryGroup) => {
    setActiveGroup(group);
    setActiveIndex(0);
    setProgress(0);
    setShowViewModal(true);

    // Mark as viewed
    if (currentUserId && currentUserId !== group.user.id) {
      await supabase.from('story_views').upsert({
        story_id: group.stories[0].id,
        user_id: currentUserId,
      });
    }
  };

  const nextStory = async () => {
    if (!activeGroup) return;

    if (activeIndex < activeGroup.stories.length - 1) {
      const newIndex = activeIndex + 1;
      setActiveIndex(newIndex);
      setProgress(0);

      if (currentUserId && currentUserId !== activeGroup.user.id) {
        await supabase.from('story_views').upsert({
          story_id: activeGroup.stories[newIndex].id,
          user_id: currentUserId,
        });
      }
    } else {
      // Move to next user's story
      const currentGroupIndex = storyGroups.findIndex((g) => g.user.id === activeGroup.user.id);
      if (currentGroupIndex < storyGroups.length - 1) {
        const nextGroup = storyGroups[currentGroupIndex + 1];
        setActiveGroup(nextGroup);
        setActiveIndex(0);
        setProgress(0);
      } else {
        setShowViewModal(false);
      }
    }
  };

  const prevStory = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
      setProgress(0);
    } else {
      // Move to previous user's story
      const currentGroupIndex = storyGroups.findIndex((g) => g.user.id === activeGroup?.user.id);
      if (currentGroupIndex > 0) {
        const prevGroup = storyGroups[currentGroupIndex - 1];
        setActiveGroup(prevGroup);
        setActiveIndex(prevGroup.stories.length - 1);
        setProgress(0);
      }
    }
  };

  const timeAgo = (date: string) => {
    const hours = Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'Az önce';
    return `${hours}sa`;
  };

  return (
    <>
      {/* Story Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex space-x-4 overflow-x-auto no-scrollbar pb-2">
          {/* Add Story Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-shrink-0 flex flex-col items-center group"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center border-2 border-dashed border-emerald-500 group-hover:border-emerald-400 transition-colors">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
            <span className="text-xs mt-2 text-gray-600 dark:text-gray-400 font-medium">Hikaye Ekle</span>
          </button>

          {/* Loading Skeleton */}
          {loading && (
            <>
              <StorySkeleton />
              <StorySkeleton />
              <StorySkeleton />
            </>
          )}

          {/* Story Groups */}
          {!loading && storyGroups.map((group) => (
            <button
              key={group.user.id}
              onClick={() => openStory(group)}
              className="flex-shrink-0 flex flex-col items-center group"
            >
              <div className={`p-[3px] rounded-full ${
                group.hasUnviewed
                  ? 'bg-gradient-to-tr from-emerald-500 via-green-400 to-teal-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}>
                <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 p-[2px]">
                  {group.user.avatar_url ? (
                    <img
                      src={group.user.avatar_url}
                      alt={group.user.full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                      {group.user.full_name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs mt-2 text-gray-600 dark:text-gray-400 truncate w-16 text-center font-medium">
                {group.user.id === currentUserId ? 'Hikayem' : group.user.full_name.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Create Story Modal */}
      <Modal isOpen={showCreateModal} onClose={() => !uploading && setShowCreateModal(false)} title="Hikaye Ekle">
        <div className="p-6">
          <label className="block cursor-pointer">
            <div className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
              uploading
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
            }`}>
              {uploadSuccess ? (
                <div className="space-y-4 animate-scaleIn">
                  <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-emerald-600 font-semibold text-lg">Hikaye Paylaşıldı!</p>
                </div>
              ) : uploading ? (
                <div className="space-y-4">
                  <Spinner size="lg" />
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-emerald-600 font-medium">Yükleniyor... %{uploadProgress}</p>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Fotoğraf veya Video Seç
                  </p>
                  <p className="text-sm text-gray-500">
                    PNG, JPG, GIF veya MP4 (max. 50MB)
                  </p>
                </>
              )}
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
            </div>
          </label>

          <p className="text-center text-sm text-gray-500 mt-4">
            Hikayeler 24 saat sonra otomatik silinir
          </p>
        </div>
      </Modal>

      {/* View Story Modal */}
      {showViewModal && activeGroup && (
        <div
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Progress Bars */}
          <div className="absolute top-4 left-4 right-4 flex space-x-1 z-10">
            {activeGroup.stories.map((_, index) => (
              <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{
                    width: index < activeIndex ? '100%' : index === activeIndex ? `${progress}%` : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* User Info */}
          <div className="absolute top-10 left-4 right-4 flex items-center justify-between z-10">
            <div className="flex items-center space-x-3">
              {activeGroup.user.avatar_url ? (
                  <img
                    src={activeGroup.user.avatar_url}
                    alt={activeGroup.user.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold">
                    {activeGroup.user.full_name.charAt(0)}
                  </div>
                )}
              <div>
                <p className="text-white font-semibold">{activeGroup.user.full_name}</p>
                <p className="text-white/70 text-sm">{timeAgo(activeGroup.stories[activeIndex].created_at)}</p>
              </div>
            </div>
            <button
              onClick={() => setShowViewModal(false)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Story Content */}
          <div className="w-full h-full flex items-center justify-center">
            {activeGroup.stories[activeIndex].file_type === 'image' ? (
              <img
                src={activeGroup.stories[activeIndex].file_url}
                alt=""
                className="max-w-full max-h-full object-contain animate-fadeIn"
              />
            ) : (
              <video
                src={activeGroup.stories[activeIndex].file_url}
                autoPlay
                playsInline
                className="max-w-full max-h-full object-contain"
                onEnded={nextStory}
              />
            )}
          </div>

          {/* Navigation Overlay */}
          <button
            onClick={prevStory}
            className="absolute left-0 top-20 bottom-0 w-1/3 cursor-pointer"
            aria-label="Önceki"
          />
          <button
            onClick={nextStory}
            className="absolute right-0 top-20 bottom-0 w-1/3 cursor-pointer"
            aria-label="Sonraki"
          />

          {/* Views (for own stories) */}
          {currentUserId === activeGroup.user.id && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
              <div className="flex items-center space-x-2 text-white/80 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{activeGroup.stories[activeIndex].story_views?.length || 0} görüntülenme</span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
