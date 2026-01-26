-- Penggajian schema: gaji setting per jenjang + transaksi gaji per presensi
CREATE TABLE IF NOT EXISTS `gaji_setting` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `cabang_id` INT DEFAULT NULL,
  `jenjang` ENUM('PAUD_TK', 'SD', 'SMP', 'SMA', 'ALUMNI') NOT NULL,
  `nominal` INT NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_gaji_setting` (`cabang_id`, `jenjang`)
);

CREATE TABLE IF NOT EXISTS `gaji_transaksi` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `presensi_id` INT NOT NULL,
  `jadwal_id` INT NOT NULL,
  `edukator_id` INT NOT NULL,
  `cabang_id` INT DEFAULT NULL,
  `jenjang` ENUM('PAUD_TK', 'SD', 'SMP', 'SMA', 'ALUMNI') NOT NULL,
  `nominal` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_gaji_transaksi_presensi` (`presensi_id`),
  KEY `idx_gaji_transaksi_edukator` (`edukator_id`),
  KEY `idx_gaji_transaksi_cabang` (`cabang_id`)
);
