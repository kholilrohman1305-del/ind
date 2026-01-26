-- Kelas gabungan (fixed pattern) schema update
-- Jalankan manual di database `sistem_bimbel`

ALTER TABLE `kelas`
  MODIFY `program_id` int NULL,
  MODIFY `edukator_id` int NULL,
  MODIFY `hari` enum('senin','selasa','rabu','kamis','jumat','sabtu','minggu') NULL,
  MODIFY `jam_mulai` time NULL,
  MODIFY `jam_selesai` time NULL;

CREATE TABLE IF NOT EXISTS `kelas_program` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kelas_id` int NOT NULL,
  `program_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `kelas_program_unique_idx` (`kelas_id`, `program_id`),
  KEY `kelas_program_kelas_idx` (`kelas_id`),
  KEY `kelas_program_program_idx` (`program_id`),
  CONSTRAINT `kelas_program_kelas_id_fk` FOREIGN KEY (`kelas_id`) REFERENCES `kelas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kelas_program_program_id_fk` FOREIGN KEY (`program_id`) REFERENCES `program` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `jadwal_kelas_siswa` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jadwal_id` int NOT NULL,
  `enrollment_id` int NOT NULL,
  `pertemuan_ke` int NOT NULL,
  `status` enum('belum','selesai') NOT NULL DEFAULT 'belum',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `jadwal_kelas_siswa_unique_idx` (`jadwal_id`, `enrollment_id`),
  KEY `jadwal_kelas_siswa_jadwal_idx` (`jadwal_id`),
  KEY `jadwal_kelas_siswa_enrollment_idx` (`enrollment_id`),
  CONSTRAINT `jadwal_kelas_siswa_jadwal_id_fk` FOREIGN KEY (`jadwal_id`) REFERENCES `jadwal` (`id`) ON DELETE CASCADE,
  CONSTRAINT `jadwal_kelas_siswa_enrollment_id_fk` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollment` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
