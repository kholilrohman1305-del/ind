-- Migration: Add lifecycle status values
-- Date: 2026-01-30
-- Description:
--   1. Add 'menunggu_jadwal' to enrollment status_enrollment enum
--   2. Add 'overdue' to tagihan status_tagihan enum

-- 1. Modify enrollment status_enrollment to include 'menunggu_jadwal'
-- New flow: menunggu_jadwal -> aktif -> selesai
ALTER TABLE enrollment
MODIFY COLUMN status_enrollment ENUM('menunggu_jadwal', 'aktif', 'selesai') NOT NULL DEFAULT 'aktif';

-- 2. Modify tagihan status_tagihan to include 'overdue'
-- New statuses: belum_bayar -> cicilan/lunas OR overdue (if past due date)
ALTER TABLE tagihan
MODIFY COLUMN status_tagihan ENUM('belum_bayar', 'cicilan', 'lunas', 'overdue') NOT NULL DEFAULT 'belum_bayar';

-- Verification queries (run after migration to verify)
-- SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_NAME = 'enrollment' AND COLUMN_NAME = 'status_enrollment';
-- SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_NAME = 'tagihan' AND COLUMN_NAME = 'status_tagihan';
