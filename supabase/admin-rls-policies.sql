-- Admin ve Moderatör için RLS Politikaları
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın

-- Önce admin/moderator kontrolü için bir fonksiyon oluştur
CREATE OR REPLACE FUNCTION is_admin_or_moderator()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sadece admin kontrolü
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- POSTS - Admin/Moderatör silme yetkisi
-- =============================================
DROP POLICY IF EXISTS "Admin ve moderator gönderi silebilir" ON posts;
CREATE POLICY "Admin ve moderator gönderi silebilir" ON posts
  FOR DELETE USING (
    auth.uid() = user_id OR is_admin_or_moderator()
  );

-- Mevcut politikayı güncelle (sadece kendi gönderisini silme)
DROP POLICY IF EXISTS "Kullanıcılar kendi gönderilerini silebilir" ON posts;

-- =============================================
-- COMMENTS - Admin/Moderatör silme yetkisi
-- =============================================
DROP POLICY IF EXISTS "Admin ve moderator yorum silebilir" ON comments;
CREATE POLICY "Admin ve moderator yorum silebilir" ON comments
  FOR DELETE USING (
    auth.uid() = user_id OR is_admin_or_moderator()
  );

DROP POLICY IF EXISTS "Kullanıcılar kendi yorumlarını silebilir" ON comments;

-- =============================================
-- STORIES - Admin/Moderatör silme yetkisi
-- =============================================
DROP POLICY IF EXISTS "Admin ve moderator hikaye silebilir" ON stories;
CREATE POLICY "Admin ve moderator hikaye silebilir" ON stories
  FOR DELETE USING (
    auth.uid() = user_id OR is_admin_or_moderator()
  );

DROP POLICY IF EXISTS "Kullanıcılar kendi hikayelerini silebilir" ON stories;

-- =============================================
-- POST_MEDIA - Admin/Moderatör silme yetkisi
-- =============================================
DROP POLICY IF EXISTS "Admin ve moderator medya silebilir" ON post_media;
CREATE POLICY "Admin ve moderator medya silebilir" ON post_media
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid())
    OR is_admin_or_moderator()
  );

DROP POLICY IF EXISTS "Gönderi sahibi medya silebilir" ON post_media;

-- =============================================
-- LIKES - Admin silme yetkisi (moderatör beğeni silemez)
-- =============================================
DROP POLICY IF EXISTS "Admin beğeni silebilir" ON likes;
CREATE POLICY "Admin beğeni silebilir" ON likes
  FOR DELETE USING (
    auth.uid() = user_id OR is_admin()
  );

DROP POLICY IF EXISTS "Kullanıcılar kendi beğenilerini kaldırabilir" ON likes;

-- =============================================
-- STORY_VIEWS - Admin silme yetkisi
-- =============================================
DROP POLICY IF EXISTS "Admin hikaye görüntüleme silebilir" ON story_views;
CREATE POLICY "Admin hikaye görüntüleme silebilir" ON story_views
  FOR DELETE USING (is_admin());

-- =============================================
-- EVENTS - Admin/Moderatör silme yetkisi
-- =============================================
DROP POLICY IF EXISTS "Admin ve moderator etkinlik silebilir" ON events;
CREATE POLICY "Admin ve moderator etkinlik silebilir" ON events
  FOR DELETE USING (
    auth.uid() = user_id OR is_admin_or_moderator()
  );

DROP POLICY IF EXISTS "Etkinlik sahibi silebilir" ON events;

-- =============================================
-- PROFILES - Admin kullanıcı düzenleme yetkisi
-- =============================================
DROP POLICY IF EXISTS "Admin profil düzenleyebilir" ON profiles;
CREATE POLICY "Admin profil düzenleyebilir" ON profiles
  FOR UPDATE USING (
    auth.uid() = id OR is_admin()
  );

DROP POLICY IF EXISTS "Kullanıcılar kendi profillerini düzenleyebilir" ON profiles;

-- =============================================
-- NICKNAMES - Admin silme yetkisi
-- =============================================
DROP POLICY IF EXISTS "Admin lakap silebilir" ON nicknames;
CREATE POLICY "Admin lakap silebilir" ON nicknames
  FOR DELETE USING (is_admin());

-- =============================================
-- NOTIFICATIONS - Admin tüm bildirimleri görebilir
-- =============================================
DROP POLICY IF EXISTS "Admin tüm bildirimleri görebilir" ON notifications;
CREATE POLICY "Admin tüm bildirimleri görebilir" ON notifications
  FOR SELECT USING (
    auth.uid() = user_id OR is_admin()
  );

DROP POLICY IF EXISTS "Kullanıcılar kendi bildirimlerini görebilir" ON notifications;

-- =============================================
-- Yetki Özeti:
-- =============================================
-- ADMIN:
--   - Tüm gönderileri silebilir
--   - Tüm yorumları silebilir
--   - Tüm hikayeleri silebilir
--   - Tüm medyaları silebilir
--   - Tüm beğenileri silebilir
--   - Tüm etkinlikleri silebilir
--   - Tüm profilleri düzenleyebilir
--   - Tüm lakapları silebilir
--   - Tüm bildirimleri görebilir
--
-- MODERATÖR:
--   - Tüm gönderileri silebilir
--   - Tüm yorumları silebilir
--   - Tüm hikayeleri silebilir
--   - Tüm medyaları silebilir
--   - Tüm etkinlikleri silebilir
--   - Beğeni silemez (sadece kendi beğenisini)
--   - Profil düzenleyemez (sadece kendi profilini)
--   - Lakap silemez
-- =============================================
