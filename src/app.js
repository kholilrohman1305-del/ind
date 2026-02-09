const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const rateLimit = require("express-rate-limit");
const sessionConfig = require("./config/session");
const { buildSidebar } = require("./utils/sidebar");
const { ROLES } = require("./config/constants");
require("./config/env");

const authRoutes = require("./routes/auth.routes");
const siswaRoutes = require("./routes/siswa.routes");
const programRoutes = require("./routes/program.routes");
const cabangRoutes = require("./routes/cabang.routes");
const mapelRoutes = require("./routes/mapel.routes");
const edukatorRoutes = require("./routes/edukator.routes");
const jadwalRoutes = require("./routes/jadwal.routes");
const presensiRoutes = require("./routes/presensi.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const tagihanRoutes = require("./routes/tagihan.routes");
const pembayaranRoutes = require("./routes/pembayaran.routes");
const penggajianRoutes = require("./routes/penggajian.routes");
const manajemenRoutes = require("./routes/manajemen.routes");
const pengeluaranRoutes = require("./routes/pengeluaran.routes");
const kasRoutes = require("./routes/kas.routes");
const promoRoutes = require("./routes/promo.routes");
const settingsRoutes = require("./routes/settings.routes");
const laporanRoutes = require("./routes/laporan.routes");
const userManagementRoutes = require("./routes/user-management.routes");
const catatanSiswaRoutes = require("./routes/catatan-siswa.routes");
const pengajuanJadwalRoutes = require("./routes/pengajuan-jadwal.routes");
const rekomendasiRoutes = require("./routes/rekomendasi.routes");
const churnRoutes = require("./routes/churn.routes");
const chatbotRoutes = require("./routes/chatbot.routes");
const publicRoutes = require("./routes/public.routes");
const forecastingRoutes = require("./routes/forecasting.routes");
const analysisRoutes = require("./routes/analysis.routes");
const feedbackRoutes = require("./routes/feedback.routes");

const app = express();
const publicDir = path.join(__dirname, "..", "public");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(sessionConfig);
app.use(express.static(publicDir, { index: false }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.get("/api/csrf-token", (req, res) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  return res.json({ csrfToken: req.session.csrfToken });
});

const csrfProtection = (req, res, next) => {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) return next();

  const csrfExemptPaths = ["/api/auth/login", "/api/auth/register", "/api/public"];
  if (csrfExemptPaths.some((p) => req.path.startsWith(p))) return next();

  const token = req.headers["x-csrf-token"] || req.body?._csrf;
  if (!req.session.csrfToken || token !== req.session.csrfToken) {
    return res.status(403).json({ success: false, message: "Invalid CSRF token." });
  }
  return next();
};

app.use("/api", csrfProtection);

app.use("/api/auth", authRoutes);
app.use("/api/siswa", siswaRoutes);
app.use("/api/program", programRoutes);
app.use("/api/cabang", cabangRoutes);
app.use("/api/mapel", mapelRoutes);
app.use("/api/edukator", edukatorRoutes);
app.use("/api/jadwal", jadwalRoutes);
app.use("/api/presensi", presensiRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/tagihan", tagihanRoutes);
app.use("/api/pembayaran", pembayaranRoutes);
app.use("/api/penggajian", penggajianRoutes);
app.use("/api/manajemen", manajemenRoutes);
app.use("/api/pengeluaran", pengeluaranRoutes);
app.use("/api/kas", kasRoutes);
app.use("/api/promo", promoRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/laporan", laporanRoutes);
app.use("/api/user-management", userManagementRoutes);
app.use("/api/catatan-siswa", catatanSiswaRoutes);
app.use("/api/pengajuan-jadwal", pengajuanJadwalRoutes);
app.use("/api/rekomendasi", rekomendasiRoutes);
app.use("/api/churn", churnRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/forecasting", forecastingRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/feedback", feedbackRoutes);

const pages = [
  "cabang",
  "mapel",
  "siswa",
  "edukator",
  "program",
  "kelas",
  "enrollment",
  "dashboard-super",
  "jadwal",
  "dashboard-siswa",
  "jadwal-siswa",
  "program-siswa",
  "tagihan-siswa",
  "profil-siswa",
  "presensi",
  "presensi-edukator",
  "dashboard-edukator",
  "jadwal-edukator",
  "rekap-presensi-edukator",
  "rincian-gaji-edukator",
  "profil-edukator",
  "tagihan",
  "pembayaran",
  "penggajian",
  "notifikasi",
  "manajemen",
  "pengeluaran",
  "kas",
  "promo",
  "setting",
  "laporan",
  "user-management",
  "pengajuan-jadwal-admin",
  "feedback",
  "analisis-sentimen",
  "analisa-cabang",
  "pemetaan-cabang",
];

const injectSidebar = (html, role, user) => {
  const sidebarHtml = buildSidebar({ role, user });
  let next = html;
  if (html.includes('class="sidebar"')) {
    next = html.replace(/<aside class=\"sidebar[\s\S]*?<\/aside>/, sidebarHtml);
  } else {
    next = html.replace(/<body([^>]*)>/, `<body$1>${sidebarHtml}`);
  }
  if (!next.includes("/css/sidebar.css")) {
    next = next.replace(
      "</head>",
      "  <link rel=\"stylesheet\" href=\"/css/sidebar.css\" />\n</head>"
    );
  }
  if (!next.includes("/js/sidebar.js")) {
    next = next.replace(
      "</body>",
      "  <script src=\"/js/sidebar.js\"></script>\n</body>"
    );
  }
  if (!/data-role=/.test(next)) {
    next = next.replace(/<body([^>]*)>/, `<body$1 data-role=\"${role}\">`);
  }
  if (!next.includes("/js/constants.js")) {
    next = next.replace(
      "</head>",
      "  <script src=\"/js/constants.js\"></script>\n</head>"
    );
  }
  if (!next.includes("/js/api.js")) {
    next = next.replace(
      "</head>",
      "  <script src=\"/js/api.js\"></script>\n</head>"
    );
  }
  return next;
};

const renderPage = (pageFile) => (req, res) => {
  const user = req.session?.user;
  if (!user) {
    res.redirect("/login");
    return;
  }
  const filePath = path.join(publicDir, "pages", `${pageFile}.html`);
  fs.readFile(filePath, "utf8", (err, html) => {
    if (err) {
      res.status(404).send("Halaman tidak ditemukan");
      return;
    }
    const role = user?.role || "guest";
    const output = injectSidebar(html, role, user);
    res.set("Cache-Control", "no-store");
    res.send(output);
  });
};

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "pages", "landing.html"));
});

// Public Landing Page Route
app.get("/landing", (req, res) => {
  res.sendFile(path.join(publicDir, "pages", "landing.html"));
});

// Public Register Page Route
app.get("/register", (req, res) => {
  res.sendFile(path.join(publicDir, "pages", "register.html"));
});

app.get("/dashboard", (req, res) => {
  const user = req.session?.user;
  if (user?.role === ROLES.SUPER_ADMIN) {
    res.redirect("/dashboard-super");
    return;
  }
  renderPage("dashboard")(req, res);
});

pages.forEach((page) => {
  app.get(`/${page}`, renderPage(page));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(publicDir, "login.html"));
});

// Global error handler - always return JSON for API routes
app.use((err, req, res, _next) => {
  if (req.path.startsWith("/api")) {
    const status = err.status || err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Internal server error.",
    });
  }
  res.status(500).send("Internal Server Error");
});

module.exports = app;
