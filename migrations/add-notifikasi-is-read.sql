-- Add is_read column to notifikasi table if not exists
ALTER TABLE notifikasi
ADD COLUMN IF NOT EXISTS is_read TINYINT(1) DEFAULT 0 AFTER wa_status;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_read ON notifikasi(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_tipe ON notifikasi(tipe_notifikasi);
