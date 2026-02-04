-- =====================================================
-- AGARA KÖYÜ - VERİTABANI GÜNCELLEMELERİ
-- Bu scripti Supabase SQL Editor'da çalıştırın
-- =====================================================

-- 1. Kullanıcı Onay Sistemi
-- profiles tablosuna is_approved kolonu ekle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Mevcut kullanıcıları otomatik onayla (isteğe bağlı)
-- UPDATE profiles SET is_approved = true WHERE is_approved IS NULL;

-- 2. Nested Comments (İç içe yorumlar)
-- comments tablosuna parent_id kolonu ekle (eğer yoksa)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;

-- 3. Site Ayarları Tablosu
CREATE TABLE IF NOT EXISTS site_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- Varsayılan site ayarları
INSERT INTO site_settings (key, value) VALUES
    ('site_name', 'Agara Köyü'),
    ('site_description', 'Agara Köyü Sosyal Ağı'),
    ('site_logo', NULL),
    ('site_favicon', NULL),
    ('primary_color', '#10b981'),
    ('welcome_message', 'Agara Köyü sosyal ağına hoş geldiniz!')
ON CONFLICT (key) DO NOTHING;

-- Site ayarları için RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir
CREATE POLICY "Site ayarları herkese açık" ON site_settings
    FOR SELECT USING (true);

-- Sadece admin güncelleyebilir
CREATE POLICY "Sadece admin site ayarlarını güncelleyebilir" ON site_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Sadece admin ekleyebilir
CREATE POLICY "Sadece admin site ayarı ekleyebilir" ON site_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 4. Kullanıcı onay bildirimleri için index
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON profiles(is_approved);

-- 5. İlk admin kullanıcısını onayla (kendi username'inizi yazın)
-- UPDATE profiles SET is_approved = true, role = 'admin' WHERE username = 'ADMIN_USERNAME';

-- =====================================================
-- 6. Lakap (Nickname) Sistemi
-- =====================================================

CREATE TABLE IF NOT EXISTS nicknames (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    nickname TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Her kullanıcının sadece bir aktif lakabı olabilir
CREATE UNIQUE INDEX IF NOT EXISTS idx_nicknames_user_approved
ON nicknames(user_id) WHERE status = 'approved';

-- Lakap RLS politikaları
ALTER TABLE nicknames ENABLE ROW LEVEL SECURITY;

-- Herkes onaylı lakapları görebilir
CREATE POLICY "Onaylı lakaplar herkese açık" ON nicknames
    FOR SELECT USING (status = 'approved' OR user_id = auth.uid());

-- Kullanıcı kendi lakabını ekleyebilir
CREATE POLICY "Kullanıcı lakap ekleyebilir" ON nicknames
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Kullanıcı kendi bekleyen lakabını silebilir
CREATE POLICY "Kullanıcı bekleyen lakabını silebilir" ON nicknames
    FOR DELETE USING (user_id = auth.uid() AND status = 'pending');

-- Admin/moderator lakapları güncelleyebilir
CREATE POLICY "Admin lakap onaylayabilir" ON nicknames
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'moderator')
        )
    );

-- profiles tablosuna nickname kolonu ekle (onaylı lakap için)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname TEXT;

-- =====================================================
-- 7. Push Notifications Sistemi
-- =====================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT,
    auth TEXT,
    platform TEXT DEFAULT 'web' CHECK (platform IN ('web', 'android', 'ios')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Push subscriptions RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Kullanıcı kendi subscription'larını görebilir
CREATE POLICY "Kullanıcı kendi push subscription görebilir" ON push_subscriptions
    FOR SELECT USING (user_id = auth.uid());

-- Kullanıcı kendi subscription'ını ekleyebilir
CREATE POLICY "Kullanıcı push subscription ekleyebilir" ON push_subscriptions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Kullanıcı kendi subscription'ını silebilir
CREATE POLICY "Kullanıcı push subscription silebilir" ON push_subscriptions
    FOR DELETE USING (user_id = auth.uid());

-- Admin tüm subscription'ları görebilir (bildirim göndermek için)
CREATE POLICY "Admin tüm push subscriptions görebilir" ON push_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'moderator')
        )
    );

