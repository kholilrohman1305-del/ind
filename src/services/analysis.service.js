const db = require("../db");
const { ENROLLMENT_STATUS } = require("../config/constants");

const getMarketBasketAnalysis = async (cabangId, minSupport = 0, minConfidence = 0, year = null) => {
  // 1. Ambil Data Transaksi (Siswa -> Program)
  const params = [];
  let filter = "";
  if (cabangId) {
    filter += " AND s.cabang_id = ?";
    params.push(cabangId);
  }
  if (year) {
    filter += " AND YEAR(en.tanggal_daftar) = ?";
    params.push(year);
  }

  const [rows] = await db.query(
    `SELECT en.siswa_id, p.id as program_id, p.nama as program_nama
     FROM enrollment en
     JOIN program p ON p.id = en.program_id
     JOIN siswa s ON s.id = en.siswa_id
     WHERE (en.status_enrollment = '${ENROLLMENT_STATUS.AKTIF}' OR en.status_enrollment = '${ENROLLMENT_STATUS.SELESAI}')
     ${filter}
     ORDER BY en.siswa_id`,
    params
  );

  // 2. Grouping per Siswa (Keranjang)
  const transactions = {};
  const programNames = {};
  
  rows.forEach(row => {
    if (!transactions[row.siswa_id]) transactions[row.siswa_id] = [];
    // Hindari duplikat program di satu siswa
    if (!transactions[row.siswa_id].includes(row.program_id)) {
        transactions[row.siswa_id].push(row.program_id);
    }
    programNames[row.program_id] = row.program_nama;
  });

  const baskets = Object.values(transactions).filter(b => b.length > 1);
  const totalBaskets = baskets.length;

  if (totalBaskets === 0) return [];

  // 3. Hitung Frekuensi Item (Support A)
  const itemCounts = {};
  baskets.forEach(basket => {
    basket.forEach(item => {
      itemCounts[item] = (itemCounts[item] || 0) + 1;
    });
  });

  // 4. Hitung Frekuensi Pasangan (Support A & B)
  const pairCounts = {};
  baskets.forEach(basket => {
    for (let i = 0; i < basket.length; i++) {
      for (let j = i + 1; j < basket.length; j++) {
        const itemA = basket[i];
        const itemB = basket[j];
        const pairKey = itemA < itemB ? `${itemA}|${itemB}` : `${itemB}|${itemA}`;
        pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
      }
    }
  });

  // 5. Generate Rules
  const rules = [];
  
  for (const [pair, count] of Object.entries(pairCounts)) {
    const [itemA, itemB] = pair.split('|').map(Number);
    const supportAB = count / totalBaskets;

    if (supportAB < minSupport) continue;

    // Rule: A -> B
    const supportA = itemCounts[itemA] / totalBaskets;
    const confidenceAtoB = supportAB / supportA;
    const liftAtoB = confidenceAtoB / (itemCounts[itemB] / totalBaskets);

    if (confidenceAtoB >= minConfidence) {
      rules.push({
        antecedent: programNames[itemA],
        consequent: programNames[itemB],
        support: (supportAB * 100).toFixed(1),
        confidence: (confidenceAtoB * 100).toFixed(1),
        lift: liftAtoB.toFixed(2),
        count: count,
        desc: `Siswa yang ambil <b>${programNames[itemA]}</b>, ${Math.round(confidenceAtoB * 100)}% juga mengambil <b>${programNames[itemB]}</b>.`
      });
    }

    // Rule: B -> A
    const supportB = itemCounts[itemB] / totalBaskets;
    const confidenceBtoA = supportAB / supportB;
    const liftBtoA = confidenceBtoA / (itemCounts[itemA] / totalBaskets);

    if (confidenceBtoA >= minConfidence) {
      rules.push({
        antecedent: programNames[itemB],
        consequent: programNames[itemA],
        support: (supportAB * 100).toFixed(1),
        confidence: (confidenceBtoA * 100).toFixed(1),
        lift: liftBtoA.toFixed(2),
        count: count,
        desc: `Siswa yang ambil <b>${programNames[itemB]}</b>, ${Math.round(confidenceBtoA * 100)}% juga mengambil <b>${programNames[itemA]}</b>.`
      });
    }
  }

  return rules.sort((a, b) => b.lift - a.lift).slice(0, 10);
};

module.exports = { getMarketBasketAnalysis };