'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import PostCard from '@/components/PostCard';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { Post, Profile } from '@/types';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const [post, setPost] = useState<Post | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchPost() {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUser(profile);
      }

      // Get post with all relations
      const { data: postData, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(*),
          post_media(*),
          likes(*),
          comments(*, profiles(*))
        `)
        .eq('id', postId)
        .single();

      if (error || !postData) {
        setNotFound(true);
      } else {
        setPost(postData);
      }

      setLoading(false);
    }

    fetchPost();
  }, [postId, supabase]);

  const handlePostDeleted = () => {
    router.push('/feed');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 animate-fadeIn">
        <Spinner size="lg" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center animate-fadeIn">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Gönderi bulunamadı</h2>
        <p className="text-gray-500 mb-6">Bu gönderi silinmiş veya hiç var olmamış olabilir.</p>
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={() => router.back()}>
            Geri Dön
          </Button>
          <Link href="/feed">
            <Button>Ana Sayfaya Git</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Back Navigation */}
      <div className="mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Geri</span>
        </button>
      </div>

      {/* Post */}
      <PostCard
        post={post}
        currentUserId={currentUser?.id}
        onDelete={handlePostDeleted}
      />

      {/* Related Info */}
      <div className="mt-4 bg-white dark:bg-gray-800 rounded-2xl p-4">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {new Date(post.created_at).toLocaleDateString('tr-TR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <Link
            href={`/profil/${post.profiles?.username}`}
            className="text-emerald-600 hover:underline"
          >
            {post.profiles?.full_name} profilini gör
          </Link>
        </div>
      </div>
    </div>
  );
}
