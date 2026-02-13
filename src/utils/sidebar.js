const fs = require("fs");
const path = require("path");
const { getMenuByRole, resolveHref } = require("../config/menu");

const iconMap = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 10.5 12 3l9 7.5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 10v10h14V10" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cabang: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 10h16" stroke-width="1.5" stroke-linecap="round"/><path d="M6 10V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" stroke-width="1.5" stroke-linecap="round"/><path d="M5 10v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" stroke-width="1.5" stroke-linecap="round"/></svg>',
  mapel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h14a2 2 0 0 1 2 2v10" stroke-width="1.5" stroke-linecap="round"/><path d="M4 6v12a2 2 0 0 0 2 2h12" stroke-width="1.5" stroke-linecap="round"/><path d="M8 10h6" stroke-width="1.5" stroke-linecap="round"/></svg>',
  siswa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="4" stroke-width="1.5"/><path d="M4 20a8 8 0 0 1 16 0" stroke-width="1.5" stroke-linecap="round"/></svg>',
  edukator: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3l9 5-9 5-9-5 9-5z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  program: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16" stroke-width="1.5" stroke-linecap="round"/><path d="M6 6v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" stroke-width="1.5" stroke-linecap="round"/><path d="M9 10h6" stroke-width="1.5" stroke-linecap="round"/></svg>',
  jadwal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="5" width="18" height="16" rx="2" stroke-width="1.5"/><path d="M16 3v4M8 3v4M3 11h18" stroke-width="1.5" stroke-linecap="round"/></svg>',
  presensi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" stroke-width="1.5"/><path d="m9 12 2 2 4-4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  tagihan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 4h12l-1 16-5-3-5 3-1-16z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  manajemen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 10h16" stroke-width="1.5" stroke-linecap="round"/><path d="M6 10v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8" stroke-width="1.5" stroke-linecap="round"/><path d="M9 6h6" stroke-width="1.5" stroke-linecap="round"/></svg>',
  pengeluaran: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7h16" stroke-width="1.5" stroke-linecap="round"/><path d="M6 7v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" stroke-width="1.5" stroke-linecap="round"/><path d="M9 11h6" stroke-width="1.5" stroke-linecap="round"/></svg>',
  penggajian: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="6" width="18" height="12" rx="2" stroke-width="1.5"/><path d="M7 12h10" stroke-width="1.5" stroke-linecap="round"/></svg>',
  kas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="7" width="18" height="12" rx="2" stroke-width="1.5"/><path d="M16 11h4" stroke-width="1.5" stroke-linecap="round"/><path d="M7 11h5" stroke-width="1.5" stroke-linecap="round"/></svg>',
  promo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 10l-8-8-8 8 8 8 8-8z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="2" stroke-width="1.5"/></svg>',
  laporan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19V5" stroke-width="1.5" stroke-linecap="round"/><path d="M10 19V9" stroke-width="1.5" stroke-linecap="round"/><path d="M16 19v-6" stroke-width="1.5" stroke-linecap="round"/><path d="M22 19H2" stroke-width="1.5" stroke-linecap="round"/></svg>',
  "user-management": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 19a4 4 0 0 0-8 0" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="8" r="4" stroke-width="1.5"/><path d="M20 14v6" stroke-width="1.5" stroke-linecap="round"/><path d="M17 17h6" stroke-width="1.5" stroke-linecap="round"/></svg>',
  notifikasi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 17h5l-1.5-1.5A2 2 0 0 1 18 14.1V11a6 6 0 1 0-12 0v3.1c0 .4-.2.8-.5 1.1L4 17h5" stroke-width="1.5" stroke-linecap="round"/><path d="M10 21a2 2 0 0 0 4 0" stroke-width="1.5" stroke-linecap="round"/></svg>',
  setting: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" stroke-width="1.5"/><path d="M19.4 15a1.9 1.9 0 0 0 .4 2.1l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.9 1.9 0 0 0-2.1-.4 1.9 1.9 0 0 0-1.1 1.7V21a2 2 0 0 1-4 0v-.1a1.9 1.9 0 0 0-1.1-1.7 1.9 1.9 0 0 0-2.1.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.9 1.9 0 0 0 .4-2.1 1.9 1.9 0 0 0-1.7-1.1H3a2 2 0 0 1 0-4h.1a1.9 1.9 0 0 0 1.7-1.1 1.9 1.9 0 0 0-.4-2.1l-.1-.1A2 2 0 1 1 7.1 3l.1.1a1.9 1.9 0 0 0 2.1.4 1.9 1.9 0 0 0 1.1-1.7V1a2 2 0 0 1 4 0v.1a1.9 1.9 0 0 0 1.1 1.7 1.9 1.9 0 0 0 2.1-.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.9 1.9 0 0 0-.4 2.1 1.9 1.9 0 0 0 1.7 1.1H21a2 2 0 0 1 0 4h-.1a1.9 1.9 0 0 0-1.7 1.1z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  "rekap-kehadiran": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="5" width="18" height="16" rx="2" stroke-width="1.5"/><path d="M16 3v4M8 3v4M3 11h18" stroke-width="1.5" stroke-linecap="round"/><path d="m9 15 2 2 4-4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  "pengajuan-jadwal": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="5" width="18" height="16" rx="2" stroke-width="1.5"/><path d="M16 3v4M8 3v4M3 11h18" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="15" r="2" stroke-width="1.5"/><path d="m14 15 3 3" stroke-width="1.5" stroke-linecap="round"/></svg>',
  "rincian-gaji": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="6" width="18" height="12" rx="2" stroke-width="1.5"/><path d="M7 12h10" stroke-width="1.5" stroke-linecap="round"/><path d="M12 9v6" stroke-width="1.5" stroke-linecap="round"/></svg>',
  profil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="4" stroke-width="1.5"/><path d="M4 21a8 8 0 0 1 16 0" stroke-width="1.5" stroke-linecap="round"/></svg>',
  feedback: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  "analisis-sentimen": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-width="1.5" stroke-linecap="round"/><path d="M22 4 12 14.01l-3-3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  "analisa-cabang": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3v18h18" stroke-width="1.5" stroke-linecap="round"/><path d="M7 15l3-3 3 2 4-5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  "pemetaan-cabang": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 21s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z" stroke-width="1.5"/><circle cx="12" cy="9" r="2.5" stroke-width="1.5"/></svg>',
  "banner-management": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="4" width="20" height="16" rx="2" stroke-width="1.5"/><path d="M2 8h20" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="14" r="2" stroke-width="1.5"/><path d="M14 20l-4-4 8-6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const labelMap = {
  dashboard: "Dashboard",
  cabang: "Cabang",
  mapel: "Mapel",
  siswa: "Siswa",
  edukator: "Edukator",
  program: "Program",
  jadwal: "Jadwal",
  presensi: "Presensi",
  tagihan: "Keuangan",
  manajemen: "Manajemen",
  pengeluaran: "Pengeluaran",
  penggajian: "Penggajian",
  kas: "Kas",
  promo: "Promo",
  laporan: "Laporan",
  "user-management": "Manajemen User",
  notifikasi: "Notifikasi",
  setting: "Setting",
  "rekap-kehadiran": "Rekap Kehadiran",
  "pengajuan-jadwal": "Pengajuan Jadwal",
  "rincian-gaji": "Rincian Gaji",
  profil: "Profil",
  feedback: "Feedback",
  "analisis-sentimen": "Analisis Sentimen",
  "analisa-cabang": "Analisa Cabang",
  "pemetaan-cabang": "Pemetaan Cabang",
  "banner-management": "Banner Landing",
};

