-- Migration: Add gaji_infaq table for educator deductions (infaq)
CREATE TABLE IF NOT EXISTS gaji_infaq (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cabang_id INT NOT NULL,
  edukator_id INT NOT NULL,
  jenis_infaq VARCHAR(100) NOT NULL,
  nominal INT NOT NULL DEFAULT 0,
  keterangan VARCHAR(255) NULL,
  tanggal DATE NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY gaji_infaq_cabang_idx (cabang_id),
  KEY gaji_infaq_edukator_idx (edukator_id),
  KEY gaji_infaq_tanggal_idx (tanggal),
  CONSTRAINT gaji_infaq_cabang_fk FOREIGN KEY (cabang_id) REFERENCES cabang (id),
  CONSTRAINT gaji_infaq_edukator_fk FOREIGN KEY (edukator_id) REFERENCES edukator (id),
  CONSTRAINT gaji_infaq_created_by_fk FOREIGN KEY (created_by) REFERENCES users (id)
);
