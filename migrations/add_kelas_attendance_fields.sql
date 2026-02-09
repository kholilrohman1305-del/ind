-- Migration: Add fields for class attendance tracking
-- Date: 2026-02-01

-- 1. Add tarif_tidak_hadir to program table (rate when student doesn't attend)
ALTER TABLE program
ADD COLUMN tarif_tidak_hadir INT NOT NULL DEFAULT 0
COMMENT 'Tarif edukator ketika siswa tidak hadir (khusus kelas)'
AFTER harga;

-- 2. Modify jadwal_kelas_siswa status enum to include attendance status
ALTER TABLE jadwal_kelas_siswa
MODIFY COLUMN status ENUM('belum', 'hadir', 'tidak_hadir', 'izin', 'selesai') NOT NULL DEFAULT 'belum';

-- 3. Add siswa_id column to jadwal_kelas_siswa for easier querying
-- (enrollment already has siswa_id, but this makes it faster)
ALTER TABLE jadwal_kelas_siswa
ADD COLUMN siswa_id INT DEFAULT NULL AFTER enrollment_id,
ADD INDEX jadwal_kelas_siswa_siswa_idx (siswa_id),
ADD CONSTRAINT jadwal_kelas_siswa_siswa_fk FOREIGN KEY (siswa_id) REFERENCES siswa (id)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Update existing jadwal_kelas_siswa records with siswa_id
UPDATE jadwal_kelas_siswa jks
JOIN enrollment e ON e.id = jks.enrollment_id
SET jks.siswa_id = e.siswa_id;

-- 5. Convert existing 'selesai' status to 'hadir' for clearer semantics
UPDATE jadwal_kelas_siswa SET status = 'hadir' WHERE status = 'selesai';
