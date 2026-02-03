'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import type { Profile } from '@/types';

interface CreatePostProps {
  profile: Profile;
  onPostCreated: () => void;
}

export default function CreatePost({ profile, onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionResults, setMentionResults] = useState<Profile[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
  };

  const addFiles = (selectedFiles: File[]) => {
    if (selectedFiles.length + files.length > 4) {
      alert('En fazla 4 dosya yükleyebilirsiniz');
      return;
    }

    // Validate file sizes
    const validFiles = selectedFiles.filter((file) => {
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} dosyası 50MB'dan büyük`);
        return false;
      }
      return true;
    });

    setFiles([...files, ...validFiles]);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleMentionSearch = async (searchText: string) => {
    if (searchText.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `${searchText}%`)
        .limit(5);
      setMentionResults(data || []);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    setCursorPosition(e.target.selectionStart || 0);

    // Check for @mention
    const textBeforeCursor = value.slice(0, e.target.selectionStart || 0);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt);
        handleMentionSearch(textAfterAt);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (username: string) => {
    const textBeforeCursor = content.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = content.slice(cursorPosition);
    const newContent = content.slice(0, lastAtIndex) + `@${username} ` + textAfterCursor;
    setContent(newContent);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && files.length === 0) return;

    setLoading(true);

    try {
      // Create post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({ user_id: profile.id, content: content.trim() })
        .select()
        .single();

      if (postError) throw postError;

      // Extract mentions and create notifications
      const mentions = content.match(/@(\w+)/g);
      if (mentions) {
        for (const mention of mentions) {
          const username = mention.slice(1);
          const { data: mentionedUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();

          if (mentionedUser) {
            await supabase.from('mentions').insert({
              post_id: post.id,
              mentioned_user_id: mentionedUser.id,
              mentioned_by: profile.id,
            });

            // Create notification
            await supabase.from('notifications').insert({
              user_id: mentionedUser.id,
              type: 'mention',
              data: {
                post_id: post.id,
                user_name: profile.full_name,
                user_username: profile.username,
              },
            });
          }
        }
      }

      // Upload media
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${profile.id}/${post.id}/${Date.now()}.${fileExt}`;
        const isVideo = file.type.startsWith('video/');

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);

        await supabase.from('post_media').insert({
          post_id: post.id,
          file_url: publicUrl,
          file_type: isVideo ? 'video' : 'image',
        });
      }

      setContent('');
      setFiles([]);
      setPreviews([]);
      onPostCreated();
    } catch (error) {
      console.error('Post oluşturma hatası:', error);
      alert('Gönderi paylaşılırken bir hata oluştu');
    }

    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 mb-4">
      <form onSubmit={handleSubmit}>
        <div className="flex space-x-3">
          <Avatar src={profile.avatar_url} alt={profile.full_name} size="md" />
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              placeholder="Ne düşünüyorsun? (@kullanıcı ile etiketle)"
              className="w-full resize-none bg-gray-50 dark:bg-gray-700/50 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all min-h-[100px]"
              rows={3}
            />

            {/* Mention Suggestions */}
            {showMentions && mentionResults.length > 0 && (
              <div className="absolute left-0 right-0 bg-white dark:bg-gray-800 rounded-xl shadow-lg mt-1 py-2 z-20 animate-slideDown">
                {mentionResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => insertMention(user.username)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Avatar src={user.avatar_url} alt={user.full_name} size="sm" />
                    <div className="text-left">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{user.full_name}</p>
                      <p className="text-xs text-gray-500">@{user.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drag & Drop Zone / Previews */}
        {(previews.length > 0 || dragOver) && (
          <div
            className={`mt-4 border-2 border-dashed rounded-xl p-4 transition-all ${
              dragOver
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {previews.length > 0 ? (
              <div className={`grid gap-2 ${
                previews.length === 1 ? 'grid-cols-1' :
                previews.length === 2 ? 'grid-cols-2' :
                'grid-cols-2'
              }`}>
                {previews.map((preview, index) => (
                  <div key={index} className="relative group rounded-xl overflow-hidden">
                    {files[index]?.type.startsWith('video/') ? (
                      <video src={preview} className="w-full h-40 object-cover" />
                    ) : (
                      <img src={preview} alt="" className="w-full h-40 object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    {files[index]?.type.startsWith('video/') && (
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded-full">
                        Video
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500">Dosyaları buraya sürükle bırak</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-1">
            <label className="cursor-pointer p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 group-hover:text-emerald-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium hidden sm:inline">Fotoğraf</span>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            <label className="cursor-pointer p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 group-hover:text-emerald-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium hidden sm:inline">Video</span>
              </div>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            <button
              type="button"
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
              onClick={() => {
                const textarea = textareaRef.current;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const newContent = content.slice(0, start) + '@' + content.slice(start);
                  setContent(newContent);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + 1, start + 1);
                  }, 0);
                }
              }}
            >
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 group-hover:text-emerald-600">
                <span className="text-lg font-bold">@</span>
                <span className="text-sm font-medium hidden sm:inline">Etiketle</span>
              </div>
            </button>
          </div>

          <Button
            type="submit"
            loading={loading}
            disabled={loading || (!content.trim() && files.length === 0)}
          >
            {loading ? 'Paylaşılıyor...' : 'Paylaş'}
          </Button>
        </div>
      </form>
    </div>
  );
}
