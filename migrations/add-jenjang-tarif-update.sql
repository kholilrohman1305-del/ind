-- Migration: Add jenjang to siswa & update tarif settings
-- Run this before deploying the updated code

-- 1. Add jenjang column to siswa table
ALTER TABLE siswa
ADD COLUMN jenjang ENUM('PAUD_TK', 'SD', 'SMP', 'SMA', 'ALUMNI') DEFAULT NULL AFTER kelas;

-- 2. Add tipe_les column to gaji_setting table
ALTER TABLE gaji_setting
ADD COLUMN tipe_les ENUM('privat', 'kelas') NOT NULL DEFAULT 'privat' AFTER jenjang;

-- 3. Drop old unique constraint and add new one with tipe_les
-- First, check if the constraint exists and drop it
ALTER TABLE gaji_setting DROP INDEX IF EXISTS cabang_id;
ALTER TABLE gaji_setting DROP INDEX IF EXISTS uk_cabang_jenjang;

-- Add new unique constraint including tipe_les
ALTER TABLE gaji_setting
ADD UNIQUE KEY uk_cabang_jenjang_tipe (cabang_id, jenjang, tipe_les);

-- 4. Duplicate existing settings for 'kelas' type (copy privat rates to kelas initially)
INSERT INTO gaji_setting (cabang_id, jenjang, tipe_les, nominal, updated_at)
SELECT cabang_id, jenjang, 'kelas', nominal, NOW()
FROM gaji_setting
WHERE tipe_les = 'privat'
ON DUPLICATE KEY UPDATE nominal = VALUES(nominal);

-- 5. Update existing siswa jenjang based on their kelas field (optional - run manually if needed)
-- This attempts to guess jenjang from kelas text
UPDATE siswa SET jenjang = 'PAUD_TK' WHERE kelas LIKE '%TK%' OR kelas LIKE '%PAUD%' OR kelas LIKE '%KB%';
UPDATE siswa SET jenjang = 'SD' WHERE (kelas REGEXP '^[1-6]' OR kelas LIKE '%SD%') AND jenjang IS NULL;
UPDATE siswa SET jenjang = 'SMP' WHERE (kelas REGEXP '^[7-9]' OR kelas LIKE '%SMP%' OR kelas LIKE '%MTS%') AND jenjang IS NULL;
UPDATE siswa SET jenjang = 'SMA' WHERE (kelas REGEXP '^1[0-2]' OR kelas LIKE '%SMA%' OR kelas LIKE '%SMK%' OR kelas LIKE '%MA%') AND jenjang IS NULL;
UPDATE siswa SET jenjang = 'ALUMNI' WHERE (kelas LIKE '%ALUMNI%' OR kelas LIKE '%KULIAH%' OR kelas LIKE '%UMUM%') AND jenjang IS NULL;
