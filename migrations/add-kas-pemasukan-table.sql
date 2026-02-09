-- Migration: Tambah tabel kas_pemasukan untuk pemasukan lain-lain (termasuk transport ILHAMI)
-- Digunakan untuk mencatat pemasukan selain pembayaran siswa

CREATE TABLE IF NOT EXISTS `kas_pemasukan` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `cabang_id` INT DEFAULT NULL,
  `kategori` VARCHAR(80) NOT NULL,
  `deskripsi` VARCHAR(255) DEFAULT NULL,
  `nominal` INT NOT NULL DEFAULT 0,
  `tanggal` DATE NOT NULL,
  `presensi_id` INT DEFAULT NULL,
  `jadwal_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kas_pemasukan_cabang` (`cabang_id`),
  KEY `idx_kas_pemasukan_tanggal` (`tanggal`),
  KEY `idx_kas_pemasukan_presensi` (`presensi_id`),
  KEY `idx_kas_pemasukan_jadwal` (`jadwal_id`)
);

-- Keterangan:
-- kategori: 'Transport ILHAMI', 'Lain-lain', dll.
-- presensi_id & jadwal_id: Untuk tracking asal pemasukan dari presensi
