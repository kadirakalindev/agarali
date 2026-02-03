-- Kullanıcıya Admin Rolü Verme
-- Bu scripti Supabase SQL Editor'da çalıştırın

-- 1. Kullanıcı adına göre admin yapma
UPDATE profiles
SET role = 'admin'
WHERE username = 'KULLANICI_ADI_BURAYA';

-- VEYA

-- 2. Email adresine göre admin yapma
-- Önce kullanıcının ID'sini bulun
-- SELECT id FROM auth.users WHERE email = 'email@example.com';
-- Sonra profili güncelleyin
-- UPDATE profiles SET role = 'admin' WHERE id = 'KULLANICI_ID_BURAYA';

-- VEYA

-- 3. Tüm kullanıcıları listele ve rollerini gör
-- SELECT id, username, full_name, role FROM profiles;

-- Roller: 'user', 'moderator', 'admin'

-- NOT: Admin paneline erişebilmek için kullanıcının role değeri 'admin' veya 'moderator' olmalıdır.
