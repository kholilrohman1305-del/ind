const bannerService = require("../services/banner.service");

const getAll = async (req, res) => {
  try {
    const data = await bannerService.listBanners();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    if (!req.file?.savedPath) {
      return res.status(400).json({ success: false, message: "Gambar wajib diupload." });
    }
    const payload = {
      gambar: req.file.savedPath,
      judul: req.body.judul,
      link_url: req.body.link_url,
      urutan: req.body.urutan,
      is_active: req.body.is_active,
    };
    const result = await bannerService.createBanner(payload);
    res.json({ success: true, data: result, message: "Banner berhasil ditambahkan." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const existing = await bannerService.getBannerById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Banner tidak ditemukan." });
    }
    const payload = {
      gambar: req.file?.savedPath || undefined,
      judul: req.body.judul,
      link_url: req.body.link_url,
      urutan: req.body.urutan,
      is_active: req.body.is_active,
    };
    await bannerService.updateBanner(req.params.id, payload, existing);
    res.json({ success: true, message: "Banner berhasil diperbarui." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await bannerService.getBannerById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Banner tidak ditemukan." });
    }
    await bannerService.deleteBanner(req.params.id);
    res.json({ success: true, message: "Banner berhasil dihapus." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const reorder = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: "orderedIds harus berupa array." });
    }
    await bannerService.reorderBanners(orderedIds);
    res.json({ success: true, message: "Urutan banner berhasil diperbarui." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const toggleActive = async (req, res) => {
  try {
    const existing = await bannerService.getBannerById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Banner tidak ditemukan." });
    }
    await bannerService.updateBanner(req.params.id, { is_active: !existing.is_active }, existing);
    res.json({ success: true, message: `Banner ${existing.is_active ? "dinonaktifkan" : "diaktifkan"}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, create, update, remove, reorder, toggleActive };