const groupOrder = ["general", "akademik", "keuangan", "manajemen", "lainnya"];
const groupLabels = {
  general: "General",
  akademik: "Akademik",
  keuangan: "Keuangan",
  manajemen: "Manajemen",
  lainnya: "Lainnya",
};
const groupMap = {
  dashboard: "general",
  cabang: "manajemen",
  mapel: "akademik",
  siswa: "akademik",
  edukator: "akademik",
  program: "akademik",
  jadwal: "akademik",
  presensi: "akademik",
  kelas: "akademik",
  enrollment: "akademik",
  tagihan: "keuangan",
  pembayaran: "keuangan",
  kas: "keuangan",
  promo: "keuangan",
  penggajian: "keuangan",
  pengeluaran: "keuangan",
  laporan: "keuangan",
  manajemen: "manajemen",
  "user-management": "manajemen",
  notifikasi: "lainnya",
  setting: "manajemen",
  "rekap-kehadiran": "akademik",
  "pengajuan-jadwal": "akademik",
  "rincian-gaji": "keuangan",
  profil: "lainnya",
  feedback: "akademik",
  "analisis-sentimen": "manajemen",
  "analisa-cabang": "manajemen",
  "pemetaan-cabang": "manajemen",
  "banner-management": "manajemen",
};