-- =====================================================
-- 8. Duyuru (Announcement) Sistemi
-- =====================================================

CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
    is_pinned BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Duyuru RLS politikaları
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Herkes aktif duyuruları görebilir, admin tümünü görebilir
CREATE POLICY "Aktif duyurular herkese açık" ON announcements
    FOR SELECT USING (
        (is_active = true AND (expires_at IS NULL OR expires_at > NOW()))
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'moderator')
        )
    );

-- Admin duyuru oluşturabilir
CREATE POLICY "Admin duyuru oluşturabilir" ON announcements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'moderator')
        )
    );

-- Admin duyuru güncelleyebilir
CREATE POLICY "Admin duyuru güncelleyebilir" ON announcements
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'moderator')
        )
    );

-- Admin duyuru silebilir
CREATE POLICY "Admin duyuru silebilir" ON announcements
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'moderator')
        )
    );

-- =====================================================
-- 9. Anket (Poll) Sistemi
-- =====================================================

-- Ana anket tablosu
CREATE TABLE IF NOT EXISTS polls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    description TEXT,
    poll_type TEXT DEFAULT 'single' CHECK (poll_type IN ('single', 'multiple')),
    is_active BOOLEAN DEFAULT true,
    ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Anket seçenekleri tablosu
CREATE TABLE IF NOT EXISTS poll_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
    option_text TEXT NOT NULL,
    option_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Anket oyları tablosu
CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
    poll_option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tek seçimli anketlerde her kullanıcı sadece bir oy kullanabilir
CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_votes_single_choice
ON poll_votes(poll_id, user_id)
WHERE EXISTS (SELECT 1 FROM polls WHERE polls.id = poll_id AND polls.poll_type = 'single');

-- Çok seçimli anketlerde aynı seçeneğe tekrar oy verilemez
CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_votes_option_user
ON poll_votes(poll_option_id, user_id);

-- Anket RLS politikaları
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Herkes aktif anketleri görebilir, admin tümünü görebilir
CREATE POLICY "Aktif anketler herkese açık" ON polls
    FOR SELECT USING (
        (is_active = true AND (ends_at IS NULL OR ends_at > NOW()))
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'moderator')
        )
    );

-- Admin anket oluşturabilir
CREATE POLICY "Admin anket oluşturabilir" ON polls
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'moderator')
        )
    );

-- Admin anket güncelleyebilir
CREATE POLICY "Admin anket güncelleyebilir" ON polls
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'moderator')
        )
    );

-- Admin anket silebilir
CREATE POLICY "Admin anket silebilir" ON polls
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'moderator')
        )
    );

-- Anket seçenekleri politikaları
CREATE POLICY "Herkes seçenekleri görebilir" ON poll_options
    FOR SELECT USING (true);

CREATE POLICY "Admin seçenek ekleyebilir" ON poll_options
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "Admin seçenek silebilir" ON poll_options
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'moderator')
        )
    );

-- Anket oyları politikaları
CREATE POLICY "Herkes oyları görebilir" ON poll_votes
    FOR SELECT USING (true);

CREATE POLICY "Giriş yapan kullanıcılar oy kullanabilir" ON poll_votes
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Kullanıcı kendi oyunu silebilir" ON poll_votes
    FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- NOTLAR:
-- - Yeni kayıt olan kullanıcılar is_approved = false olarak başlar
-- - Admin panelinden onaylanana kadar siteye giremezler
-- - Mevcut kullanıcıları onaylamak için:
--   UPDATE profiles SET is_approved = true;
-- - Lakap sistemi: Kullanıcı lakap girer -> Admin onaylar -> Profilde gösterilir
-- - Duyuru sistemi: Sadece admin oluşturabilir, öncelik ve sabitleme özellikleri var
-- - Anket sistemi: Tek seçimli ve çok seçimli, kim oy verdi görülebilir
-- =====================================================
