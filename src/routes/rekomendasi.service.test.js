const rekomendasiService = require("../src/services/rekomendasi.service");
const db = require("../src/db");

// Mock database module agar tidak connect ke DB asli
jest.mock("../src/db", () => ({
  query: jest.fn(),
}));

describe("Rekomendasi Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getRecommendations", () => {
    it("should return empty array when no candidates are found", async () => {
      // Mock db.query return kosong untuk kandidat
      // Format return mysql2 promise adalah [rows, fields]
      db.query.mockResolvedValueOnce([[]]);

      const result = await rekomendasiService.getRecommendations({
        cabangId: 1,
        mapelId: 10,
        jenjang: "SMA",
      });

      expect(result).toEqual([]);
      // Pastikan query dipanggil dengan parameter yang benar
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining("SELECT e.id"), [1, 10]);
    });

    it("should calculate scores and sort candidates correctly", async () => {
      // 1. Mock Data Kandidat
      const mockCandidates = [
        {
          id: 101,
          nama: "Budi (Ideal)",
          pendidikan_terakhir: "S1 Matematika",
          latitude: -6.914744,
          longitude: 107.609810, // Lokasi dekat
          current_load: 5,       // Beban rendah (skor tinggi)
        },
        {
          id: 102,
          nama: "Siti (Sibuk & Jauh)",
          pendidikan_terakhir: "Mahasiswa",
          latitude: -6.950000, 
          longitude: 107.650000, // Lokasi agak jauh
          current_load: 18,      // Beban tinggi (skor rendah)
        },
      ];

      // Mock query pertama (ambil kandidat)
      db.query.mockResolvedValueOnce([mockCandidates]);

      // 2. Mock Data History Jenjang (dipanggil di dalam loop map)
      // Call 1: Untuk Budi (Punya pengalaman)
      db.query.mockResolvedValueOnce([[{ count: 10 }]]); 
      // Call 2: Untuk Siti (Belum punya pengalaman)
      db.query.mockResolvedValueOnce([[{ count: 0 }]]); 

      // 3. Jalankan Service
      const result = await rekomendasiService.getRecommendations({
        cabangId: 1,
        mapelId: 5,
        jenjang: "SMA",
        latSiswa: -6.914700, // Koordinat Siswa (Dekat Budi)
        lngSiswa: 107.609800,
      });

      // 4. Assertions (Verifikasi Hasil)
      expect(result).toHaveLength(2);
      
      // Budi harus ranking 1 karena skornya lebih tinggi di semua aspek
      expect(result[0].id).toBe(101);
      expect(result[1].id).toBe(102);

      // Cek Detail Skor Budi
      // Jenjang: 20 (karena count > 0)
      // Pendidikan: 15 (S1)
      expect(result[0].details.jenjang.score).toBe(20);
      expect(result[0].details.education.score).toBe(15);
      
      // Cek Detail Skor Siti
      // Jenjang: 5 (karena count == 0)
      // Pendidikan: 10 (Mahasiswa)
      expect(result[1].details.jenjang.score).toBe(5);
      expect(result[1].details.education.score).toBe(10);

      // Pastikan total skor Budi > Siti
      expect(result[0].total_score).toBeGreaterThan(result[1].total_score);
    });

    it("should handle missing location data gracefully (neutral score)", async () => {
      const mockCandidates = [
        {
          id: 103,
          nama: "Joko Tanpa Lokasi",
          pendidikan_terakhir: "S1",
          latitude: null,
          longitude: null,
          current_load: 10,
        },
      ];

      db.query.mockResolvedValueOnce([mockCandidates]);
      db.query.mockResolvedValueOnce([[{ count: 0 }]]); // History jenjang

      const result = await rekomendasiService.getRecommendations({
        cabangId: 1, mapelId: 5, jenjang: "SD", latSiswa: -6.9, lngSiswa: 107.6,
      });

      expect(result).toHaveLength(1);
      // Skor lokasi harus netral (15) jika data lokasi tidak lengkap
      expect(result[0].details.location.score).toBe(15);
      expect(result[0].details.location.distance).toBe("N/A");
    });
  });
});