const roleLabelMap = {
  super_admin: "Super Admin",
  admin_cabang: "Admin Cabang",
  siswa: "Siswa",
  edukator: "Edukator",
};

let cachedTemplate = null;
const getSidebarTemplate = () => {
  if (cachedTemplate) return cachedTemplate;
  const templatePath = path.join(__dirname, "..", "views", "sidebar.html");
  try {
    cachedTemplate = fs.readFileSync(templatePath, "utf8");
  } catch (err) {
    cachedTemplate = "";
  }
  return cachedTemplate;
};

const initials = (value) => {
  if (!value) return "U";
  const base = value.split("@")[0];
  const parts = base.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]).join("").toUpperCase();
};

const buildSidebar = ({ role, user }) => {
  const template = getSidebarTemplate();
  const menuItems = getMenuByRole(role).map((key) => {
    const href = resolveHref(role, key);
    const label = labelMap[key] || key;
    const icon = iconMap[key] || iconMap.dashboard;
    return `
      <a class="nav-link" data-page="${key}" href="${href}">
        <span class="nav-icon">${icon}</span>
        <span class="nav-label">${label}</span>
      </a>`;
  });

  const grouped = getMenuByRole(role).reduce((acc, key) => {
    const group = groupMap[key] || "lainnya";
    if (!acc[group]) acc[group] = [];
    acc[group].push(key);
    return acc;
  }, {});

  const groupedHtml = groupOrder
    .filter((group) => grouped[group] && grouped[group].length)
    .map((group) => {
      const items = grouped[group]
        .map((key) => {
          const href = resolveHref(role, key);
          const label = labelMap[key] || key;
          const icon = iconMap[key] || iconMap.dashboard;
          return `
            <a class="nav-link" data-page="${key}" href="${href}">
              <span class="nav-icon">${icon}</span>
              <span class="nav-label">${label}</span>
            </a>`;
        })
        .join("");
      return `
        <div class="nav-group">
          <div class="nav-group-title">${groupLabels[group]}</div>
          <div class="nav">
            ${items}
          </div>
        </div>
      `;
    })
    .join("");

  const displayRole = roleLabelMap[role] || "Pengguna";
  const displayEmail = user?.email || "user@ilhami.id";
  const brandSub = displayRole;
  const userInitials = initials(displayEmail);

  if (!template) {
    return `
      <aside class="sidebar modern" id="sidebar">
        <div class="brand">
          <div class="brand-logo">IL</div>
          <div class="brand-text">
            <div class="brand-name">ILHAMI</div>
            <div class="brand-sub">${brandSub}</div>
          </div>
        </div>
        <nav class="nav nav-scroll">
          ${groupedHtml}
        </nav>
        <div class="profile-card">
          <div class="profile-main">
            <div class="profile-avatar">${userInitials}</div>
            <div class="profile-info">
              <div class="profile-name">${displayRole}</div>
              <div class="profile-email">${displayEmail}</div>
            </div>
          </div>
          <button class="profile-action" aria-label="Logout">
            <span class="profile-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 3v9" stroke-width="1.6" stroke-linecap="round" />
                <path d="M7 6a8 8 0 1 0 10 0" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </span>
            <span class="profile-action-label">Keluar</span>
          </button>
        </div>
      </aside>`;
  }

  return template
    .replace(/{{menuItems}}/g, groupedHtml)
    .replace(/{{brandSub}}/g, brandSub)
    .replace(/{{displayRole}}/g, displayRole)
    .replace(/{{displayEmail}}/g, displayEmail)
    .replace(/{{initials}}/g, userInitials);
};

module.exports = {
  buildSidebar,
};
