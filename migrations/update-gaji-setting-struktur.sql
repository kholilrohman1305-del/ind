-- Migration: Update struktur gaji_setting
-- Tarif ditentukan oleh kombinasi: tipe_les + jenjang + klasifikasi_edukator
-- Klasifikasi: Mahasiswa, Sarjana, Sarjana_Manajemen

-- 1. Drop tabel gaji_klasifikasi (tidak diperlukan lagi)
DROP TABLE IF EXISTS gaji_klasifikasi;

-- 2. Drop tabel gaji_setting lama
DROP TABLE IF EXISTS gaji_setting;

-- 3. Buat ulang gaji_setting dengan struktur baru
CREATE TABLE IF NOT EXISTS gaji_setting (
  id INT NOT NULL AUTO_INCREMENT,
  cabang_id INT DEFAULT NULL,
  tipe_les ENUM('privat','kelas') NOT NULL,
  jenjang ENUM('PAUD_TK','SD','SMP','SMA','ALUMNI') NOT NULL,
  klasifikasi_edukator ENUM('Mahasiswa','Sarjana','Sarjana_Manajemen') NOT NULL,
  nominal INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cabang_tipe_jenjang_klasifikasi (cabang_id, tipe_les, jenjang, klasifikasi_edukator),
  KEY gaji_setting_cabang_idx (cabang_id),
  CONSTRAINT gaji_setting_cabang_fk FOREIGN KEY (cabang_id) REFERENCES cabang (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Insert default values (0) untuk semua kombinasi
-- PRIVAT
INSERT INTO gaji_setting (cabang_id, tipe_les, jenjang, klasifikasi_edukator, nominal) VALUES
(NULL, 'privat', 'PAUD_TK', 'Mahasiswa', 0),
(NULL, 'privat', 'PAUD_TK', 'Sarjana', 0),
(NULL, 'privat', 'PAUD_TK', 'Sarjana_Manajemen', 0),
(NULL, 'privat', 'SD', 'Mahasiswa', 0),
(NULL, 'privat', 'SD', 'Sarjana', 0),
(NULL, 'privat', 'SD', 'Sarjana_Manajemen', 0),
(NULL, 'privat', 'SMP', 'Mahasiswa', 0),
(NULL, 'privat', 'SMP', 'Sarjana', 0),
(NULL, 'privat', 'SMP', 'Sarjana_Manajemen', 0),
(NULL, 'privat', 'SMA', 'Mahasiswa', 0),
(NULL, 'privat', 'SMA', 'Sarjana', 0),
(NULL, 'privat', 'SMA', 'Sarjana_Manajemen', 0),
(NULL, 'privat', 'ALUMNI', 'Mahasiswa', 0),
(NULL, 'privat', 'ALUMNI', 'Sarjana', 0),
(NULL, 'privat', 'ALUMNI', 'Sarjana_Manajemen', 0),
-- KELAS
(NULL, 'kelas', 'PAUD_TK', 'Mahasiswa', 0),
(NULL, 'kelas', 'PAUD_TK', 'Sarjana', 0),
(NULL, 'kelas', 'PAUD_TK', 'Sarjana_Manajemen', 0),
(NULL, 'kelas', 'SD', 'Mahasiswa', 0),
(NULL, 'kelas', 'SD', 'Sarjana', 0),
(NULL, 'kelas', 'SD', 'Sarjana_Manajemen', 0),
(NULL, 'kelas', 'SMP', 'Mahasiswa', 0),
(NULL, 'kelas', 'SMP', 'Sarjana', 0),
(NULL, 'kelas', 'SMP', 'Sarjana_Manajemen', 0),
(NULL, 'kelas', 'SMA', 'Mahasiswa', 0),
(NULL, 'kelas', 'SMA', 'Sarjana', 0),
(NULL, 'kelas', 'SMA', 'Sarjana_Manajemen', 0),
(NULL, 'kelas', 'ALUMNI', 'Mahasiswa', 0),
(NULL, 'kelas', 'ALUMNI', 'Sarjana', 0),
(NULL, 'kelas', 'ALUMNI', 'Sarjana_Manajemen', 0);
