-- Migration: Strukturisasi Tarif ke Program
-- Tarif memiliki kategori (privat/kelas) dan nama tarif (Reguler, SNBT, TOEFL, dll)
-- Program terhubung ke tarif tertentu

-- 1. Tambah kolom nama_tarif dan kategori_les ke gaji_setting
ALTER TABLE gaji_setting
ADD COLUMN nama_tarif VARCHAR(100) NOT NULL DEFAULT 'Reguler' AFTER cabang_id,
ADD COLUMN kategori_les ENUM('privat', 'kelas') NOT NULL DEFAULT 'privat' AFTER nama_tarif;

-- 2. Update data existing: set kategori_les berdasarkan tipe_les
UPDATE gaji_setting SET kategori_les = 'privat' WHERE tipe_les = 'privat';
UPDATE gaji_setting SET kategori_les = 'kelas' WHERE tipe_les = 'kelas';
UPDATE gaji_setting SET kategori_les = 'privat' WHERE tipe_les NOT IN ('privat', 'kelas');

-- 3. Set nama_tarif untuk data existing berdasarkan tipe_les
UPDATE gaji_setting SET nama_tarif = 'Reguler' WHERE tipe_les IN ('privat', 'kelas');
UPDATE gaji_setting SET nama_tarif = UPPER(tipe_les) WHERE tipe_les NOT IN ('privat', 'kelas');

-- 4. Update unique key untuk mendukung nama_tarif
ALTER TABLE gaji_setting DROP INDEX uk_cabang_tipe_jenjang_klasifikasi;
ALTER TABLE gaji_setting ADD UNIQUE KEY uk_tarif_unique (cabang_id, nama_tarif, kategori_les, jenjang, klasifikasi_edukator);

-- 5. Tambah kolom tarif_id ke tabel program
ALTER TABLE program ADD COLUMN tarif_id INT NULL AFTER tipe_les;

-- 6. Kembalikan tipe_les di program ke hanya privat/kelas
-- (Data existing yang bukan privat/kelas akan dipetakan ke privat)
UPDATE program SET tipe_les = 'privat' WHERE tipe_les NOT IN ('privat', 'kelas');

-- 7. Kembalikan tipe_les di jadwal ke hanya privat/kelas
UPDATE jadwal SET tipe_les = 'privat' WHERE tipe_les NOT IN ('privat', 'kelas');

-- Keterangan Struktur Baru:
-- gaji_setting:
--   - nama_tarif: "Reguler", "SNBT", "TOEFL", "Olimpiade", dll
--   - kategori_les: "privat" atau "kelas" (kategori utama)
--   - jenjang: PAUD_TK, SD, SMP, SMA, ALUMNI
--   - klasifikasi_edukator: Mahasiswa, Sarjana, Sarjana_Manajemen
--   - nominal: besaran gaji
--
-- program:
--   - tipe_les: "privat" atau "kelas" (tetap sederhana)
--   - tarif_id: mengacu ke gaji_setting untuk menentukan tarif spesifik
--
-- Alur:
-- 1. Admin set tarif di Setting Tarif (pilih kategori privat/kelas, nama tarif, jenjang, klasifikasi, nominal)
-- 2. Admin buat program (pilih tipe_les privat/kelas, pilih tarif sesuai kategori)
-- 3. Siswa didaftarkan ke program
-- 4. Jadwal dibuat, gaji dihitung dari tarif yang terhubung ke program
