-- Migration: Add Siswa Pendaftaran Fields
-- Description: Add columns for student registration preferences and create siswa_mapel junction table
-- Date: 2026-02-02

USE sistem_bimbel;

-- 1. Add new columns to siswa table using stored procedure for safe column addition

DELIMITER //

DROP PROCEDURE IF EXISTS add_column_if_not_exists//

CREATE PROCEDURE add_column_if_not_exists()
BEGIN
    -- Add status_pendaftaran column
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'sistem_bimbel'
        AND TABLE_NAME = 'siswa'
        AND COLUMN_NAME = 'status_pendaftaran'
    ) THEN
        ALTER TABLE siswa ADD COLUMN status_pendaftaran ENUM('pending','aktif') NOT NULL DEFAULT 'aktif' AFTER is_active;
    END IF;

    -- Add program_id column (program selected from landing page)
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'sistem_bimbel'
        AND TABLE_NAME = 'siswa'
        AND COLUMN_NAME = 'program_id'
    ) THEN
        ALTER TABLE siswa ADD COLUMN program_id INT DEFAULT NULL AFTER status_pendaftaran;
    END IF;

    -- Add tanggal_mulai_belajar column
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'sistem_bimbel'
        AND TABLE_NAME = 'siswa'
        AND COLUMN_NAME = 'tanggal_mulai_belajar'
    ) THEN
        ALTER TABLE siswa ADD COLUMN tanggal_mulai_belajar DATE DEFAULT NULL AFTER status_pendaftaran;
    END IF;

    -- Add preferred_days column (JSON for array of days)
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'sistem_bimbel'
        AND TABLE_NAME = 'siswa'
        AND COLUMN_NAME = 'preferred_days'
    ) THEN
        ALTER TABLE siswa ADD COLUMN preferred_days JSON DEFAULT NULL AFTER tanggal_mulai_belajar;
    END IF;

    -- Add preferred_jam_mulai column
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'sistem_bimbel'
        AND TABLE_NAME = 'siswa'
        AND COLUMN_NAME = 'preferred_jam_mulai'
    ) THEN
        ALTER TABLE siswa ADD COLUMN preferred_jam_mulai TIME DEFAULT NULL AFTER preferred_days;
    END IF;

    -- Add preferred_jam_selesai column
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'sistem_bimbel'
        AND TABLE_NAME = 'siswa'
        AND COLUMN_NAME = 'preferred_jam_selesai'
    ) THEN
        ALTER TABLE siswa ADD COLUMN preferred_jam_selesai TIME DEFAULT NULL AFTER preferred_jam_mulai;
    END IF;
END//

DELIMITER ;

-- Execute the procedure
CALL add_column_if_not_exists();

-- Drop the procedure after use
DROP PROCEDURE IF EXISTS add_column_if_not_exists;

-- 2. Create siswa_mapel junction table for multiple mapel selection
CREATE TABLE IF NOT EXISTS siswa_mapel (
  id INT NOT NULL AUTO_INCREMENT,
  siswa_id INT NOT NULL,
  mapel_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY siswa_mapel_unique (siswa_id, mapel_id),
  KEY siswa_mapel_siswa_idx (siswa_id),
  KEY siswa_mapel_mapel_idx (mapel_id),
  CONSTRAINT siswa_mapel_siswa_fk FOREIGN KEY (siswa_id) REFERENCES siswa (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT siswa_mapel_mapel_fk FOREIGN KEY (mapel_id) REFERENCES mapel (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Update existing siswa records to have 'aktif' status (for backward compatibility)
UPDATE siswa SET status_pendaftaran = 'aktif' WHERE status_pendaftaran IS NULL OR status_pendaftaran = '';

-- Verification queries (run manually to verify migration success)
-- SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'siswa' AND TABLE_SCHEMA = 'sistem_bimbel';
-- SHOW TABLES LIKE 'siswa_mapel';
-- DESCRIBE siswa_mapel;
