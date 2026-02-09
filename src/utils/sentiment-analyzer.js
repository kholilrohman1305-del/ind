// Kata-kata positif dan negatif dalam bahasa Indonesia
const positiveWords = [
  'bagus', 'baik', 'hebat', 'keren', 'mantap', 'suka', 'senang', 'puas', 'terbaik', 'menarik',
  'menyenangkan', 'efektif', 'bermanfaat', 'membantu', 'memuaskan', 'luar biasa', 'bagus sekali',
  'sangat bagus', 'sangat membantu', 'bagus banget', 'keren banget', 'mantap jiwa', 'asyik',
  'seru', 'asyik banget', 'menyenangkan sekali', 'sangat menarik', 'sangat efektif', 'sangat puas',
  'recommended', 'rekomended', 'top', 'juara', 'the best', 'sangat bagus', 'sangat baik',
  'sangat hebat', 'sangat keren', 'sangat mantap', 'sangat suka', 'sangat senang', 'sangat puas',
  'bagus banget', 'baik banget', 'hebat banget', 'keren banget', 'mantap banget', 'suka banget',
  'senang banget', 'puas banget', 'terbaik banget', 'menarik banget', 'menyenangkan banget',
  'efektif banget', 'bermanfaat banget', 'membantu banget', 'memuaskan banget', 'luar biasa banget'
];

const negativeWords = [
  'jelek', 'buruk', 'tidak bagus', 'tidak baik', 'tidak suka', 'kecewa', 'buruk sekali',
  'tidak memuaskan', 'mengecewakan', 'tidak efektif', 'tidak membantu', 'tidak menarik',
  'tidak menyenangkan', 'tidak recommended', 'jelek banget', 'buruk banget', 'tidak bagus banget',
  'tidak baik banget', 'tidak suka banget', 'kecewa banget', 'tidak memuaskan banget',
  'mengecewakan banget', 'tidak efektif banget', 'tidak membantu banget', 'tidak menarik banget',
  'tidak menyenangkan banget', 'tidak recommended banget', 'rusak', 'error', 'masalah', 'gagal',
  'lama', 'lambat', 'sulit', 'bingung', 'pusing', 'capek', 'lelah', 'bosan', 'jenuh', 'ngantuk',
  'tidak nyaman', 'tidak enak', 'tidak cocok', 'tidak sesuai', 'tidak sesuai ekspektasi'
];

/**
 * Fungsi sederhana untuk menganalisis sentimen teks dalam bahasa Indonesia
 * @param {string} text - Teks yang akan dianalisis
 * @returns {Object} - Hasil analisis sentimen
 */
const analyzeSentiment = async (text) => {
  if (!text || typeof text !== 'string') {
    return { sentiment: 'netral', confidence: 0.5 };
  }

  // Normalisasi teks
  const normalizedText = text.toLowerCase()
    .replace(/[^\w\s]/gi, ' ') // Hapus tanda baca
    .replace(/\s+/g, ' ') // Gabungkan spasi berlebihan
    .trim();

  if (!normalizedText) {
    return { sentiment: 'netral', confidence: 0.5 };
  }

  // Tokenisasi sederhana
  const tokens = normalizedText.split(/\s+/);

  // Hitung kata-kata positif dan negatif
  let positiveCount = 0;
  let negativeCount = 0;

  tokens.forEach(token => {
    if (positiveWords.includes(token)) {
      positiveCount++;
    } else if (negativeWords.includes(token)) {
      negativeCount++;
    }
  });

  // Tentukan sentimen berdasarkan jumlah kata
  let sentiment;
  let confidence = 0.5; // Default confidence

  if (positiveCount > negativeCount) {
    sentiment = 'positif';
    confidence = Math.min(0.95, 0.5 + (positiveCount / (tokens.length || 1)));
  } else if (negativeCount > positiveCount) {
    sentiment = 'negatif';
    confidence = Math.min(0.95, 0.5 + (negativeCount / (tokens.length || 1)));
  } else {
    sentiment = 'netral';
    confidence = 0.5;
  }

  // Batasi confidence antara 0.5 dan 0.95
  confidence = Math.max(0.5, Math.min(0.95, confidence));

  return {
    sentiment: sentiment,
    confidence: parseFloat(confidence.toFixed(4)),
    positiveCount,
    negativeCount,
    totalTokens: tokens.length
  };
};

module.exports = {
  analyzeSentiment
};