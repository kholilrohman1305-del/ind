const tagihanService = require("../services/tagihan.service");

const list = async (req, res) => {
  try {
    const user = req.session.user;
    let cabangId = null;
    let siswaId = null;

    if (user.role === "admin_cabang") {
      cabangId = user.cabang_id;
    } else if (user.role === "siswa") {
      siswaId = await tagihanService.getSiswaIdByUserId(user.id);
    }

    const month = req.query.month ? Number(req.query.month) : null;
    const year = req.query.year ? Number(req.query.year) : null;
    const data = await tagihanService.listTagihan({ cabangId, siswaId, month, year });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const listEnrollments = async (req, res) => {
  try {
    const cabangId = req.session.user.cabang_id;
    const data = await tagihanService.listEnrollments(cabangId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const cabangId = req.session.user.cabang_id;
    const data = await tagihanService.createTagihan(req.body || {}, cabangId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const cabangId = req.session.user.cabang_id;
    const data = await tagihanService.deleteTagihan(req.params.id, cabangId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  list,
  listEnrollments,
  create,
  remove,
};
