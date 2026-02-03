export interface Profile {
  id: string;
  username: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  role: 'user' | 'moderator' | 'admin';
  is_approved: boolean;
  nickname: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteSettings {
  id: string;
  key: string;
  value: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  post_media?: PostMedia[];
  likes?: Like[];
  comments?: Comment[];
  _count?: {
    likes: number;
    comments: number;
  };
}

export interface PostMedia {
  id: string;
  post_id: string;
  file_url: string;
  file_type: 'image' | 'video';
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  profiles?: Profile;
  replies?: Comment[];
}

export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Story {
  id: string;
  user_id: string;
  file_url: string;
  file_type: 'image' | 'video';
  expires_at: string;
  created_at: string;
  profiles?: Profile;
  story_views?: StoryView[];
}

export interface StoryView {
  id: string;
  story_id: string;
  user_id: string;
  viewed_at: string;
}

export interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  event_participants?: EventParticipant[];
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  status: 'going' | 'interested' | 'not_going';
  created_at: string;
  profiles?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Nickname {
  id: string;
  user_id: string;
  nickname: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles?: Profile;
}
