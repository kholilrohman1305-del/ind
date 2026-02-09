-- Migration: Tambah kolom gaji dan transport untuk program privat
-- Gaji privat dihitung langsung dari program, bukan dari setting tarif

-- Tambah kolom ke tabel program
ALTER TABLE program
  ADD COLUMN gaji_per_pertemuan INT NOT NULL DEFAULT 0 AFTER harga,
  ADD COLUMN transport_edukator INT NOT NULL DEFAULT 0 AFTER gaji_per_pertemuan,
  ADD COLUMN transport_ilhami INT NOT NULL DEFAULT 0 AFTER transport_edukator;

-- Keterangan:
-- gaji_per_pertemuan: Gaji edukator per pertemuan (untuk privat)
-- transport_edukator: Transport edukator per pertemuan → masuk penggajian
-- transport_ilhami: Transport ILHAMI per pertemuan → masuk kas pemasukan
