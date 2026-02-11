-- Performance optimization indexes
-- Run this SQL in your database to speed up queries

-- Enrollment indexes
ALTER TABLE enrollment ADD INDEX idx_siswa_status (siswa_id, status_enrollment);
ALTER TABLE enrollment ADD INDEX idx_program_id (program_id);

-- Jadwal indexes
ALTER TABLE jadwal ADD INDEX idx_enrollment_status (enrollment_id, status_jadwal);
ALTER TABLE jadwal ADD INDEX idx_edukator_tanggal (edukator_id, tanggal);
ALTER TABLE jadwal ADD INDEX idx_tanggal_status (tanggal, status_jadwal);

-- Presensi indexes
ALTER TABLE presensi ADD INDEX idx_jadwal_id (jadwal_id);
ALTER TABLE presensi ADD INDEX idx_edukator_waktu (edukator_id, waktu_absen);

-- Tagihan indexes
ALTER TABLE tagihan ADD INDEX idx_enrollment_status (enrollment_id, status_tagihan);

-- Junction table indexes
ALTER TABLE siswa_mapel ADD INDEX idx_siswa_id (siswa_id);
ALTER TABLE edukator_mapel ADD INDEX idx_edukator_id (edukator_id);

-- Gaji indexes
ALTER TABLE gaji_transaksi ADD INDEX idx_edukator_created (edukator_id, created_at);

-- User indexes (if not exists)
ALTER TABLE users ADD INDEX idx_email (email);
