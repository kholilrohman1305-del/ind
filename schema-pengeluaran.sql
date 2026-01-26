-- Pengeluaran cabang
CREATE TABLE IF NOT EXISTS `pengeluaran` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `cabang_id` INT DEFAULT NULL,
  `kategori` VARCHAR(80) NOT NULL,
  `deskripsi` VARCHAR(255) DEFAULT NULL,
  `nominal` INT NOT NULL DEFAULT 0,
  `tanggal` DATE NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pengeluaran_cabang` (`cabang_id`),
  KEY `idx_pengeluaran_tanggal` (`tanggal`)
);
