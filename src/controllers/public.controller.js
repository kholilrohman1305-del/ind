const publicService = require("../services/public.service");

const getPrograms = async (req, res) => {
  try {
    const data = await publicService.getPublicPrograms();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getOptions = async (req, res) => {
  try {
    const data = await publicService.getRegistrationOptions();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const registerSiswa = async (req, res) => {
  try {
    // Use new registerSiswa from publicService that creates pending siswa
    const result = await publicService.registerSiswa(req.body);
    res.json({
      success: true,
      data: result,
      message: "Pendaftaran berhasil! Akun Anda akan diaktivasi oleh admin cabang."
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const registerEdukator = async (req, res) => {
  try {
    await publicService.registerEdukator(req.body);
    res.json({ success: true, message: "Registrasi berhasil! Akun Anda menunggu persetujuan admin." });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { getPrograms, getOptions, registerSiswa, registerEdukator };