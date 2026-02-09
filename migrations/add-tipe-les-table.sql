-- Migration: Tambah tabel tipe_les untuk tipe les dinamis
-- Tipe les bisa ditambahkan oleh admin (privat, kelas, semi-privat, dll)

CREATE TABLE IF NOT EXISTS tipe_les (
  id INT NOT NULL AUTO_INCREMENT,
  cabang_id INT DEFAULT NULL,
  kode VARCHAR(50) NOT NULL,
  nama VARCHAR(100) NOT NULL,
  deskripsi VARCHAR(255) DEFAULT NULL,
  urutan INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY tipe_les_kode_cabang_idx (kode, cabang_id),
  KEY tipe_les_cabang_idx (cabang_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insert default tipe les
INSERT INTO tipe_les (cabang_id, kode, nama, deskripsi, urutan) VALUES
(NULL, 'privat', 'Privat', 'Les privat 1 siswa', 1),
(NULL, 'kelas', 'Kelas', 'Les kelas/reguler', 2);

-- Ubah kolom tipe_les di tabel program dari ENUM menjadi VARCHAR
ALTER TABLE program MODIFY COLUMN tipe_les VARCHAR(50) NOT NULL DEFAULT 'privat';

-- Ubah kolom tipe_les di tabel jadwal dari ENUM menjadi VARCHAR (jika ada)
ALTER TABLE jadwal MODIFY COLUMN tipe_les VARCHAR(50) DEFAULT 'privat';

-- Ubah kolom tipe_les di tabel gaji_setting dari ENUM menjadi VARCHAR
ALTER TABLE gaji_setting MODIFY COLUMN tipe_les VARCHAR(50) NOT NULL DEFAULT 'privat';

-- Keterangan:
-- kode: identifier unik (privat, kelas, semi_privat, dll)
-- nama: label tampilan (Privat, Kelas, Semi-Privat, dll)
-- urutan: untuk sorting di dropdown
