-- Token perangkat untuk login biometrik edukator.
-- Token asli hanya disimpan di perangkat; server hanya menyimpan hash SHA-256.
CREATE TABLE IF NOT EXISTS biometric_tokens (
  id           INT          NOT NULL AUTO_INCREMENT,
  user_id      INT          NOT NULL,
  token_hash   CHAR(64)     NOT NULL,
  device_info  VARCHAR(255) DEFAULT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP    NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY biometric_token_hash_unique (token_hash),
  KEY biometric_tokens_user_idx (user_id),
  CONSTRAINT biometric_tokens_user_fk FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
