-- Manajemen jabatan + tambahan gaji
CREATE TABLE IF NOT EXISTS `manajemen` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `cabang_id` INT DEFAULT NULL,
  `nama` VARCHAR(80) NOT NULL,
  `gaji_tambahan` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_manajemen` (`cabang_id`, `nama`)
);

ALTER TABLE `edukator`
  ADD COLUMN `manajemen_id` INT NULL;

CREATE INDEX `idx_edukator_manajemen` ON `edukator` (`manajemen_id`);
