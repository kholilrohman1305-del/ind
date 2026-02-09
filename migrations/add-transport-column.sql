-- Migration: Add transport_edukator column to gaji_transaksi
-- Date: 2026-01-30
-- Description: Adds a separate column to track transport allowance for edukators
--              This allows showing transport details separately in the salary breakdown

-- Add transport_edukator column to gaji_transaksi
ALTER TABLE gaji_transaksi
ADD COLUMN transport_edukator INT NOT NULL DEFAULT 0 AFTER nominal;

-- Note: For existing records, transport_edukator will be 0 since the data wasn't tracked before.
-- Going forward, new presensi entries will have the transport recorded separately.

-- Verification query (run after migration to verify)
-- SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_NAME = 'gaji_transaksi' AND COLUMN_NAME = 'transport_edukator';
