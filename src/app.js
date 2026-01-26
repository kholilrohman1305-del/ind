const express = require("express");
const fs = require("fs");
const path = require("path");
const sessionConfig = require("./config/session");
const { buildSidebar } = require("./utils/sidebar");
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

const app = express();
const publicDir = path.join(__dirname, "..", "public");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(sessionConfig);
app.use(express.static(publicDir, { index: false }));

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
  "presensi",
  "presensi-edukator",
  "dashboard-edukator",
  "jadwal-edukator",
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
  res.sendFile(path.join(publicDir, "login.html"));
});

app.get("/dashboard", (req, res) => {
  const user = req.session?.user;
  if (user?.role === "super_admin") {
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

module.exports = app;
