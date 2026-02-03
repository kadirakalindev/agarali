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
-- NOTLAR:
-- - Yeni kayıt olan kullanıcılar is_approved = false olarak başlar
-- - Admin panelinden onaylanana kadar siteye giremezler
-- - Mevcut kullanıcıları onaylamak için:
--   UPDATE profiles SET is_approved = true;
-- - Lakap sistemi: Kullanıcı lakap girer -> Admin onaylar -> Profilde gösterilir
-- =====================================================
