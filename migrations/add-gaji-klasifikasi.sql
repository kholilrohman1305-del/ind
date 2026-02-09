-- Migration: Add gaji_klasifikasi table for edukator classification-based salary tiers
-- Classifications: Mahasiswa, Sarjana (S1), Magister (S2)
-- Manajemen bonus comes from manajemen.gaji_tambahan (already implemented)

CREATE TABLE IF NOT EXISTS gaji_klasifikasi (
  id INT NOT NULL AUTO_INCREMENT,
  cabang_id INT DEFAULT NULL,
  klasifikasi ENUM('Mahasiswa','Sarjana','Magister') NOT NULL,
  nominal INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cabang_klasifikasi (cabang_id, klasifikasi),
  KEY gaji_klasifikasi_cabang_idx (cabang_id),
  CONSTRAINT gaji_klasifikasi_cabang_fk FOREIGN KEY (cabang_id) REFERENCES cabang (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Update edukator pendidikan_terakhir ENUM to use clearer values
-- Note: The existing values are 'Mahasiswa','S1','S2'
-- We need to map S1 -> Sarjana, S2 -> Magister for display/calculation

-- Insert default values (0) for each klasifikasi so they appear in settings
-- Run this after table creation:
-- INSERT IGNORE INTO gaji_klasifikasi (cabang_id, klasifikasi, nominal) VALUES
-- (NULL, 'Mahasiswa', 0),
-- (NULL, 'Sarjana', 0),
-- (NULL, 'Magister', 0);
