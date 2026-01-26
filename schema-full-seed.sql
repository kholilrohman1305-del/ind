-- Full schema + seed for ILHAMI (MySQL)
CREATE DATABASE IF NOT EXISTS sistem_bimbel;
USE sistem_bimbel;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS notifikasi;
DROP TABLE IF EXISTS promo;
DROP TABLE IF EXISTS saldo_awal;
DROP TABLE IF EXISTS pengeluaran;
DROP TABLE IF EXISTS gaji_transaksi;
DROP TABLE IF EXISTS gaji_setting;
DROP TABLE IF EXISTS pembayaran;
DROP TABLE IF EXISTS tagihan;
DROP TABLE IF EXISTS presensi_siswa;
DROP TABLE IF EXISTS presensi;
DROP TABLE IF EXISTS jadwal_kelas_siswa;
DROP TABLE IF EXISTS jadwal;
DROP TABLE IF EXISTS enrollment;
DROP TABLE IF EXISTS kelas_program;
DROP TABLE IF EXISTS kelas;
DROP TABLE IF EXISTS siswa;
DROP TABLE IF EXISTS edukator_mapel;
DROP TABLE IF EXISTS edukator;
DROP TABLE IF EXISTS manajemen;
DROP TABLE IF EXISTS program;
DROP TABLE IF EXISTS mapel;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS cabang;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE IF NOT EXISTS cabang (
  id INT NOT NULL AUTO_INCREMENT,
  kode VARCHAR(20) NOT NULL,
  nama VARCHAR(120) NOT NULL,
  alamat VARCHAR(255) DEFAULT NULL,
  telepon VARCHAR(40) DEFAULT NULL,
  latitude DECIMAL(10,6) DEFAULT NULL,
  longitude DECIMAL(10,6) DEFAULT NULL,
  tanggal_jatuh_tempo INT NOT NULL DEFAULT 10,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY cabang_kode_unique (kode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  email VARCHAR(120) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('super_admin','admin_cabang','edukator','siswa') NOT NULL,
  cabang_id INT DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email),
  KEY users_cabang_idx (cabang_id),
  CONSTRAINT users_cabang_fk FOREIGN KEY (cabang_id) REFERENCES cabang (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS mapel (
  id INT NOT NULL AUTO_INCREMENT,
  nama VARCHAR(120) NOT NULL,
  deskripsi VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS manajemen (
  id INT NOT NULL AUTO_INCREMENT,
  cabang_id INT DEFAULT NULL,
  nama VARCHAR(80) NOT NULL,
  gaji_tambahan INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_manajemen (cabang_id, nama),
  KEY manajemen_cabang_idx (cabang_id),
  CONSTRAINT manajemen_cabang_fk FOREIGN KEY (cabang_id) REFERENCES cabang (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS edukator (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  nama VARCHAR(120) NOT NULL,
  nik VARCHAR(32) DEFAULT NULL,
  telepon VARCHAR(40) DEFAULT NULL,
  alamat VARCHAR(255) DEFAULT NULL,
  pendidikan_terakhir ENUM('Mahasiswa','S1','S2') DEFAULT NULL,
  foto VARCHAR(255) DEFAULT NULL,
  cabang_utama_id INT NOT NULL,
  manajemen_id INT DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY edukator_user_idx (user_id),
  KEY edukator_cabang_idx (cabang_utama_id),
  KEY edukator_manajemen_idx (manajemen_id),
  CONSTRAINT edukator_user_fk FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT edukator_cabang_fk FOREIGN KEY (cabang_utama_id) REFERENCES cabang (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT edukator_manajemen_fk FOREIGN KEY (manajemen_id) REFERENCES manajemen (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS edukator_mapel (
  id INT NOT NULL AUTO_INCREMENT,
  edukator_id INT NOT NULL,
  mapel_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY edukator_mapel_unique (edukator_id, mapel_id),
  KEY edukator_mapel_edukator_idx (edukator_id),
  KEY edukator_mapel_mapel_idx (mapel_id),
  CONSTRAINT edukator_mapel_edukator_fk FOREIGN KEY (edukator_id) REFERENCES edukator (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT edukator_mapel_mapel_fk FOREIGN KEY (mapel_id) REFERENCES mapel (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS program (
  id INT NOT NULL AUTO_INCREMENT,
  cabang_id INT NOT NULL,
  mapel_id INT DEFAULT NULL,
  nama VARCHAR(120) NOT NULL,
  tipe_les ENUM('privat','kelas') NOT NULL,
  jumlah_pertemuan INT DEFAULT NULL,
  harga INT NOT NULL DEFAULT 0,
  deskripsi VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY program_cabang_idx (cabang_id),
  KEY program_mapel_idx (mapel_id),
  CONSTRAINT program_cabang_fk FOREIGN KEY (cabang_id) REFERENCES cabang (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT program_mapel_fk FOREIGN KEY (mapel_id) REFERENCES mapel (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS kelas (
  id INT NOT NULL AUTO_INCREMENT,
  cabang_id INT NOT NULL,
  program_id INT DEFAULT NULL,
  edukator_id INT DEFAULT NULL,
  nama VARCHAR(120) NOT NULL,
  hari ENUM('senin','selasa','rabu','kamis','jumat','sabtu','minggu') DEFAULT NULL,
  jam_mulai TIME DEFAULT NULL,
  jam_selesai TIME DEFAULT NULL,
  kapasitas INT NOT NULL DEFAULT 20,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY kelas_cabang_idx (cabang_id),
  KEY kelas_program_idx (program_id),
  KEY kelas_edukator_idx (edukator_id),
  CONSTRAINT kelas_cabang_fk FOREIGN KEY (cabang_id) REFERENCES cabang (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT kelas_program_fk FOREIGN KEY (program_id) REFERENCES program (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT kelas_edukator_fk FOREIGN KEY (edukator_id) REFERENCES edukator (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS kelas_program (
  id INT NOT NULL AUTO_INCREMENT,
  kelas_id INT NOT NULL,
  program_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY kelas_program_unique_idx (kelas_id, program_id),
  KEY kelas_program_kelas_idx (kelas_id),
  KEY kelas_program_program_idx (program_id),
  CONSTRAINT kelas_program_kelas_fk FOREIGN KEY (kelas_id) REFERENCES kelas (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT kelas_program_program_fk FOREIGN KEY (program_id) REFERENCES program (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS siswa (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  cabang_id INT NOT NULL,
  nama VARCHAR(120) NOT NULL,
  nik VARCHAR(32) DEFAULT NULL,
  telepon VARCHAR(40) DEFAULT NULL,
  alamat VARCHAR(255) DEFAULT NULL,
  tanggal_lahir DATE DEFAULT NULL,
  sekolah_asal VARCHAR(120) DEFAULT NULL,
  kelas VARCHAR(40) DEFAULT NULL,
  foto VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY siswa_user_idx (user_id),
  KEY siswa_cabang_idx (cabang_id),
  CONSTRAINT siswa_user_fk FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT siswa_cabang_fk FOREIGN KEY (cabang_id) REFERENCES cabang (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS enrollment (
  id INT NOT NULL AUTO_INCREMENT,
  siswa_id INT NOT NULL,
  program_id INT NOT NULL,
  kelas_id INT DEFAULT NULL,
  tanggal_daftar DATE NOT NULL,
  total_pertemuan INT NOT NULL DEFAULT 0,
  sisa_pertemuan INT NOT NULL DEFAULT 0,
  status_enrollment ENUM('aktif','selesai') NOT NULL DEFAULT 'aktif',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY enrollment_siswa_idx (siswa_id),
  KEY enrollment_program_idx (program_id),
  KEY enrollment_kelas_idx (kelas_id),
  CONSTRAINT enrollment_siswa_fk FOREIGN KEY (siswa_id) REFERENCES siswa (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT enrollment_program_fk FOREIGN KEY (program_id) REFERENCES program (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT enrollment_kelas_fk FOREIGN KEY (kelas_id) REFERENCES kelas (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS jadwal (
  id INT NOT NULL AUTO_INCREMENT,
  cabang_id INT NOT NULL,
  enrollment_id INT DEFAULT NULL,
  program_id INT NOT NULL,
  edukator_id INT NOT NULL,
  mapel_id INT NOT NULL,
  tipe_les ENUM('privat','kelas') NOT NULL,
  tanggal DATE DEFAULT NULL,
  jam_mulai TIME DEFAULT NULL,
  jam_selesai TIME DEFAULT NULL,
  status_jadwal ENUM('scheduled','completed') NOT NULL DEFAULT 'scheduled',
  kelas_id INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY jadwal_cabang_idx (cabang_id),
  KEY jadwal_enrollment_idx (enrollment_id),
  KEY jadwal_program_idx (program_id),
  KEY jadwal_edukator_idx (edukator_id),
  KEY jadwal_mapel_idx (mapel_id),
  KEY jadwal_kelas_idx (kelas_id),
  CONSTRAINT jadwal_cabang_fk FOREIGN KEY (cabang_id) REFERENCES cabang (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT jadwal_enrollment_fk FOREIGN KEY (enrollment_id) REFERENCES enrollment (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT jadwal_program_fk FOREIGN KEY (program_id) REFERENCES program (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT jadwal_edukator_fk FOREIGN KEY (edukator_id) REFERENCES edukator (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT jadwal_mapel_fk FOREIGN KEY (mapel_id) REFERENCES mapel (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT jadwal_kelas_fk FOREIGN KEY (kelas_id) REFERENCES kelas (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS jadwal_kelas_siswa (
  id INT NOT NULL AUTO_INCREMENT,
  jadwal_id INT NOT NULL,
  enrollment_id INT NOT NULL,
  pertemuan_ke INT NOT NULL,
  status ENUM('belum','selesai') NOT NULL DEFAULT 'belum',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY jadwal_kelas_siswa_unique_idx (jadwal_id, enrollment_id),
  KEY jadwal_kelas_siswa_jadwal_idx (jadwal_id),
  KEY jadwal_kelas_siswa_enrollment_idx (enrollment_id),
  CONSTRAINT jadwal_kelas_siswa_jadwal_fk FOREIGN KEY (jadwal_id) REFERENCES jadwal (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT jadwal_kelas_siswa_enrollment_fk FOREIGN KEY (enrollment_id) REFERENCES enrollment (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS presensi (
  id INT NOT NULL AUTO_INCREMENT,
  jadwal_id INT NOT NULL,
  edukator_id INT NOT NULL,
  waktu_absen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  latitude DECIMAL(10,6) DEFAULT NULL,
  longitude DECIMAL(10,6) DEFAULT NULL,
  catatan VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY presensi_jadwal_unique (jadwal_id),
  KEY presensi_edukator_idx (edukator_id),
  CONSTRAINT presensi_jadwal_fk FOREIGN KEY (jadwal_id) REFERENCES jadwal (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT presensi_edukator_fk FOREIGN KEY (edukator_id) REFERENCES edukator (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS presensi_siswa (
  id INT NOT NULL AUTO_INCREMENT,
  presensi_id INT NOT NULL,
  siswa_id INT NOT NULL,
  enrollment_id INT NOT NULL,
  pertemuan_ke INT NOT NULL,
  status_presensi_siswa ENUM('hadir','izin','alpa') NOT NULL DEFAULT 'hadir',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY presensi_siswa_unique (presensi_id, siswa_id),
  KEY presensi_siswa_presensi_idx (presensi_id),
  KEY presensi_siswa_siswa_idx (siswa_id),
  KEY presensi_siswa_enrollment_idx (enrollment_id),
  CONSTRAINT presensi_siswa_presensi_fk FOREIGN KEY (presensi_id) REFERENCES presensi (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT presensi_siswa_siswa_fk FOREIGN KEY (siswa_id) REFERENCES siswa (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT presensi_siswa_enrollment_fk FOREIGN KEY (enrollment_id) REFERENCES enrollment (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS tagihan (
  id INT NOT NULL AUTO_INCREMENT,
  cabang_id INT NOT NULL,
  siswa_id INT NOT NULL,
  enrollment_id INT NOT NULL,
  jenis_tagihan ENUM('program','bulanan') NOT NULL,
  nominal INT NOT NULL DEFAULT 0,
  tanggal_jatuh_tempo DATE NOT NULL,
  status_tagihan ENUM('belum_bayar','cicilan','lunas') NOT NULL DEFAULT 'belum_bayar',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY tagihan_cabang_idx (cabang_id),
  KEY tagihan_siswa_idx (siswa_id),
  KEY tagihan_enrollment_idx (enrollment_id),
  CONSTRAINT tagihan_cabang_fk FOREIGN KEY (cabang_id) REFERENCES cabang (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT tagihan_siswa_fk FOREIGN KEY (siswa_id) REFERENCES siswa (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT tagihan_enrollment_fk FOREIGN KEY (enrollment_id) REFERENCES enrollment (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS pembayaran (
  id INT NOT NULL AUTO_INCREMENT,
  tagihan_id INT NOT NULL,
  cabang_id INT NOT NULL,
  nominal INT NOT NULL DEFAULT 0,
  metode_bayar ENUM('cash','transfer') NOT NULL,
  tanggal_bayar DATE NOT NULL,
  bukti_bayar VARCHAR(255) DEFAULT NULL,
  catatan VARCHAR(255) DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY pembayaran_tagihan_idx (tagihan_id),
  KEY pembayaran_cabang_idx (cabang_id),
  KEY pembayaran_created_by_idx (created_by),
  CONSTRAINT pembayaran_tagihan_fk FOREIGN KEY (tagihan_id) REFERENCES tagihan (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT pembayaran_cabang_fk FOREIGN KEY (cabang_id) REFERENCES cabang (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT pembayaran_created_by_fk FOREIGN KEY (created_by) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS gaji_setting (
  id INT NOT NULL AUTO_INCREMENT,
  cabang_id INT DEFAULT NULL,
  jenjang ENUM('PAUD_TK','SD','SMP','SMA','ALUMNI') NOT NULL,
  nominal INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_gaji_setting (cabang_id, jenjang),
  KEY gaji_setting_cabang_idx (cabang_id),
  CONSTRAINT gaji_setting_cabang_fk FOREIGN KEY (cabang_id) REFERENCES cabang (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS gaji_transaksi (
  id INT NOT NULL AUTO_INCREMENT,
  presensi_id INT NOT NULL,
  jadwal_id INT NOT NULL,
  edukator_id INT NOT NULL,
  cabang_id INT DEFAULT NULL,
  jenjang ENUM('PAUD_TK','SD','SMP','SMA','ALUMNI') NOT NULL,
  nominal INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_gaji_transaksi_presensi (presensi_id),
  KEY gaji_transaksi_jadwal_idx (jadwal_id),
  KEY gaji_transaksi_edukator_idx (edukator_id),
  KEY gaji_transaksi_cabang_idx (cabang_id),
  CONSTRAINT gaji_transaksi_presensi_fk FOREIGN KEY (presensi_id) REFERENCES presensi (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT gaji_transaksi_jadwal_fk FOREIGN KEY (jadwal_id) REFERENCES jadwal (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT gaji_transaksi_edukator_fk FOREIGN KEY (edukator_id) REFERENCES edukator (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT gaji_transaksi_cabang_fk FOREIGN KEY (cabang_id) REFERENCES cabang (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS pengeluaran (
  id INT NOT NULL AUTO_INCREMENT,
  cabang_id INT DEFAULT NULL,
  kategori VARCHAR(80) NOT NULL,
  deskripsi VARCHAR(255) DEFAULT NULL,
  nominal INT NOT NULL DEFAULT 0,
  tanggal DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY pengeluaran_cabang_idx (cabang_id),
  KEY pengeluaran_tanggal_idx (tanggal),
  CONSTRAINT pengeluaran_cabang_fk FOREIGN KEY (cabang_id) REFERENCES cabang (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS saldo_awal (
  id INT NOT NULL AUTO_INCREMENT,
  cabang_id INT NOT NULL,
  periode DATE NOT NULL,
  nominal INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY saldo_awal_unique (cabang_id, periode),
  KEY saldo_awal_cabang_idx (cabang_id),
  CONSTRAINT saldo_awal_cabang_fk FOREIGN KEY (cabang_id) REFERENCES cabang (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS promo (
  id INT NOT NULL AUTO_INCREMENT,
  cabang_id INT NOT NULL,
  program_id INT NOT NULL,
  nama VARCHAR(120) NOT NULL,
  tipe_diskon ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
  nilai INT NOT NULL DEFAULT 0,
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY promo_cabang_idx (cabang_id),
  KEY promo_program_idx (program_id),
  CONSTRAINT promo_cabang_fk FOREIGN KEY (cabang_id) REFERENCES cabang (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT promo_program_fk FOREIGN KEY (program_id) REFERENCES program (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS notifikasi (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  tipe_notifikasi VARCHAR(40) NOT NULL,
  judul VARCHAR(120) NOT NULL,
  pesan VARCHAR(255) NOT NULL,
  data_ref JSON DEFAULT NULL,
  wa_status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY notifikasi_user_idx (user_id),
  CONSTRAINT notifikasi_user_fk FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Seed data
SET @pwd = '$2a$10$HAe/9uALHsSiFOCGZhEoUu.eg8j5B6WN8ToBTwgaVvcarV7rs4qSm';

INSERT INTO cabang (id, kode, nama, alamat, telepon, latitude, longitude, tanggal_jatuh_tempo, is_active) VALUES
  (1, 'CBG01', 'Cabang Jakarta', 'Jl. Merdeka No. 1', '021-555001', -6.200000, 106.816666, 10, 1),
  (2, 'CBG02', 'Cabang Bandung', 'Jl. Asia Afrika No. 2', '022-555002', -6.914744, 107.609810, 10, 1),
  (3, 'CBG03', 'Cabang Surabaya', 'Jl. Pemuda No. 3', '031-555003', -7.257472, 112.752090, 10, 1),
  (4, 'CBG04', 'Cabang Medan', 'Jl. Sisingamangaraja No. 4', '061-555004', 3.595196, 98.672226, 10, 1),
  (5, 'CBG05', 'Cabang Semarang', 'Jl. Pandanaran No. 5', '024-555005', -6.966667, 110.416664, 10, 1),
  (6, 'CBG06', 'Cabang Yogyakarta', 'Jl. Malioboro No. 6', '0274-555006', -7.795580, 110.369490, 10, 1),
  (7, 'CBG07', 'Cabang Makassar', 'Jl. Pettarani No. 7', '0411-555007', -5.147665, 119.432732, 10, 1),
  (8, 'CBG08', 'Cabang Denpasar', 'Jl. Gatot Subroto No. 8', '0361-555008', -8.650000, 115.216667, 10, 1),
  (9, 'CBG09', 'Cabang Palembang', 'Jl. Jendral Sudirman No. 9', '0711-555009', -2.990934, 104.756554, 10, 1),
  (10, 'CBG10', 'Cabang Balikpapan', 'Jl. Sudirman No. 10', '0542-555010', -1.265386, 116.831200, 10, 1);

INSERT INTO users (id, email, password, role, cabang_id, is_active) VALUES
  (1, 'superadmin@ilhami.com', @pwd, 'super_admin', NULL, 1),
  (2, 'admin.cabang01@ilhami.com', @pwd, 'admin_cabang', 1, 1),
  (3, 'admin.cabang02@ilhami.com', @pwd, 'admin_cabang', 2, 1),
  (4, 'admin.cabang03@ilhami.com', @pwd, 'admin_cabang', 3, 1),
  (5, 'admin.cabang04@ilhami.com', @pwd, 'admin_cabang', 4, 1),
  (6, 'admin.cabang05@ilhami.com', @pwd, 'admin_cabang', 5, 1),
  (7, 'admin.cabang06@ilhami.com', @pwd, 'admin_cabang', 6, 1),
  (8, 'admin.cabang07@ilhami.com', @pwd, 'admin_cabang', 7, 1),
  (9, 'admin.cabang08@ilhami.com', @pwd, 'admin_cabang', 8, 1),
  (10, 'admin.cabang09@ilhami.com', @pwd, 'admin_cabang', 9, 1),
  (11, 'admin.cabang10@ilhami.com', @pwd, 'admin_cabang', 10, 1),
  (101, 'edukator01@ilhami.com', @pwd, 'edukator', 1, 1),
  (102, 'edukator02@ilhami.com', @pwd, 'edukator', 1, 1),
  (103, 'edukator03@ilhami.com', @pwd, 'edukator', 2, 1),
  (104, 'edukator04@ilhami.com', @pwd, 'edukator', 2, 1),
  (105, 'edukator05@ilhami.com', @pwd, 'edukator', 3, 1),
  (106, 'edukator06@ilhami.com', @pwd, 'edukator', 3, 1),
  (107, 'edukator07@ilhami.com', @pwd, 'edukator', 4, 1),
  (108, 'edukator08@ilhami.com', @pwd, 'edukator', 4, 1),
  (109, 'edukator09@ilhami.com', @pwd, 'edukator', 5, 1),
  (110, 'edukator10@ilhami.com', @pwd, 'edukator', 5, 1),
  (111, 'edukator11@ilhami.com', @pwd, 'edukator', 6, 1),
  (112, 'edukator12@ilhami.com', @pwd, 'edukator', 6, 1),
  (113, 'edukator13@ilhami.com', @pwd, 'edukator', 7, 1),
  (114, 'edukator14@ilhami.com', @pwd, 'edukator', 7, 1),
  (115, 'edukator15@ilhami.com', @pwd, 'edukator', 8, 1),
  (116, 'edukator16@ilhami.com', @pwd, 'edukator', 8, 1),
  (117, 'edukator17@ilhami.com', @pwd, 'edukator', 9, 1),
  (118, 'edukator18@ilhami.com', @pwd, 'edukator', 9, 1),
  (119, 'edukator19@ilhami.com', @pwd, 'edukator', 10, 1),
  (120, 'edukator20@ilhami.com', @pwd, 'edukator', 10, 1),
  (201, 'siswa01@ilhami.com', @pwd, 'siswa', 1, 1),
  (202, 'siswa02@ilhami.com', @pwd, 'siswa', 1, 1),
  (203, 'siswa03@ilhami.com', @pwd, 'siswa', 1, 1),
  (204, 'siswa04@ilhami.com', @pwd, 'siswa', 1, 1),
  (205, 'siswa05@ilhami.com', @pwd, 'siswa', 2, 1),
  (206, 'siswa06@ilhami.com', @pwd, 'siswa', 2, 1),
  (207, 'siswa07@ilhami.com', @pwd, 'siswa', 2, 1),
  (208, 'siswa08@ilhami.com', @pwd, 'siswa', 2, 1),
  (209, 'siswa09@ilhami.com', @pwd, 'siswa', 3, 1),
  (210, 'siswa10@ilhami.com', @pwd, 'siswa', 3, 1),
  (211, 'siswa11@ilhami.com', @pwd, 'siswa', 3, 1),
  (212, 'siswa12@ilhami.com', @pwd, 'siswa', 3, 1),
  (213, 'siswa13@ilhami.com', @pwd, 'siswa', 4, 1),
  (214, 'siswa14@ilhami.com', @pwd, 'siswa', 4, 1),
  (215, 'siswa15@ilhami.com', @pwd, 'siswa', 4, 1),
  (216, 'siswa16@ilhami.com', @pwd, 'siswa', 4, 1),
  (217, 'siswa17@ilhami.com', @pwd, 'siswa', 5, 1),
  (218, 'siswa18@ilhami.com', @pwd, 'siswa', 5, 1),
  (219, 'siswa19@ilhami.com', @pwd, 'siswa', 5, 1),
  (220, 'siswa20@ilhami.com', @pwd, 'siswa', 5, 1),
  (221, 'siswa21@ilhami.com', @pwd, 'siswa', 6, 1),
  (222, 'siswa22@ilhami.com', @pwd, 'siswa', 6, 1),
  (223, 'siswa23@ilhami.com', @pwd, 'siswa', 6, 1),
  (224, 'siswa24@ilhami.com', @pwd, 'siswa', 6, 1),
  (225, 'siswa25@ilhami.com', @pwd, 'siswa', 7, 1),
  (226, 'siswa26@ilhami.com', @pwd, 'siswa', 7, 1),
  (227, 'siswa27@ilhami.com', @pwd, 'siswa', 7, 1),
  (228, 'siswa28@ilhami.com', @pwd, 'siswa', 7, 1),
  (229, 'siswa29@ilhami.com', @pwd, 'siswa', 8, 1),
  (230, 'siswa30@ilhami.com', @pwd, 'siswa', 8, 1),
  (231, 'siswa31@ilhami.com', @pwd, 'siswa', 8, 1),
  (232, 'siswa32@ilhami.com', @pwd, 'siswa', 8, 1),
  (233, 'siswa33@ilhami.com', @pwd, 'siswa', 9, 1),
  (234, 'siswa34@ilhami.com', @pwd, 'siswa', 9, 1),
  (235, 'siswa35@ilhami.com', @pwd, 'siswa', 9, 1),
  (236, 'siswa36@ilhami.com', @pwd, 'siswa', 9, 1),
  (237, 'siswa37@ilhami.com', @pwd, 'siswa', 10, 1),
  (238, 'siswa38@ilhami.com', @pwd, 'siswa', 10, 1),
  (239, 'siswa39@ilhami.com', @pwd, 'siswa', 10, 1),
  (240, 'siswa40@ilhami.com', @pwd, 'siswa', 10, 1);

INSERT INTO mapel (id, nama, deskripsi, is_active) VALUES
  (1, 'Matematika', 'Pelajaran Matematika', 1),
  (2, 'Bahasa Inggris', 'Pelajaran Bahasa Inggris', 1),
  (3, 'Fisika', 'Pelajaran Fisika', 1),
  (4, 'Kimia', 'Pelajaran Kimia', 1),
  (5, 'Biologi', 'Pelajaran Biologi', 1),
  (6, 'Bahasa Indonesia', 'Pelajaran Bahasa Indonesia', 1),
  (7, 'Geografi', 'Pelajaran Geografi', 1),
  (8, 'Ekonomi', 'Pelajaran Ekonomi', 1);

INSERT INTO manajemen (id, cabang_id, nama, gaji_tambahan) VALUES
  (1, 1, 'Koordinator Cabang', 500000),
  (2, 1, 'Supervisor Akademik', 350000),
  (3, 2, 'Koordinator Cabang', 500000),
  (4, 2, 'Supervisor Akademik', 350000),
  (5, 3, 'Koordinator Cabang', 500000),
  (6, 3, 'Supervisor Akademik', 350000),
  (7, 4, 'Koordinator Cabang', 500000),
  (8, 4, 'Supervisor Akademik', 350000),
  (9, 5, 'Koordinator Cabang', 500000),
  (10, 5, 'Supervisor Akademik', 350000),
  (11, 6, 'Koordinator Cabang', 500000),
  (12, 6, 'Supervisor Akademik', 350000),
  (13, 7, 'Koordinator Cabang', 500000),
  (14, 7, 'Supervisor Akademik', 350000),
  (15, 8, 'Koordinator Cabang', 500000),
  (16, 8, 'Supervisor Akademik', 350000),
  (17, 9, 'Koordinator Cabang', 500000),
  (18, 9, 'Supervisor Akademik', 350000),
  (19, 10, 'Koordinator Cabang', 500000),
  (20, 10, 'Supervisor Akademik', 350000);

INSERT INTO edukator (id, user_id, nama, nik, telepon, alamat, pendidikan_terakhir, foto, cabang_utama_id, manajemen_id, is_active) VALUES
  (1, 101, 'Edukator 01', '3271010001', '0812000001', 'Jakarta', 'S1', NULL, 1, 1, 1),
  (2, 102, 'Edukator 02', '3271010002', '0812000002', 'Jakarta', 'Mahasiswa', NULL, 1, NULL, 1),
  (3, 103, 'Edukator 03', '3272020003', '0812000003', 'Bandung', 'S1', NULL, 2, 3, 1),
  (4, 104, 'Edukator 04', '3272020004', '0812000004', 'Bandung', 'S2', NULL, 2, NULL, 1),
  (5, 105, 'Edukator 05', '3273030005', '0812000005', 'Surabaya', 'S1', NULL, 3, 5, 1),
  (6, 106, 'Edukator 06', '3273030006', '0812000006', 'Surabaya', 'Mahasiswa', NULL, 3, NULL, 1),
  (7, 107, 'Edukator 07', '3274040007', '0812000007', 'Medan', 'S1', NULL, 4, 7, 1),
  (8, 108, 'Edukator 08', '3274040008', '0812000008', 'Medan', 'S2', NULL, 4, NULL, 1),
  (9, 109, 'Edukator 09', '3275050009', '0812000009', 'Semarang', 'S1', NULL, 5, 9, 1),
  (10, 110, 'Edukator 10', '3275050010', '0812000010', 'Semarang', 'Mahasiswa', NULL, 5, NULL, 1),
  (11, 111, 'Edukator 11', '3276060011', '0812000011', 'Yogyakarta', 'S1', NULL, 6, 11, 1),
  (12, 112, 'Edukator 12', '3276060012', '0812000012', 'Yogyakarta', 'S2', NULL, 6, NULL, 1),
  (13, 113, 'Edukator 13', '3277070013', '0812000013', 'Makassar', 'S1', NULL, 7, 13, 1),
  (14, 114, 'Edukator 14', '3277070014', '0812000014', 'Makassar', 'Mahasiswa', NULL, 7, NULL, 1),
  (15, 115, 'Edukator 15', '3278080015', '0812000015', 'Denpasar', 'S1', NULL, 8, 15, 1),
  (16, 116, 'Edukator 16', '3278080016', '0812000016', 'Denpasar', 'S2', NULL, 8, NULL, 1),
  (17, 117, 'Edukator 17', '3279090017', '0812000017', 'Palembang', 'S1', NULL, 9, 17, 1),
  (18, 118, 'Edukator 18', '3279090018', '0812000018', 'Palembang', 'Mahasiswa', NULL, 9, NULL, 1),
  (19, 119, 'Edukator 19', '3270100019', '0812000019', 'Balikpapan', 'S1', NULL, 10, 19, 1),
  (20, 120, 'Edukator 20', '3270100020', '0812000020', 'Balikpapan', 'S2', NULL, 10, NULL, 1);

INSERT INTO edukator_mapel (edukator_id, mapel_id) VALUES
  (1, 1), (1, 2),
  (2, 2), (2, 3),
  (3, 3), (3, 4),
  (4, 4), (4, 5),
  (5, 5), (5, 6),
  (6, 6), (6, 7),
  (7, 7), (7, 8),
  (8, 8), (8, 1),
  (9, 1), (9, 3),
  (10, 2), (10, 4),
  (11, 3), (11, 5),
  (12, 4), (12, 6),
  (13, 5), (13, 7),
  (14, 6), (14, 8),
  (15, 7), (15, 1),
  (16, 8), (16, 2),
  (17, 1), (17, 4),
  (18, 2), (18, 5),
  (19, 3), (19, 6),
  (20, 4), (20, 7);

INSERT INTO program (id, cabang_id, mapel_id, nama, tipe_les, jumlah_pertemuan, harga, deskripsi, is_active) VALUES
  (1, 1, 1, 'Privat Matematika CBG01', 'privat', 8, 600000, 'Privat Matematika', 1),
  (2, 1, 2, 'Kelas Bahasa Inggris CBG01', 'kelas', 12, 450000, 'Kelas Bahasa Inggris', 1),
  (3, 1, 3, 'Privat Fisika CBG01', 'privat', 8, 650000, 'Privat Fisika', 1),
  (4, 2, 1, 'Privat Matematika CBG02', 'privat', 8, 600000, 'Privat Matematika', 1),
  (5, 2, 2, 'Kelas Bahasa Inggris CBG02', 'kelas', 12, 450000, 'Kelas Bahasa Inggris', 1),
  (6, 2, 3, 'Privat Fisika CBG02', 'privat', 8, 650000, 'Privat Fisika', 1),
  (7, 3, 1, 'Privat Matematika CBG03', 'privat', 8, 600000, 'Privat Matematika', 1),
  (8, 3, 2, 'Kelas Bahasa Inggris CBG03', 'kelas', 12, 450000, 'Kelas Bahasa Inggris', 1),
  (9, 3, 3, 'Privat Fisika CBG03', 'privat', 8, 650000, 'Privat Fisika', 1),
  (10, 4, 1, 'Privat Matematika CBG04', 'privat', 8, 600000, 'Privat Matematika', 1),
  (11, 4, 2, 'Kelas Bahasa Inggris CBG04', 'kelas', 12, 450000, 'Kelas Bahasa Inggris', 1),
  (12, 4, 3, 'Privat Fisika CBG04', 'privat', 8, 650000, 'Privat Fisika', 1),
  (13, 5, 1, 'Privat Matematika CBG05', 'privat', 8, 600000, 'Privat Matematika', 1),
  (14, 5, 2, 'Kelas Bahasa Inggris CBG05', 'kelas', 12, 450000, 'Kelas Bahasa Inggris', 1),
  (15, 5, 3, 'Privat Fisika CBG05', 'privat', 8, 650000, 'Privat Fisika', 1),
  (16, 6, 1, 'Privat Matematika CBG06', 'privat', 8, 600000, 'Privat Matematika', 1),
  (17, 6, 2, 'Kelas Bahasa Inggris CBG06', 'kelas', 12, 450000, 'Kelas Bahasa Inggris', 1),
  (18, 6, 3, 'Privat Fisika CBG06', 'privat', 8, 650000, 'Privat Fisika', 1),
  (19, 7, 1, 'Privat Matematika CBG07', 'privat', 8, 600000, 'Privat Matematika', 1),
  (20, 7, 2, 'Kelas Bahasa Inggris CBG07', 'kelas', 12, 450000, 'Kelas Bahasa Inggris', 1),
  (21, 7, 3, 'Privat Fisika CBG07', 'privat', 8, 650000, 'Privat Fisika', 1),
  (22, 8, 1, 'Privat Matematika CBG08', 'privat', 8, 600000, 'Privat Matematika', 1),
  (23, 8, 2, 'Kelas Bahasa Inggris CBG08', 'kelas', 12, 450000, 'Kelas Bahasa Inggris', 1),
  (24, 8, 3, 'Privat Fisika CBG08', 'privat', 8, 650000, 'Privat Fisika', 1),
  (25, 9, 1, 'Privat Matematika CBG09', 'privat', 8, 600000, 'Privat Matematika', 1),
  (26, 9, 2, 'Kelas Bahasa Inggris CBG09', 'kelas', 12, 450000, 'Kelas Bahasa Inggris', 1),
  (27, 9, 3, 'Privat Fisika CBG09', 'privat', 8, 650000, 'Privat Fisika', 1),
  (28, 10, 1, 'Privat Matematika CBG10', 'privat', 8, 600000, 'Privat Matematika', 1),
  (29, 10, 2, 'Kelas Bahasa Inggris CBG10', 'kelas', 12, 450000, 'Kelas Bahasa Inggris', 1),
  (30, 10, 3, 'Privat Fisika CBG10', 'privat', 8, 650000, 'Privat Fisika', 1);

INSERT INTO promo (cabang_id, program_id, nama, tipe_diskon, nilai, tanggal_mulai, tanggal_selesai, is_active) VALUES
  (1, 1, 'Diskon Awal Tahun', 'percent', 10, DATE_SUB(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 14 DAY), 1),
  (1, 2, 'Potongan Kelas Intensif', 'fixed', 100000, DATE_SUB(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 21 DAY), 1),
  (2, 5, 'Promo Bahasa Inggris', 'percent', 15, DATE_SUB(CURDATE(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 10 DAY), 1),
  (3, 7, 'Diskon Privat Matematika', 'fixed', 75000, DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 20 DAY), 1);

INSERT INTO kelas (id, cabang_id, program_id, edukator_id, nama, kapasitas, is_active) VALUES
  (1, 1, 2, 1, 'Kelas Reguler CBG01', 20, 1),
  (2, 2, 5, 3, 'Kelas Reguler CBG02', 20, 1),
  (3, 3, 8, 5, 'Kelas Reguler CBG03', 20, 1),
  (4, 4, 11, 7, 'Kelas Reguler CBG04', 20, 1),
  (5, 5, 14, 9, 'Kelas Reguler CBG05', 20, 1),
  (6, 6, 17, 11, 'Kelas Reguler CBG06', 20, 1),
  (7, 7, 20, 13, 'Kelas Reguler CBG07', 20, 1),
  (8, 8, 23, 15, 'Kelas Reguler CBG08', 20, 1),
  (9, 9, 26, 17, 'Kelas Reguler CBG09', 20, 1),
  (10, 10, 29, 19, 'Kelas Reguler CBG10', 20, 1);

INSERT INTO kelas_program (kelas_id, program_id) VALUES
  (1, 2), (2, 5), (3, 8), (4, 11), (5, 14),
  (6, 17), (7, 20), (8, 23), (9, 26), (10, 29);

INSERT INTO siswa (id, user_id, cabang_id, nama, nik, telepon, alamat, tanggal_lahir, sekolah_asal, kelas, foto, is_active) VALUES
  (1, 201, 1, 'Siswa CBG01-01', '3271011001', '0813000001', 'Jakarta', '2012-01-10', 'SDN 01', 'SD', NULL, 1),
  (2, 202, 1, 'Siswa CBG01-02', '3271011002', '0813000002', 'Jakarta', '2011-02-12', 'SMP 01', 'SMP', NULL, 1),
  (3, 203, 1, 'Siswa CBG01-03', '3271011003', '0813000003', 'Jakarta', '2010-03-14', 'SMA 01', 'SMA', NULL, 1),
  (4, 204, 1, 'Siswa CBG01-04', '3271011004', '0813000004', 'Jakarta', '2009-04-16', 'SMK 01', 'ALUMNI', NULL, 1),
  (5, 205, 2, 'Siswa CBG02-01', '3272021005', '0813000005', 'Bandung', '2012-01-11', 'SDN 02', 'SD', NULL, 1),
  (6, 206, 2, 'Siswa CBG02-02', '3272021006', '0813000006', 'Bandung', '2011-02-13', 'SMP 02', 'SMP', NULL, 1),
  (7, 207, 2, 'Siswa CBG02-03', '3272021007', '0813000007', 'Bandung', '2010-03-15', 'SMA 02', 'SMA', NULL, 1),
  (8, 208, 2, 'Siswa CBG02-04', '3272021008', '0813000008', 'Bandung', '2009-04-17', 'SMK 02', 'ALUMNI', NULL, 1),
  (9, 209, 3, 'Siswa CBG03-01', '3273031009', '0813000009', 'Surabaya', '2012-01-12', 'SDN 03', 'SD', NULL, 1),
  (10, 210, 3, 'Siswa CBG03-02', '3273031010', '0813000010', 'Surabaya', '2011-02-14', 'SMP 03', 'SMP', NULL, 1),
  (11, 211, 3, 'Siswa CBG03-03', '3273031011', '0813000011', 'Surabaya', '2010-03-16', 'SMA 03', 'SMA', NULL, 1),
  (12, 212, 3, 'Siswa CBG03-04', '3273031012', '0813000012', 'Surabaya', '2009-04-18', 'SMK 03', 'ALUMNI', NULL, 1),
  (13, 213, 4, 'Siswa CBG04-01', '3274041013', '0813000013', 'Medan', '2012-01-13', 'SDN 04', 'SD', NULL, 1),
  (14, 214, 4, 'Siswa CBG04-02', '3274041014', '0813000014', 'Medan', '2011-02-15', 'SMP 04', 'SMP', NULL, 1),
  (15, 215, 4, 'Siswa CBG04-03', '3274041015', '0813000015', 'Medan', '2010-03-17', 'SMA 04', 'SMA', NULL, 1),
  (16, 216, 4, 'Siswa CBG04-04', '3274041016', '0813000016', 'Medan', '2009-04-19', 'SMK 04', 'ALUMNI', NULL, 1),
  (17, 217, 5, 'Siswa CBG05-01', '3275051017', '0813000017', 'Semarang', '2012-01-14', 'SDN 05', 'SD', NULL, 1),
  (18, 218, 5, 'Siswa CBG05-02', '3275051018', '0813000018', 'Semarang', '2011-02-16', 'SMP 05', 'SMP', NULL, 1),
  (19, 219, 5, 'Siswa CBG05-03', '3275051019', '0813000019', 'Semarang', '2010-03-18', 'SMA 05', 'SMA', NULL, 1),
  (20, 220, 5, 'Siswa CBG05-04', '3275051020', '0813000020', 'Semarang', '2009-04-20', 'SMK 05', 'ALUMNI', NULL, 1),
  (21, 221, 6, 'Siswa CBG06-01', '3276061021', '0813000021', 'Yogyakarta', '2012-01-15', 'SDN 06', 'SD', NULL, 1),
  (22, 222, 6, 'Siswa CBG06-02', '3276061022', '0813000022', 'Yogyakarta', '2011-02-17', 'SMP 06', 'SMP', NULL, 1),
  (23, 223, 6, 'Siswa CBG06-03', '3276061023', '0813000023', 'Yogyakarta', '2010-03-19', 'SMA 06', 'SMA', NULL, 1),
  (24, 224, 6, 'Siswa CBG06-04', '3276061024', '0813000024', 'Yogyakarta', '2009-04-21', 'SMK 06', 'ALUMNI', NULL, 1),
  (25, 225, 7, 'Siswa CBG07-01', '3277071025', '0813000025', 'Makassar', '2012-01-16', 'SDN 07', 'SD', NULL, 1),
  (26, 226, 7, 'Siswa CBG07-02', '3277071026', '0813000026', 'Makassar', '2011-02-18', 'SMP 07', 'SMP', NULL, 1),
  (27, 227, 7, 'Siswa CBG07-03', '3277071027', '0813000027', 'Makassar', '2010-03-20', 'SMA 07', 'SMA', NULL, 1),
  (28, 228, 7, 'Siswa CBG07-04', '3277071028', '0813000028', 'Makassar', '2009-04-22', 'SMK 07', 'ALUMNI', NULL, 1),
  (29, 229, 8, 'Siswa CBG08-01', '3278081029', '0813000029', 'Denpasar', '2012-01-17', 'SDN 08', 'SD', NULL, 1),
  (30, 230, 8, 'Siswa CBG08-02', '3278081030', '0813000030', 'Denpasar', '2011-02-19', 'SMP 08', 'SMP', NULL, 1),
  (31, 231, 8, 'Siswa CBG08-03', '3278081031', '0813000031', 'Denpasar', '2010-03-21', 'SMA 08', 'SMA', NULL, 1),
  (32, 232, 8, 'Siswa CBG08-04', '3278081032', '0813000032', 'Denpasar', '2009-04-23', 'SMK 08', 'ALUMNI', NULL, 1),
  (33, 233, 9, 'Siswa CBG09-01', '3279091033', '0813000033', 'Palembang', '2012-01-18', 'SDN 09', 'SD', NULL, 1),
  (34, 234, 9, 'Siswa CBG09-02', '3279091034', '0813000034', 'Palembang', '2011-02-20', 'SMP 09', 'SMP', NULL, 1),
  (35, 235, 9, 'Siswa CBG09-03', '3279091035', '0813000035', 'Palembang', '2010-03-22', 'SMA 09', 'SMA', NULL, 1),
  (36, 236, 9, 'Siswa CBG09-04', '3279091036', '0813000036', 'Palembang', '2009-04-24', 'SMK 09', 'ALUMNI', NULL, 1),
  (37, 237, 10, 'Siswa CBG10-01', '3270101037', '0813000037', 'Balikpapan', '2012-01-19', 'SDN 10', 'SD', NULL, 1),
  (38, 238, 10, 'Siswa CBG10-02', '3270101038', '0813000038', 'Balikpapan', '2011-02-21', 'SMP 10', 'SMP', NULL, 1),
  (39, 239, 10, 'Siswa CBG10-03', '3270101039', '0813000039', 'Balikpapan', '2010-03-23', 'SMA 10', 'SMA', NULL, 1),
  (40, 240, 10, 'Siswa CBG10-04', '3270101040', '0813000040', 'Balikpapan', '2009-04-25', 'SMK 10', 'ALUMNI', NULL, 1);

INSERT INTO enrollment (id, siswa_id, program_id, kelas_id, tanggal_daftar, total_pertemuan, sisa_pertemuan, status_enrollment) VALUES
  (1, 1, 1, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (2, 2, 3, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (3, 3, 2, 1, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (4, 4, 2, 1, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (5, 5, 4, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (6, 6, 6, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (7, 7, 5, 2, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (8, 8, 5, 2, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (9, 9, 7, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (10, 10, 9, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (11, 11, 8, 3, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (12, 12, 8, 3, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (13, 13, 10, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (14, 14, 12, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (15, 15, 11, 4, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (16, 16, 11, 4, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (17, 17, 13, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (18, 18, 15, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (19, 19, 14, 5, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (20, 20, 14, 5, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (21, 21, 16, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (22, 22, 18, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (23, 23, 17, 6, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (24, 24, 17, 6, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (25, 25, 19, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (26, 26, 21, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (27, 27, 20, 7, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (28, 28, 20, 7, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (29, 29, 22, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (30, 30, 24, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (31, 31, 23, 8, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (32, 32, 23, 8, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (33, 33, 25, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (34, 34, 27, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (35, 35, 26, 9, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (36, 36, 26, 9, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (37, 37, 28, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (38, 38, 30, NULL, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 8, 8, 'aktif'),
  (39, 39, 29, 10, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif'),
  (40, 40, 29, 10, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 12, 12, 'aktif');

INSERT INTO tagihan (id, cabang_id, siswa_id, enrollment_id, jenis_tagihan, nominal, tanggal_jatuh_tempo, status_tagihan) VALUES
  (1, 1, 1, 1, 'program', 600000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'lunas'),
  (2, 1, 2, 2, 'program', 650000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'lunas'),
  (3, 1, 3, 3, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'lunas'),
  (4, 1, 4, 4, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'lunas'),
  (5, 2, 5, 5, 'program', 600000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'lunas'),
  (6, 2, 6, 6, 'program', 650000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'lunas'),
  (7, 2, 7, 7, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'lunas'),
  (8, 2, 8, 8, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'lunas'),
  (9, 3, 9, 9, 'program', 600000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'lunas'),
  (10, 3, 10, 10, 'program', 650000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'lunas'),
  (11, 3, 11, 11, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'cicilan'),
  (12, 3, 12, 12, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'cicilan'),
  (13, 4, 13, 13, 'program', 600000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'cicilan'),
  (14, 4, 14, 14, 'program', 650000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'cicilan'),
  (15, 4, 15, 15, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'cicilan'),
  (16, 4, 16, 16, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'cicilan'),
  (17, 5, 17, 17, 'program', 600000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'cicilan'),
  (18, 5, 18, 18, 'program', 650000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'cicilan'),
  (19, 5, 19, 19, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'cicilan'),
  (20, 5, 20, 20, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'cicilan'),
  (21, 6, 21, 21, 'program', 600000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (22, 6, 22, 22, 'program', 650000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (23, 6, 23, 23, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (24, 6, 24, 24, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (25, 7, 25, 25, 'program', 600000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (26, 7, 26, 26, 'program', 650000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (27, 7, 27, 27, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (28, 7, 28, 28, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (29, 8, 29, 29, 'program', 600000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (30, 8, 30, 30, 'program', 650000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (31, 8, 31, 31, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (32, 8, 32, 32, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (33, 9, 33, 33, 'program', 600000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (34, 9, 34, 34, 'program', 650000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (35, 9, 35, 35, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (36, 9, 36, 36, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (37, 10, 37, 37, 'program', 600000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (38, 10, 38, 38, 'program', 650000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (39, 10, 39, 39, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar'),
  (40, 10, 40, 40, 'program', 450000, DATE_FORMAT(CURDATE(), '%Y-%m-10'), 'belum_bayar');

INSERT INTO pembayaran (tagihan_id, cabang_id, nominal, metode_bayar, tanggal_bayar, bukti_bayar, catatan, created_by) VALUES
  (1, 1, 600000, 'transfer', CURDATE(), NULL, 'Lunas', 2),
  (2, 1, 650000, 'cash', CURDATE(), NULL, 'Lunas', 2),
  (3, 1, 450000, 'transfer', CURDATE(), NULL, 'Lunas', 2),
  (4, 1, 450000, 'cash', CURDATE(), NULL, 'Lunas', 2),
  (5, 2, 600000, 'transfer', CURDATE(), NULL, 'Lunas', 3),
  (6, 2, 650000, 'cash', CURDATE(), NULL, 'Lunas', 3),
  (7, 2, 450000, 'transfer', CURDATE(), NULL, 'Lunas', 3),
  (8, 2, 450000, 'cash', CURDATE(), NULL, 'Lunas', 3),
  (9, 3, 600000, 'transfer', CURDATE(), NULL, 'Lunas', 4),
  (10, 3, 650000, 'cash', CURDATE(), NULL, 'Lunas', 4),
  (11, 3, 200000, 'transfer', CURDATE(), NULL, 'Cicilan', 4),
  (12, 3, 200000, 'cash', CURDATE(), NULL, 'Cicilan', 4),
  (13, 4, 300000, 'transfer', CURDATE(), NULL, 'Cicilan', 5),
  (14, 4, 300000, 'cash', CURDATE(), NULL, 'Cicilan', 5),
  (15, 4, 200000, 'transfer', CURDATE(), NULL, 'Cicilan', 5),
  (16, 4, 200000, 'cash', CURDATE(), NULL, 'Cicilan', 5),
  (17, 5, 250000, 'transfer', CURDATE(), NULL, 'Cicilan', 6),
  (18, 5, 250000, 'cash', CURDATE(), NULL, 'Cicilan', 6),
  (19, 5, 200000, 'transfer', CURDATE(), NULL, 'Cicilan', 6),
  (20, 5, 200000, 'cash', CURDATE(), NULL, 'Cicilan', 6);

INSERT INTO jadwal (id, cabang_id, enrollment_id, program_id, edukator_id, mapel_id, tipe_les, tanggal, jam_mulai, jam_selesai, status_jadwal, kelas_id) VALUES
  (1, 0 + 1, 1, 1, 1, 1, 'privat', DATE_SUB(CURDATE(), INTERVAL 2 DAY), '15:00', '16:00', 'completed', NULL),
  (2, 0 + 1, 2, 3, 1, 3, 'privat', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '15:00', '16:00', 'scheduled', NULL),
  (3, 0 + 2, 5, 4, 3, 1, 'privat', DATE_SUB(CURDATE(), INTERVAL 2 DAY), '15:00', '16:00', 'completed', NULL),
  (4, 0 + 2, 6, 6, 3, 3, 'privat', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '15:00', '16:00', 'scheduled', NULL),
  (5, 0 + 3, 9, 7, 5, 1, 'privat', DATE_SUB(CURDATE(), INTERVAL 2 DAY), '15:00', '16:00', 'completed', NULL),
  (6, 0 + 3, 10, 9, 5, 3, 'privat', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '15:00', '16:00', 'scheduled', NULL),
  (7, 0 + 4, 13, 10, 7, 1, 'privat', DATE_SUB(CURDATE(), INTERVAL 2 DAY), '15:00', '16:00', 'completed', NULL),
  (8, 0 + 4, 14, 12, 7, 3, 'privat', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '15:00', '16:00', 'scheduled', NULL),
  (9, 0 + 5, 17, 13, 9, 1, 'privat', DATE_SUB(CURDATE(), INTERVAL 2 DAY), '15:00', '16:00', 'completed', NULL),
  (10, 0 + 5, 18, 15, 9, 3, 'privat', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '15:00', '16:00', 'scheduled', NULL),
  (11, 0 + 6, 21, 16, 11, 1, 'privat', DATE_SUB(CURDATE(), INTERVAL 2 DAY), '15:00', '16:00', 'completed', NULL),
  (12, 0 + 6, 22, 18, 11, 3, 'privat', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '15:00', '16:00', 'scheduled', NULL),
  (13, 0 + 7, 25, 19, 13, 1, 'privat', DATE_SUB(CURDATE(), INTERVAL 2 DAY), '15:00', '16:00', 'completed', NULL),
  (14, 0 + 7, 26, 21, 13, 3, 'privat', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '15:00', '16:00', 'scheduled', NULL),
  (15, 0 + 8, 29, 22, 15, 1, 'privat', DATE_SUB(CURDATE(), INTERVAL 2 DAY), '15:00', '16:00', 'completed', NULL),
  (16, 0 + 8, 30, 24, 15, 3, 'privat', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '15:00', '16:00', 'scheduled', NULL),
  (17, 0 + 9, 33, 25, 17, 1, 'privat', DATE_SUB(CURDATE(), INTERVAL 2 DAY), '15:00', '16:00', 'completed', NULL),
  (18, 0 + 9, 34, 27, 17, 3, 'privat', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '15:00', '16:00', 'scheduled', NULL),
  (19, 0 + 10, 37, 28, 19, 1, 'privat', DATE_SUB(CURDATE(), INTERVAL 2 DAY), '15:00', '16:00', 'completed', NULL),
  (20, 0 + 10, 38, 30, 19, 3, 'privat', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '15:00', '16:00', 'scheduled', NULL),
  (21, 1, NULL, 2, 1, 2, 'kelas', DATE_SUB(CURDATE(), INTERVAL 1 DAY), '09:00', '10:30', 'completed', 1),
  (22, 1, NULL, 2, 1, 2, 'kelas', CURDATE(), '09:00', '10:30', 'scheduled', 1),
  (23, 1, NULL, 2, 1, 2, 'kelas', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '09:00', '10:30', 'scheduled', 1),
  (24, 2, NULL, 5, 3, 2, 'kelas', DATE_SUB(CURDATE(), INTERVAL 1 DAY), '09:00', '10:30', 'completed', 2),
  (25, 2, NULL, 5, 3, 2, 'kelas', CURDATE(), '09:00', '10:30', 'scheduled', 2),
  (26, 2, NULL, 5, 3, 2, 'kelas', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '09:00', '10:30', 'scheduled', 2),
  (27, 3, NULL, 8, 5, 2, 'kelas', DATE_SUB(CURDATE(), INTERVAL 1 DAY), '09:00', '10:30', 'completed', 3),
  (28, 3, NULL, 8, 5, 2, 'kelas', CURDATE(), '09:00', '10:30', 'scheduled', 3),
  (29, 3, NULL, 8, 5, 2, 'kelas', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '09:00', '10:30', 'scheduled', 3),
  (30, 4, NULL, 11, 7, 2, 'kelas', DATE_SUB(CURDATE(), INTERVAL 1 DAY), '09:00', '10:30', 'completed', 4),
  (31, 4, NULL, 11, 7, 2, 'kelas', CURDATE(), '09:00', '10:30', 'scheduled', 4),
  (32, 4, NULL, 11, 7, 2, 'kelas', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '09:00', '10:30', 'scheduled', 4),
  (33, 5, NULL, 14, 9, 2, 'kelas', DATE_SUB(CURDATE(), INTERVAL 1 DAY), '09:00', '10:30', 'completed', 5),
  (34, 5, NULL, 14, 9, 2, 'kelas', CURDATE(), '09:00', '10:30', 'scheduled', 5),
  (35, 5, NULL, 14, 9, 2, 'kelas', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '09:00', '10:30', 'scheduled', 5),
  (36, 6, NULL, 17, 11, 2, 'kelas', DATE_SUB(CURDATE(), INTERVAL 1 DAY), '09:00', '10:30', 'completed', 6),
  (37, 6, NULL, 17, 11, 2, 'kelas', CURDATE(), '09:00', '10:30', 'scheduled', 6),
  (38, 6, NULL, 17, 11, 2, 'kelas', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '09:00', '10:30', 'scheduled', 6),
  (39, 7, NULL, 20, 13, 2, 'kelas', DATE_SUB(CURDATE(), INTERVAL 1 DAY), '09:00', '10:30', 'completed', 7),
  (40, 7, NULL, 20, 13, 2, 'kelas', CURDATE(), '09:00', '10:30', 'scheduled', 7),
  (41, 7, NULL, 20, 13, 2, 'kelas', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '09:00', '10:30', 'scheduled', 7),
  (42, 8, NULL, 23, 15, 2, 'kelas', DATE_SUB(CURDATE(), INTERVAL 1 DAY), '09:00', '10:30', 'completed', 8),
  (43, 8, NULL, 23, 15, 2, 'kelas', CURDATE(), '09:00', '10:30', 'scheduled', 8),
  (44, 8, NULL, 23, 15, 2, 'kelas', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '09:00', '10:30', 'scheduled', 8),
  (45, 9, NULL, 26, 17, 2, 'kelas', DATE_SUB(CURDATE(), INTERVAL 1 DAY), '09:00', '10:30', 'completed', 9),
  (46, 9, NULL, 26, 17, 2, 'kelas', CURDATE(), '09:00', '10:30', 'scheduled', 9),
  (47, 9, NULL, 26, 17, 2, 'kelas', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '09:00', '10:30', 'scheduled', 9),
  (48, 10, NULL, 29, 19, 2, 'kelas', DATE_SUB(CURDATE(), INTERVAL 1 DAY), '09:00', '10:30', 'completed', 10),
  (49, 10, NULL, 29, 19, 2, 'kelas', CURDATE(), '09:00', '10:30', 'scheduled', 10),
  (50, 10, NULL, 29, 19, 2, 'kelas', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '09:00', '10:30', 'scheduled', 10);

INSERT INTO jadwal_kelas_siswa (jadwal_id, enrollment_id, pertemuan_ke, status) VALUES
  (21, 3, 1, 'selesai'), (21, 4, 1, 'selesai'), (22, 3, 2, 'belum'), (22, 4, 2, 'belum'),
  (24, 7, 1, 'selesai'), (24, 8, 1, 'selesai'), (25, 7, 2, 'belum'), (25, 8, 2, 'belum'),
  (27, 11, 1, 'selesai'), (27, 12, 1, 'selesai'), (28, 11, 2, 'belum'), (28, 12, 2, 'belum'),
  (30, 15, 1, 'selesai'), (30, 16, 1, 'selesai'), (31, 15, 2, 'belum'), (31, 16, 2, 'belum'),
  (33, 19, 1, 'selesai'), (33, 20, 1, 'selesai'), (34, 19, 2, 'belum'), (34, 20, 2, 'belum'),
  (36, 23, 1, 'selesai'), (36, 24, 1, 'selesai'), (37, 23, 2, 'belum'), (37, 24, 2, 'belum'),
  (39, 27, 1, 'selesai'), (39, 28, 1, 'selesai'), (40, 27, 2, 'belum'), (40, 28, 2, 'belum'),
  (42, 31, 1, 'selesai'), (42, 32, 1, 'selesai'), (43, 31, 2, 'belum'), (43, 32, 2, 'belum'),
  (45, 35, 1, 'selesai'), (45, 36, 1, 'selesai'), (46, 35, 2, 'belum'), (46, 36, 2, 'belum'),
  (48, 39, 1, 'selesai'), (48, 40, 1, 'selesai'), (49, 39, 2, 'belum'), (49, 40, 2, 'belum');

INSERT INTO presensi (id, jadwal_id, edukator_id, waktu_absen, latitude, longitude, catatan) VALUES
  (1, 1, 1, DATE_SUB(NOW(), INTERVAL 1 DAY), -6.200000, 106.816666, 'Materi privat'),
  (2, 21, 1, DATE_SUB(NOW(), INTERVAL 1 DAY), -6.200000, 106.816666, 'Materi kelas'),
  (3, 3, 3, DATE_SUB(NOW(), INTERVAL 1 DAY), -6.914744, 107.609810, 'Materi privat'),
  (4, 24, 3, DATE_SUB(NOW(), INTERVAL 1 DAY), -6.914744, 107.609810, 'Materi kelas'),
  (5, 5, 5, DATE_SUB(NOW(), INTERVAL 1 DAY), -7.257472, 112.752090, 'Materi privat'),
  (6, 27, 5, DATE_SUB(NOW(), INTERVAL 1 DAY), -7.257472, 112.752090, 'Materi kelas'),
  (7, 7, 7, DATE_SUB(NOW(), INTERVAL 1 DAY), 3.595196, 98.672226, 'Materi privat'),
  (8, 30, 7, DATE_SUB(NOW(), INTERVAL 1 DAY), 3.595196, 98.672226, 'Materi kelas'),
  (9, 9, 9, DATE_SUB(NOW(), INTERVAL 1 DAY), -6.966667, 110.416664, 'Materi privat'),
  (10, 33, 9, DATE_SUB(NOW(), INTERVAL 1 DAY), -6.966667, 110.416664, 'Materi kelas'),
  (11, 11, 11, DATE_SUB(NOW(), INTERVAL 1 DAY), -7.795580, 110.369490, 'Materi privat'),
  (12, 36, 11, DATE_SUB(NOW(), INTERVAL 1 DAY), -7.795580, 110.369490, 'Materi kelas'),
  (13, 13, 13, DATE_SUB(NOW(), INTERVAL 1 DAY), -5.147665, 119.432732, 'Materi privat'),
  (14, 39, 13, DATE_SUB(NOW(), INTERVAL 1 DAY), -5.147665, 119.432732, 'Materi kelas'),
  (15, 15, 15, DATE_SUB(NOW(), INTERVAL 1 DAY), -8.650000, 115.216667, 'Materi privat'),
  (16, 42, 15, DATE_SUB(NOW(), INTERVAL 1 DAY), -8.650000, 115.216667, 'Materi kelas'),
  (17, 17, 17, DATE_SUB(NOW(), INTERVAL 1 DAY), -2.990934, 104.756554, 'Materi privat'),
  (18, 45, 17, DATE_SUB(NOW(), INTERVAL 1 DAY), -2.990934, 104.756554, 'Materi kelas'),
  (19, 19, 19, DATE_SUB(NOW(), INTERVAL 1 DAY), -1.265386, 116.831200, 'Materi privat'),
  (20, 48, 19, DATE_SUB(NOW(), INTERVAL 1 DAY), -1.265386, 116.831200, 'Materi kelas');

INSERT INTO presensi_siswa (presensi_id, siswa_id, enrollment_id, pertemuan_ke, status_presensi_siswa) VALUES
  (1, 1, 1, 1, 'hadir'),
  (3, 5, 5, 1, 'hadir'),
  (5, 9, 9, 1, 'hadir'),
  (7, 13, 13, 1, 'hadir'),
  (9, 17, 17, 1, 'hadir'),
  (11, 21, 21, 1, 'hadir'),
  (13, 25, 25, 1, 'hadir'),
  (15, 29, 29, 1, 'hadir'),
  (17, 33, 33, 1, 'hadir'),
  (19, 37, 37, 1, 'hadir');

INSERT INTO gaji_setting (cabang_id, jenjang, nominal) VALUES
  (NULL, 'PAUD_TK', 40000), (NULL, 'SD', 50000), (NULL, 'SMP', 60000), (NULL, 'SMA', 70000), (NULL, 'ALUMNI', 80000),
  (1, 'PAUD_TK', 40000), (1, 'SD', 50000), (1, 'SMP', 60000), (1, 'SMA', 70000), (1, 'ALUMNI', 80000),
  (2, 'PAUD_TK', 40000), (2, 'SD', 50000), (2, 'SMP', 60000), (2, 'SMA', 70000), (2, 'ALUMNI', 80000),
  (3, 'PAUD_TK', 40000), (3, 'SD', 50000), (3, 'SMP', 60000), (3, 'SMA', 70000), (3, 'ALUMNI', 80000),
  (4, 'PAUD_TK', 40000), (4, 'SD', 50000), (4, 'SMP', 60000), (4, 'SMA', 70000), (4, 'ALUMNI', 80000),
  (5, 'PAUD_TK', 40000), (5, 'SD', 50000), (5, 'SMP', 60000), (5, 'SMA', 70000), (5, 'ALUMNI', 80000),
  (6, 'PAUD_TK', 40000), (6, 'SD', 50000), (6, 'SMP', 60000), (6, 'SMA', 70000), (6, 'ALUMNI', 80000),
  (7, 'PAUD_TK', 40000), (7, 'SD', 50000), (7, 'SMP', 60000), (7, 'SMA', 70000), (7, 'ALUMNI', 80000),
  (8, 'PAUD_TK', 40000), (8, 'SD', 50000), (8, 'SMP', 60000), (8, 'SMA', 70000), (8, 'ALUMNI', 80000),
  (9, 'PAUD_TK', 40000), (9, 'SD', 50000), (9, 'SMP', 60000), (9, 'SMA', 70000), (9, 'ALUMNI', 80000),
  (10, 'PAUD_TK', 40000), (10, 'SD', 50000), (10, 'SMP', 60000), (10, 'SMA', 70000), (10, 'ALUMNI', 80000);

INSERT INTO gaji_transaksi (presensi_id, jadwal_id, edukator_id, cabang_id, jenjang, nominal) VALUES
  (1, 1, 1, 1, 'SD', 50000),
  (2, 21, 1, 1, 'SMP', 60000),
  (3, 3, 3, 2, 'SD', 50000),
  (4, 24, 3, 2, 'SMP', 60000),
  (5, 5, 5, 3, 'SD', 50000),
  (6, 27, 5, 3, 'SMP', 60000),
  (7, 7, 7, 4, 'SD', 50000),
  (8, 30, 7, 4, 'SMP', 60000),
  (9, 9, 9, 5, 'SD', 50000),
  (10, 33, 9, 5, 'SMP', 60000),
  (11, 11, 11, 6, 'SD', 50000),
  (12, 36, 11, 6, 'SMP', 60000),
  (13, 13, 13, 7, 'SD', 50000),
  (14, 39, 13, 7, 'SMP', 60000),
  (15, 15, 15, 8, 'SD', 50000),
  (16, 42, 15, 8, 'SMP', 60000),
  (17, 17, 17, 9, 'SD', 50000),
  (18, 45, 17, 9, 'SMP', 60000),
  (19, 19, 19, 10, 'SD', 50000),
  (20, 48, 19, 10, 'SMP', 60000);

INSERT INTO pengeluaran (cabang_id, kategori, deskripsi, nominal, tanggal) VALUES
  (1, 'Operasional', 'ATK dan logistik', 150000, CURDATE()),
  (1, 'Maintenance', 'Perawatan fasilitas', 250000, CURDATE()),
  (2, 'Operasional', 'ATK dan logistik', 150000, CURDATE()),
  (2, 'Maintenance', 'Perawatan fasilitas', 250000, CURDATE()),
  (3, 'Operasional', 'ATK dan logistik', 150000, CURDATE()),
  (3, 'Maintenance', 'Perawatan fasilitas', 250000, CURDATE()),
  (4, 'Operasional', 'ATK dan logistik', 150000, CURDATE()),
  (4, 'Maintenance', 'Perawatan fasilitas', 250000, CURDATE()),
  (5, 'Operasional', 'ATK dan logistik', 150000, CURDATE()),
  (5, 'Maintenance', 'Perawatan fasilitas', 250000, CURDATE()),
  (6, 'Operasional', 'ATK dan logistik', 150000, CURDATE()),
  (6, 'Maintenance', 'Perawatan fasilitas', 250000, CURDATE()),
  (7, 'Operasional', 'ATK dan logistik', 150000, CURDATE()),
  (7, 'Maintenance', 'Perawatan fasilitas', 250000, CURDATE()),
  (8, 'Operasional', 'ATK dan logistik', 150000, CURDATE()),
  (8, 'Maintenance', 'Perawatan fasilitas', 250000, CURDATE()),
  (9, 'Operasional', 'ATK dan logistik', 150000, CURDATE()),
  (9, 'Maintenance', 'Perawatan fasilitas', 250000, CURDATE()),
  (10, 'Operasional', 'ATK dan logistik', 150000, CURDATE()),
  (10, 'Maintenance', 'Perawatan fasilitas', 250000, CURDATE());

INSERT INTO saldo_awal (cabang_id, periode, nominal) VALUES
  (1, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 2000000),
  (2, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 1800000),
  (3, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 2200000),
  (4, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 1900000),
  (5, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 2100000),
  (6, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 1750000),
  (7, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 2000000),
  (8, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 1950000),
  (9, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 1850000),
  (10, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 2050000);

INSERT INTO notifikasi (user_id, tipe_notifikasi, judul, pesan, data_ref, wa_status) VALUES
  (2, 'tagihan', 'Tagihan baru', 'Tagihan program siswa cabang 01 telah dibuat.', JSON_OBJECT('tagihan_id', 1), 'pending'),
  (201, 'tagihan', 'Pembayaran diterima', 'Pembayaran program sudah lunas.', JSON_OBJECT('tagihan_id', 1), 'pending');
