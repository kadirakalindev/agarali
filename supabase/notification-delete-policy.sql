-- Kullanıcıların kendi bildirimlerini silmesi için RLS politikası
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın

-- Mevcut politikayı kaldır (varsa)
DROP POLICY IF EXISTS "Kullanıcılar kendi bildirimlerini silebilir" ON notifications;

-- Yeni politika ekle
CREATE POLICY "Kullanıcılar kendi bildirimlerini silebilir" ON notifications
  FOR DELETE USING (auth.uid() = user_id);
