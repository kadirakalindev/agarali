import { createClient } from '@/lib/supabase/client';

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

/**
 * Send push notification to a specific user
 * Call this from client-side when an action happens (like, comment, follow, etc.)
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, payload }),
    });

    if (!response.ok) {
      console.error('Failed to send push notification');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Push notification error:', error);
    return false;
  }
}

/**
 * Send push notification when someone likes a post
 */
export async function sendLikeNotification(
  postOwnerId: string,
  likerName: string,
  postId: string
): Promise<void> {
  await sendPushNotification(postOwnerId, {
    title: 'Yeni Beğeni',
    body: `${likerName} gönderinizi beğendi`,
    url: `/gonderi/${postId}`,
    tag: `like-${postId}`,
  });
}

/**
 * Send push notification when someone comments on a post
 */
export async function sendCommentNotification(
  postOwnerId: string,
  commenterName: string,
  postId: string,
  commentPreview: string
): Promise<void> {
  await sendPushNotification(postOwnerId, {
    title: 'Yeni Yorum',
    body: `${commenterName}: ${commentPreview.substring(0, 50)}${commentPreview.length > 50 ? '...' : ''}`,
    url: `/gonderi/${postId}`,
    tag: `comment-${postId}`,
  });
}

/**
 * Send push notification when someone follows a user
 */
export async function sendFollowNotification(
  followedUserId: string,
  followerName: string,
  followerUsername: string
): Promise<void> {
  await sendPushNotification(followedUserId, {
    title: 'Yeni Takipçi',
    body: `${followerName} sizi takip etmeye başladı`,
    url: `/profil/${followerUsername}`,
    tag: `follow-${followerUsername}`,
  });
}

/**
 * Send push notification when someone mentions a user
 */
export async function sendMentionNotification(
  mentionedUserId: string,
  mentionerName: string,
  postId: string
): Promise<void> {
  await sendPushNotification(mentionedUserId, {
    title: 'Sizden Bahsedildi',
    body: `${mentionerName} bir gönderide sizden bahsetti`,
    url: `/gonderi/${postId}`,
    tag: `mention-${postId}`,
  });
}
