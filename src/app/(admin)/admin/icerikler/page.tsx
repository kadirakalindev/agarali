'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import type { Post, Comment, Story, Profile } from '@/types';

type ContentType = 'posts' | 'comments' | 'stories';

interface ExtendedPost extends Post {
  profiles: Profile;
  post_media?: { file_url: string; file_type: string }[];
}

interface ExtendedComment extends Comment {
  profiles: Profile;
  posts?: { content: string };
}

interface ExtendedStory extends Story {
  profiles: Profile;
}

export default function ContentManagement() {
  const [activeTab, setActiveTab] = useState<ContentType>('posts');
  const [posts, setPosts] = useState<ExtendedPost[]>([]);
  const [comments, setComments] = useState<ExtendedComment[]>([]);
  const [stories, setStories] = useState<ExtendedStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ExtendedPost | ExtendedComment | ExtendedStory | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchContent();
  }, [activeTab]);

  const fetchContent = async () => {
    setLoading(true);

    switch (activeTab) {
      case 'posts':
        const { data: postsData } = await supabase
          .from('posts')
          .select('*, profiles(*), post_media(*)')
          .order('created_at', { ascending: false })
          .limit(50);
        setPosts(postsData || []);
        break;

      case 'comments':
        const { data: commentsData } = await supabase
          .from('comments')
          .select('*, profiles(*), posts(content)')
          .order('created_at', { ascending: false })
          .limit(50);
        setComments(commentsData || []);
        break;

      case 'stories':
        const { data: storiesData } = await supabase
          .from('stories')
          .select('*, profiles(*)')
          .order('created_at', { ascending: false })
          .limit(50);
        setStories(storiesData || []);
        break;
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    setDeleteLoading(true);

    let error;

    switch (activeTab) {
      case 'posts':
        // Delete post media first
        await supabase.from('post_media').delete().eq('post_id', selectedItem.id);
        // Delete post likes
        await supabase.from('likes').delete().eq('post_id', selectedItem.id);
        // Delete post comments
        await supabase.from('comments').delete().eq('post_id', selectedItem.id);
        // Delete post
        ({ error } = await supabase.from('posts').delete().eq('id', selectedItem.id));
        if (!error) {
          setPosts(posts.filter((p) => p.id !== selectedItem.id));
        }
        break;

      case 'comments':
        ({ error } = await supabase.from('comments').delete().eq('id', selectedItem.id));
        if (!error) {
          setComments(comments.filter((c) => c.id !== selectedItem.id));
        }
        break;

      case 'stories':
        // Delete story views
        await supabase.from('story_views').delete().eq('story_id', selectedItem.id);
        // Delete story
        ({ error } = await supabase.from('stories').delete().eq('id', selectedItem.id));
        if (!error) {
          setStories(stories.filter((s) => s.id !== selectedItem.id));
        }
        break;
    }

    setDeleteLoading(false);
    setShowDeleteModal(false);
    setSelectedItem(null);
  };

  const filteredPosts = posts.filter(
    (p) =>
      p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredComments = comments.filter(
    (c) =>
      c.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStories = stories.filter((s) =>
    s.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'posts' as ContentType, label: 'Gönderiler', count: posts.length },
    { id: 'comments' as ContentType, label: 'Yorumlar', count: comments.length },
    { id: 'stories' as ContentType, label: 'Hikayeler', count: stories.length },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">İçerik Yönetimi</h1>
        <p className="text-gray-500 mt-1">Gönderiler, yorumlar ve hikayeleri yönetin</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Search */}
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
          placeholder="İçerik veya kullanıcı ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Posts */}
          {activeTab === 'posts' && (
            <>
              {filteredPosts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
                  <p className="text-gray-500">Gönderi bulunamadı</p>
                </div>
              ) : (
                filteredPosts.map((post, index) => (
                  <div
                    key={post.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm animate-slideUp"
                    style={{ animationDelay: `${index * 0.02}s` }}
                  >
                    <div className="flex items-start gap-3">
                      {post.profiles?.avatar_url ? (
                        <img
                          src={post.profiles.avatar_url}
                          alt={post.profiles.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold">
                          {post.profiles?.full_name?.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {post.profiles?.full_name}
                          </span>
                          <span className="text-sm text-gray-500">@{post.profiles?.username}</span>
                          <span className="text-sm text-gray-400">
                            {new Date(post.created_at).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 mt-1 line-clamp-3">
                          {post.content}
                        </p>
                        {post.post_media && post.post_media.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {post.post_media.slice(0, 3).map((media, i) => (
                              <div key={i} className="relative">
                                {media.file_type === 'image' ? (
                                  <img
                                    src={media.file_url}
                                    alt=""
                                    className="w-20 h-20 object-cover rounded-lg"
                                  />
                                ) : (
                                  <video
                                    src={media.file_url}
                                    className="w-20 h-20 object-cover rounded-lg"
                                  />
                                )}
                              </div>
                            ))}
                            {post.post_media.length > 3 && (
                              <div className="w-20 h-20 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-medium">
                                +{post.post_media.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => {
                          setSelectedItem(post);
                          setShowDeleteModal(true);
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* Comments */}
          {activeTab === 'comments' && (
            <>
              {filteredComments.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
                  <p className="text-gray-500">Yorum bulunamadı</p>
                </div>
              ) : (
                filteredComments.map((comment, index) => (
                  <div
                    key={comment.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm animate-slideUp"
                    style={{ animationDelay: `${index * 0.02}s` }}
                  >
                    <div className="flex items-start gap-3">
                      {comment.profiles?.avatar_url ? (
                        <img
                          src={comment.profiles.avatar_url}
                          alt={comment.profiles.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold">
                          {comment.profiles?.full_name?.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {comment.profiles?.full_name}
                          </span>
                          <span className="text-sm text-gray-500">@{comment.profiles?.username}</span>
                          <span className="text-sm text-gray-400">
                            {new Date(comment.created_at).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 mt-1">
                          {comment.content}
                        </p>
                        {comment.posts && (
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-500">
                            <span className="font-medium">Gönderi:</span> {comment.posts.content.slice(0, 100)}...
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => {
                          setSelectedItem(comment);
                          setShowDeleteModal(true);
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* Stories */}
          {activeTab === 'stories' && (
            <>
              {filteredStories.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
                  <p className="text-gray-500">Hikaye bulunamadı</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredStories.map((story, index) => (
                    <div
                      key={story.id}
                      className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm animate-slideUp"
                      style={{ animationDelay: `${index * 0.02}s` }}
                    >
                      <div className="aspect-[9/16] relative">
                        {story.file_type === 'image' ? (
                          <img
                            src={story.file_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            src={story.file_url}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <div className="flex items-center gap-2">
                            {story.profiles?.avatar_url ? (
                              <img
                                src={story.profiles.avatar_url}
                                alt={story.profiles.full_name}
                                className="w-8 h-8 rounded-full object-cover border-2 border-white"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-600 font-semibold text-sm">
                                {story.profiles?.full_name?.charAt(0)}
                              </div>
                            )}
                            <span className="text-white text-sm font-medium truncate">
                              {story.profiles?.full_name}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedItem(story);
                            setShowDeleteModal(true);
                          }}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="p-3 text-center">
                        <p className="text-xs text-gray-500">
                          {new Date(story.created_at).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Bitiş: {new Date(story.expires_at).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedItem(null);
        }}
        title="İçerik Silme"
      >
        <div className="p-6">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">
            Bu içeriği silmek istediğinize emin misiniz?
          </h3>
          <p className="text-gray-500 text-center mb-6">
            Bu işlem geri alınamaz. İçerik kalıcı olarak silinecektir.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedItem(null);
              }}
              className="flex-1"
            >
              İptal
            </Button>
            <Button
              onClick={handleDelete}
              loading={deleteLoading}
              className="flex-1 bg-red-500 hover:bg-red-600"
            >
              Sil
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
