'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from './ui/Avatar';
import { Button, IconButton } from './ui/Button';
import { ConfirmModal } from './ui/Modal';
import { sendLikeNotification, sendCommentNotification } from '@/lib/send-push-notification';
import type { Post, Profile, Comment } from '@/types';

interface CommentWithReplies extends Comment {
  replies?: CommentWithReplies[];
  profiles?: Profile;
}

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onDelete?: (postId: string) => void;
}

// Recursive Comment Component
function CommentItem({
  comment,
  onReply,
  renderContent,
  timeAgo,
  depth = 0,
}: {
  comment: CommentWithReplies;
  onReply: (commentId: string, username: string) => void;
  renderContent: (content: string) => React.ReactNode;
  timeAgo: (date: string) => string;
  depth?: number;
}) {
  const [showReplies, setShowReplies] = useState(depth < 2);
  const maxDepth = 4;
  const isNested = depth > 0;

  return (
    <div className={`animate-fadeIn ${isNested ? 'ml-8 mt-3' : ''}`}>
      <div className="flex space-x-3">
        <Link href={`/profil/${comment.profiles?.username}`}>
          <Avatar
            src={comment.profiles?.avatar_url}
            alt={comment.profiles?.full_name || ''}
            size={isNested ? 'xs' : 'sm'}
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className={`${isNested ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-gray-100 dark:bg-gray-700'} rounded-2xl px-4 py-2.5`}>
            <Link
              href={`/profil/${comment.profiles?.username}`}
              className={`font-semibold hover:text-emerald-600 ${isNested ? 'text-xs' : 'text-sm'}`}
            >
              {comment.profiles?.full_name}
              {comment.profiles?.nickname && (
                <span className="text-emerald-600 dark:text-emerald-400 font-normal ml-1">
                  &quot;{comment.profiles.nickname}&quot;
                </span>
              )}
            </Link>
            <p className={`text-gray-700 dark:text-gray-300 ${isNested ? 'text-xs' : 'text-sm'}`}>
              {renderContent(comment.content)}
            </p>
          </div>
          <div className="flex items-center gap-4 mt-1 ml-2 text-xs text-gray-500">
            <span>{timeAgo(comment.created_at)}</span>
            {depth < maxDepth && (
              <button
                onClick={() => onReply(comment.id, comment.profiles?.username || '')}
                className="font-semibold hover:text-emerald-600"
              >
                Yanıtla
              </button>
            )}
            {comment.replies && comment.replies.length > 0 && !showReplies && (
              <button
                onClick={() => setShowReplies(true)}
                className="font-semibold hover:text-emerald-600"
              >
                {comment.replies.length} yanıt göster
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nested Replies */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              renderContent={renderContent}
              timeAgo={timeAgo}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostCard({ post, currentUserId, onDelete }: PostCardProps) {
  const [liked, setLiked] = useState(
    post.likes?.some((like) => like.user_id === currentUserId) || false
  );
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [likeAnimation, setLikeAnimation] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [mentionResults, setMentionResults] = useState<Profile[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Build comment tree structure
  const buildCommentTree = (flatComments: Comment[]): CommentWithReplies[] => {
    const commentMap = new Map<string, CommentWithReplies>();
    const rootComments: CommentWithReplies[] = [];

    // First pass: create all comment objects
    flatComments.forEach((c) => {
      commentMap.set(c.id, { ...c, replies: [] });
    });

    // Second pass: build tree structure
    flatComments.forEach((c) => {
      const comment = commentMap.get(c.id)!;
      if (c.parent_id && commentMap.has(c.parent_id)) {
        const parent = commentMap.get(c.parent_id)!;
        parent.replies = parent.replies || [];
        parent.replies.push(comment);
      } else {
        rootComments.push(comment);
      }
    });

    return rootComments;
  };

  // Count all comments including nested
  const countAllComments = (comments: CommentWithReplies[]): number => {
    let count = 0;
    const countRecursive = (list: CommentWithReplies[]) => {
      list.forEach((c) => {
        count++;
        if (c.replies) countRecursive(c.replies);
      });
    };
    countRecursive(comments);
    return count;
  };

  // Organize comments with replies
  useEffect(() => {
    if (post.comments) {
      const tree = buildCommentTree(post.comments);
      setComments(tree);
    }
  }, [post.comments]);

  const handleLike = async () => {
    if (!currentUserId) return;

    setLikeAnimation(true);
    setTimeout(() => setLikeAnimation(false), 600);

    if (liked) {
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', currentUserId);
      setLikeCount((prev) => prev - 1);
    } else {
      await supabase
        .from('likes')
        .insert({ post_id: post.id, user_id: currentUserId });
      setLikeCount((prev) => prev + 1);

      // Send notification to post owner (if not liking own post)
      if (post.user_id !== currentUserId) {
        // Get current user's name for notification
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', currentUserId)
          .single();

        if (currentProfile) {
          // Create database notification (for realtime + badge)
          await supabase.from('notifications').insert({
            user_id: post.user_id,
            type: 'like',
            data: {
              user_id: currentUserId,
              user_name: currentProfile.full_name,
              user_username: currentProfile.username,
              post_id: post.id,
            },
          });

          // Send push notification (for browser notification)
          sendLikeNotification(post.user_id, currentProfile.full_name, post.id);
        }
      }
    }
    setLiked(!liked);
  };

  // Add new comment to tree
  const addCommentToTree = (
    tree: CommentWithReplies[],
    newComment: CommentWithReplies,
    parentId: string | null
  ): CommentWithReplies[] => {
    if (!parentId) {
      return [...tree, newComment];
    }

    return tree.map((c) => {
      if (c.id === parentId) {
        return { ...c, replies: [...(c.replies || []), newComment] };
      }
      if (c.replies && c.replies.length > 0) {
        return { ...c, replies: addCommentToTree(c.replies, newComment, parentId) };
      }
      return c;
    });
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !currentUserId) return;

    const commentData: Record<string, string | null> = {
      post_id: post.id,
      user_id: currentUserId,
      content: comment,
      parent_id: replyingTo?.id || null,
    };

    const { data, error } = await supabase
      .from('comments')
      .insert(commentData)
      .select('*, profiles(*)')
      .single();

    if (!error && data) {
      // Get current user's name for notifications
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', currentUserId)
        .single();

      // Send notification to post owner (if not commenting on own post)
      if (post.user_id !== currentUserId && currentProfile) {
        // Create database notification (for realtime + badge)
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          type: 'comment',
          data: {
            user_id: currentUserId,
            user_name: currentProfile.full_name,
            user_username: currentProfile.username,
            post_id: post.id,
            comment_preview: comment.substring(0, 50),
          },
        });

        // Send push notification (for browser notification)
        sendCommentNotification(post.user_id, currentProfile.full_name, post.id, comment);
      }

      // Extract mentions and create notifications
      const mentions = comment.match(/@(\w+)/g);
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
              comment_id: data.id,
              mentioned_user_id: mentionedUser.id,
              mentioned_by: currentUserId,
            });
          }
        }
      }

      const newComment: CommentWithReplies = { ...data, replies: [] };
      setComments(addCommentToTree(comments, newComment, replyingTo?.id || null));
      setComment('');
      setReplyingTo(null);
    }
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyingTo({ id: commentId, username });
    setComment(`@${username} `);
    commentInputRef.current?.focus();
  };

  const handleDelete = async () => {
    setDeleting(true);
    await supabase.from('posts').delete().eq('id', post.id);
    setShowDeleteModal(false);
    setDeleting(false);
    onDelete?.(post.id);
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

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setComment(value);

    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = value.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        handleMentionSearch(textAfterAt);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (username: string) => {
    const lastAtIndex = comment.lastIndexOf('@');
    const newComment = comment.slice(0, lastAtIndex) + `@${username} `;
    setComment(newComment);
    setShowMentions(false);
    commentInputRef.current?.focus();
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Az önce';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}dk`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}sa`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}g`;
    if (days < 30) return `${Math.floor(days / 7)}hf`;
    return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        return (
          <Link
            key={index}
            href={`/profil/${username}`}
            className="mention"
          >
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  const totalComments = countAllComments(comments);

  return (
    <>
      <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <Link href={`/profil/${post.profiles?.username}`} className="flex items-center space-x-3 group">
            <Avatar
              src={post.profiles?.avatar_url}
              alt={post.profiles?.full_name || ''}
              size="md"
            />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                {post.profiles?.full_name}
                {post.profiles?.nickname && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-normal ml-1">
                    &quot;{post.profiles.nickname}&quot;
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-500">
                @{post.profiles?.username} · {timeAgo(post.created_at)}
              </p>
            </div>
          </Link>

          {currentUserId === post.user_id && (
            <div className="relative">
              <IconButton
                icon={
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                }
                onClick={() => setShowMoreMenu(!showMoreMenu)}
              />
              {showMoreMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg py-2 z-10 animate-scaleIn">
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowDeleteModal(true);
                    }}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Gönderiyi Sil
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
            {renderContent(post.content)}
          </p>
        </div>

        {/* Media */}
        {post.post_media && post.post_media.length > 0 && (
          <div className={`grid gap-0.5 ${
            post.post_media.length === 1 ? '' :
            post.post_media.length === 2 ? 'grid-cols-2' :
            post.post_media.length === 3 ? 'grid-cols-2' :
            'grid-cols-2'
          }`}>
            {post.post_media.map((media, index) => (
              <div
                key={media.id}
                className={`relative ${
                  post.post_media!.length === 3 && index === 0 ? 'row-span-2' : ''
                }`}
              >
                {media.file_type === 'image' ? (
                  <img
                    src={media.file_url}
                    alt=""
                    className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    style={{ maxHeight: post.post_media!.length === 1 ? '500px' : '300px' }}
                  />
                ) : (
                  <video
                    src={media.file_url}
                    controls
                    className="w-full max-h-96"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-1">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-200 ${
                liked
                  ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className={likeAnimation ? 'animate-heartBeat' : ''}>
                {liked ? '❤️' : '🤍'}
              </span>
              <span className="font-medium">{likeCount}</span>
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors ${
                showComments
                  ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span>💬</span>
              <span className="font-medium">{totalComments}</span>
            </button>
          </div>

          <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="border-t border-gray-100 dark:border-gray-700 animate-slideDown">
            {/* Comment Form */}
            <form onSubmit={handleComment} className="p-4 relative">
              {replyingTo && (
                <div className="flex items-center gap-2 mb-2 text-sm">
                  <span className="text-gray-500">
                    <span className="text-emerald-600 font-medium">@{replyingTo.username}</span> kullanıcısına yanıt veriliyor
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setComment('');
                    }}
                    className="text-red-500 hover:text-red-600 p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <Avatar
                  src={null}
                  alt="Sen"
                  size="sm"
                />
                <div className="flex-1 relative">
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={comment}
                    onChange={handleCommentChange}
                    placeholder="Yorum yaz... (@kullanıcı ile etiketle)"
                    className="w-full px-4 py-2.5 rounded-full bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  {/* Mention Suggestions */}
                  {showMentions && mentionResults.length > 0 && (
                    <div className="absolute bottom-full left-0 w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg mb-2 py-2 z-20 animate-slideUp">
                      {mentionResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => insertMention(user.username)}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Avatar src={user.avatar_url} alt={user.full_name} size="sm" />
                          <div className="text-left">
                            <p className="font-medium text-sm">{user.full_name}</p>
                            <p className="text-xs text-gray-500">@{user.username}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button type="submit" size="sm" disabled={!comment.trim()}>
                  Gönder
                </Button>
              </div>
            </form>

            {/* Comments List */}
            <div className="px-4 pb-4 space-y-4 max-h-[500px] overflow-y-auto">
              {comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  onReply={handleReply}
                  renderContent={renderContent}
                  timeAgo={timeAgo}
                />
              ))}

              {comments.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  İlk yorumu sen yap!
                </p>
              )}
            </div>
          </div>
        )}
      </article>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Gönderiyi Sil"
        message="Bu gönderiyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Sil"
        loading={deleting}
      />
    </>
  );
}
