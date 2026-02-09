-- Migration: Tambah jenjang ke program dan tabel program_mapel untuk multi-mapel

-- Tambah kolom jenjang ke tabel program
ALTER TABLE program
  ADD COLUMN jenjang ENUM('PAUD_TK', 'SD', 'SMP', 'SMA', 'ALUMNI') DEFAULT NULL AFTER cabang_id;

-- Tabel junction untuk relasi many-to-many program dengan mapel
CREATE TABLE IF NOT EXISTS program_mapel (
  id INT NOT NULL AUTO_INCREMENT,
  program_id INT NOT NULL,
  mapel_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY program_mapel_unique_idx (program_id, mapel_id),
  KEY program_mapel_program_idx (program_id),
  KEY program_mapel_mapel_idx (mapel_id),
  CONSTRAINT program_mapel_program_fk FOREIGN KEY (program_id) REFERENCES program (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT program_mapel_mapel_fk FOREIGN KEY (mapel_id) REFERENCES mapel (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Migrasi data existing: pindahkan mapel_id ke program_mapel
INSERT INTO program_mapel (program_id, mapel_id)
SELECT id, mapel_id FROM program WHERE mapel_id IS NOT NULL;

-- Keterangan:
-- jenjang: PAUD_TK, SD, SMP, SMA, ALUMNI
-- program_mapel: Junction table untuk many-to-many relationship
-- Kolom mapel_id lama tetap ada untuk backward compatibility, bisa di-drop setelah migrasi sukses
