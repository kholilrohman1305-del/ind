CREATE TABLE feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    program_id INT,
    edukator_id INT,
    jenis_feedback ENUM('program', 'edukator', 'umum', 'testimonial') DEFAULT 'umum',
    rating INT CHECK (rating >= 1 AND rating <= 5),
    komentar TEXT,
    aspek_penilaian JSON, -- untuk menyimpan penilaian berbagai aspek
    hasil_sentimen ENUM('positif', 'negatif', 'netral') DEFAULT 'netral',
    confidence_score DECIMAL(5,4), -- skor kepercayaan hasil analisis
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (program_id) REFERENCES program(id),
    FOREIGN KEY (edukator_id) REFERENCES edukator(id)
);

CREATE INDEX idx_feedback_user ON feedback(user_id);
CREATE INDEX idx_feedback_program ON feedback(program_id);
CREATE INDEX idx_feedback_edukator ON feedback(edukator_id);
CREATE INDEX idx_feedback_sentimen ON feedback(hasil_sentimen);
CREATE INDEX idx_feedback_created_at ON feedback(created_at);