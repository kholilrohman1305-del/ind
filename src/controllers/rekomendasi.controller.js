const rekomendasiService = require("../services/rekomendasi.service");

const getEdukatorRecommendations = async (req, res) => {
  try {
    const { cabang_id, mapel_id, jenjang, lat, lng } = req.query;
    
    if (!cabang_id || !mapel_id) {
        return res.status(400).json({ success: false, message: "Parameter cabang_id dan mapel_id wajib diisi." });
    }

    const data = await rekomendasiService.getRecommendations({
        cabangId: cabang_id,
        mapelId: mapel_id,
        jenjang,
        latSiswa: lat ? Number(lat) : null,
        lngSiswa: lng ? Number(lng) : null
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getEdukatorRecommendations };