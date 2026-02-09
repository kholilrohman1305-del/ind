-- Migration: Add Edukator Features
-- Date: 2026-01-26
-- Description: Add tables for Catatan Siswa, Pengajuan Jadwal features

USE sistem_bimbel;

-- ========================================
-- 1. Tabel: catatan_siswa
-- ========================================
CREATE TABLE IF NOT EXISTS catatan_siswa (
  id INT NOT NULL AUTO_INCREMENT,
  edukator_id INT NOT NULL,
  siswa_id INT NOT NULL,
  enrollment_id INT DEFAULT NULL,
  jadwal_id INT DEFAULT NULL,
  tanggal DATE NOT NULL,
  catatan TEXT NOT NULL,
  kategori ENUM('akademik', 'sikap', 'kehadiran', 'umum') DEFAULT 'umum',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY catatan_edukator_idx (edukator_id),
  KEY catatan_siswa_idx (siswa_id),
  KEY catatan_enrollment_idx (enrollment_id),
  KEY catatan_jadwal_idx (jadwal_id),
  KEY catatan_tanggal_idx (tanggal),
  CONSTRAINT catatan_edukator_fk FOREIGN KEY (edukator_id) REFERENCES edukator (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT catatan_siswa_fk FOREIGN KEY (siswa_id) REFERENCES siswa (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT catatan_enrollment_fk FOREIGN KEY (enrollment_id) REFERENCES enrollment (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT catatan_jadwal_fk FOREIGN KEY (jadwal_id) REFERENCES jadwal (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ========================================
-- 2. Tabel: pengajuan_jadwal
-- ========================================
CREATE TABLE IF NOT EXISTS pengajuan_jadwal (
  id INT NOT NULL AUTO_INCREMENT,
  jadwal_id INT NOT NULL,
  edukator_id INT NOT NULL,
  tipe ENUM('reschedule', 'izin') NOT NULL,
  alasan TEXT NOT NULL,
  tanggal_usulan DATE DEFAULT NULL,
  jam_mulai_usulan TIME DEFAULT NULL,
  jam_selesai_usulan TIME DEFAULT NULL,
  status ENUM('menunggu', 'disetujui', 'ditolak') NOT NULL DEFAULT 'menunggu',
  catatan_admin TEXT DEFAULT NULL,
  approved_by INT DEFAULT NULL,
  approved_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY pengajuan_jadwal_idx (jadwal_id),
  KEY pengajuan_edukator_idx (edukator_id),
  KEY pengajuan_status_idx (status),
  KEY pengajuan_approved_by_idx (approved_by),
  CONSTRAINT pengajuan_jadwal_fk FOREIGN KEY (jadwal_id) REFERENCES jadwal (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT pengajuan_edukator_fk FOREIGN KEY (edukator_id) REFERENCES edukator (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT pengajuan_approved_by_fk FOREIGN KEY (approved_by) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ========================================
-- Verification Queries
-- ========================================
-- Run these to verify tables were created successfully:
-- SHOW TABLES LIKE 'catatan_siswa';
-- SHOW TABLES LIKE 'pengajuan_jadwal';
-- SHOW CREATE TABLE catatan_siswa;
-- SHOW CREATE TABLE pengajuan_jadwal;
