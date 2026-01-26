const laporanService = require("../services/laporan.service");

const keuangan = async (req, res) => {
  try {
    const user = req.session?.user;
    const cabangId = user?.cabang_id;
    if (!cabangId) {
      return res
        .status(400)
        .json({ success: false, message: "Cabang tidak ditemukan." });
    }

    const mode = (req.query.mode || "month").toLowerCase();
    const now = new Date();
    const year = Number(req.query.year || now.getFullYear());
    const month = Number(req.query.month || now.getMonth() + 1);

    const data =
      mode === "year"
        ? await laporanService.getKeuanganTahunan({ cabangId, year })
        : await laporanService.getKeuanganBulanan({ cabangId, year, month });

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const lanjutan = async (req, res) => {
  try {
    const user = req.session?.user;
    const cabangId = user?.cabang_id;
    if (!cabangId) {
      return res
        .status(400)
        .json({ success: false, message: "Cabang tidak ditemukan." });
    }
    const now = new Date();
    const year = Number(req.query.year || now.getFullYear());
    const month = Number(req.query.month || now.getMonth() + 1);
    const data = await laporanService.getLanjutanSummary({ cabangId, year, month });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  keuangan,
  lanjutan,
};
