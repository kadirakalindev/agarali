-- Agara Köyü Sosyal Ağ - Veritabanı Şeması

-- Profiller tablosu (auth.users ile bağlantılı)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lakaplar tablosu
CREATE TABLE nicknames (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nickname TEXT NOT NULL,
  given_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gönderiler tablosu
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gönderi medyaları
CREATE TABLE post_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Yorumlar tablosu
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Beğeniler tablosu
CREATE TABLE likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Takipler tablosu
CREATE TABLE follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Hikayeler tablosu
CREATE TABLE stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hikaye görüntülemeleri
CREATE TABLE story_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);

-- Etkinlikler tablosu
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Etkinlik katılımcıları
CREATE TABLE event_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'going' CHECK (status IN ('going', 'interested', 'not_going')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Bildirimler tablosu
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Politikaları
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nicknames ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles politikaları
CREATE POLICY "Herkes profilleri görebilir" ON profiles FOR SELECT USING (true);
CREATE POLICY "Kullanıcılar kendi profillerini düzenleyebilir" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Yeni profil oluşturulabilir" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Posts politikaları
CREATE POLICY "Herkes gönderileri görebilir" ON posts FOR SELECT USING (true);
CREATE POLICY "Giriş yapanlar gönderi paylaşabilir" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Kullanıcılar kendi gönderilerini düzenleyebilir" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Kullanıcılar kendi gönderilerini silebilir" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Post media politikaları
CREATE POLICY "Herkes medyaları görebilir" ON post_media FOR SELECT USING (true);
CREATE POLICY "Gönderi sahibi medya ekleyebilir" ON post_media FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid())
);
CREATE POLICY "Gönderi sahibi medya silebilir" ON post_media FOR DELETE USING (
  EXISTS (SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid())
);

-- Comments politikaları
CREATE POLICY "Herkes yorumları görebilir" ON comments FOR SELECT USING (true);
CREATE POLICY "Giriş yapanlar yorum yapabilir" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Kullanıcılar kendi yorumlarını silebilir" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Likes politikaları
CREATE POLICY "Herkes beğenileri görebilir" ON likes FOR SELECT USING (true);
CREATE POLICY "Giriş yapanlar beğenebilir" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Kullanıcılar kendi beğenilerini kaldırabilir" ON likes FOR DELETE USING (auth.uid() = user_id);

-- Follows politikaları
CREATE POLICY "Herkes takipleri görebilir" ON follows FOR SELECT USING (true);
CREATE POLICY "Giriş yapanlar takip edebilir" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Kullanıcılar takipten çıkabilir" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- Stories politikaları
CREATE POLICY "Herkes hikayeleri görebilir" ON stories FOR SELECT USING (true);
CREATE POLICY "Giriş yapanlar hikaye paylaşabilir" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Kullanıcılar kendi hikayelerini silebilir" ON stories FOR DELETE USING (auth.uid() = user_id);

-- Story views politikaları
CREATE POLICY "Hikaye sahibi görüntülemeleri görebilir" ON story_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid()) OR auth.uid() = user_id
);
CREATE POLICY "Giriş yapanlar görüntüleme ekleyebilir" ON story_views FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Events politikaları
CREATE POLICY "Herkes etkinlikleri görebilir" ON events FOR SELECT USING (true);
CREATE POLICY "Giriş yapanlar etkinlik oluşturabilir" ON events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Etkinlik sahibi düzenleyebilir" ON events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Etkinlik sahibi silebilir" ON events FOR DELETE USING (auth.uid() = user_id);

-- Event participants politikaları
CREATE POLICY "Herkes katılımcıları görebilir" ON event_participants FOR SELECT USING (true);
CREATE POLICY "Giriş yapanlar katılabilir" ON event_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Kullanıcılar kendi katılımlarını güncelleyebilir" ON event_participants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Kullanıcılar katılımdan çıkabilir" ON event_participants FOR DELETE USING (auth.uid() = user_id);

-- Notifications politikaları
CREATE POLICY "Kullanıcılar kendi bildirimlerini görebilir" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Sistem bildirim oluşturabilir" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Kullanıcılar kendi bildirimlerini güncelleyebilir" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Nicknames politikaları
CREATE POLICY "Herkes lakapları görebilir" ON nicknames FOR SELECT USING (true);
CREATE POLICY "Giriş yapanlar lakap ekleyebilir" ON nicknames FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Yeni kullanıcı kaydında otomatik profil oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Storage bucket oluştur (Supabase Dashboard'dan da yapılabilir)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('events', 'events', true);
