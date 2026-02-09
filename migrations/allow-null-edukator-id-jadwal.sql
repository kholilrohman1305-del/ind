-- Migration: Allow NULL edukator_id in jadwal for pending assignment
-- This enables auto-scheduling even when no educator match is available yet.

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'jadwal'
    AND COLUMN_NAME = 'edukator_id'
);

SET @sql := IF(
  @col_exists > 0,
  'ALTER TABLE jadwal MODIFY COLUMN edukator_id INT NULL',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
