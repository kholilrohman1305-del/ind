const tagihanService = require("../services/tagihan.service");
const { ROLES } = require("../config/constants");
const { parsePagination, paginatedResponse } = require("../utils/pagination");

const list = async (req, res) => {
  try {
    const user = req.session.user;
    let cabangId = null;
    let siswaId = null;

    if (user.role === ROLES.ADMIN_CABANG) {
      cabangId = user.cabang_id;
    } else if (user.role === ROLES.SISWA) {
      siswaId = await tagihanService.getSiswaIdByUserId(user.id);
    }

    const month = req.query.month ? Number(req.query.month) : null;
    const year = req.query.year ? Number(req.query.year) : null;
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, total } = await tagihanService.listTagihan({ cabangId, siswaId, month, year }, { limit, offset });
    res.json(paginatedResponse(rows, total, { page, limit }));
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
