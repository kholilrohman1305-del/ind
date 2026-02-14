(() => {
  const requester = window.api?.request || fetch;
  const unwrapData = (payload) => {
    if (payload && typeof payload === "object" && "data" in payload) return payload.data;
    return payload;
  };

  // --- DOM Elements ---
  const rowsEl = document.getElementById("cabangRows");
  const emptyEl = document.getElementById("cabangEmpty");
  const searchInput = document.getElementById("searchCabang");
  const addButton = document.getElementById("addCabang");
  const totalCabangEl = document.getElementById("totalCabang");
  const activeCabangEl = document.getElementById("activeCabang");
  const totalSiswaEl = document.getElementById("totalSiswa");
  const totalRevenueEl = document.getElementById("totalRevenue");

  // Modal
  const modal = document.getElementById("cabangModal");
  const closeModalBtn = document.getElementById("closeModal");
  const cancelModalBtn = document.getElementById("cancelModal");
  const form = document.getElementById("cabangForm");
  const mapContainer = document.getElementById("cabangMap");
  const useMyLocationBtn = document.getElementById("useMyLocation");

  // Drawer
  const drawerOverlay = document.getElementById("drawerOverlay");
  const drawerPanel = document.getElementById("drawerPanel");
  const drawerClose = document.getElementById("drawerClose");
  const drawerEdit = document.getElementById("drawerEdit");
  const drawerContent = document.getElementById("drawerContent");
  const drawerTitle = document.getElementById("drawerTitle");
  const drawerSubtitle = document.getElementById("drawerSubtitle");
  const drawerAvatar = document.getElementById("drawerAvatar");
  const tabButtons = drawerPanel ? drawerPanel.querySelectorAll(".tab-btn") : [];

  // Fields
  const fields = {
    id: document.getElementById("cabang_id"),
    kode: document.getElementById("cabang_kode"),
    nama: document.getElementById("cabang_nama"),
    telepon: document.getElementById("cabang_telepon"),
    alamat: document.getElementById("cabang_alamat"),
    tempo: document.getElementById("cabang_tempo"),
    active: document.getElementById("cabang_active"),
    email: document.getElementById("admin_email"),
    password: document.getElementById("admin_password"),
    latitude: document.getElementById("cabang_latitude"),
    longitude: document.getElementById("cabang_longitude"),
  };

  const pagerEl = document.getElementById("cabangPager");

  // State
  const state = {
    rows: [],
    searchQuery: "",
    mode: "create",
    page: 1,
    pageSize: 8,
    drawerOpen: false,
    drawerCabangId: null,
    drawerData: null,
    activeTab: "profil",
  };

  let mapInstance = null;
  let markerInstance = null;
  let drawerMapInstance = null;
  let drawerMarkerInstance = null;
  const defaultCenter = [-2.5489, 118.0149];

  // --- Helpers ---
  const formatCurrency = (v) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);

  const formatDate = (d) => {
    if (!d) return "-";
    const date = new Date(d);
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  const stringToHue = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash % 360);
  };

  const getColorFromName = (name) => {
    const hue = stringToHue(name || "Cabang");
    return { bg: `hsl(${hue},85%,96%)`, border: `hsl(${hue},70%,90%)`, icon: `hsl(${hue},70%,50%)`, text: `hsl(${hue},60%,40%)` };
  };

  const getInitials = (name) => {
    const parts = (name || "").split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name || "CB").substring(0, 2).toUpperCase();
  };

  const renderStars = (rating, size = "text-sm") => {
    const val = Number(rating) || 0;
    let html = "";
    for (let i = 1; i <= 5; i++) {
      html += `<i class="fa-solid fa-star ${size} ${i <= Math.round(val) ? "star-filled" : "star-empty"}"></i>`;
    }
    return html;
  };

  // --- Map helpers ---
  const setLatLngFields = (lat, lng) => {
    if (fields.latitude) fields.latitude.value = lat ? Number(lat).toFixed(6) : "";
    if (fields.longitude) fields.longitude.value = lng ? Number(lng).toFixed(6) : "";
  };

  const setMarker = (lat, lng) => {
    if (!mapInstance) return;
    const coords = [lat, lng];
    if (!markerInstance) markerInstance = L.marker(coords).addTo(mapInstance);
    else markerInstance.setLatLng(coords);
    mapInstance.setView(coords, 13, { animate: true });
    setLatLngFields(lat, lng);
  };

  const initMap = () => {
    if (!mapContainer || mapInstance) return;
    mapInstance = L.map(mapContainer).setView(defaultCenter, 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap" }).addTo(mapInstance);
    mapInstance.on("click", (event) => setMarker(event.latlng.lat, event.latlng.lng));
  };

  // --- Filter ---
  const applyFilter = () => {
    const query = state.searchQuery.toLowerCase();
    return state.rows.filter((item) => {
      const nama = (item.nama || "").toLowerCase();
      const kode = (item.kode || "").toLowerCase();
      return nama.includes(query) || kode.includes(query);
    });
  };

  // --- Pager ---
  const renderPager = (totalItems) => {
    if (!pagerEl) return;
    pagerEl.innerHTML = "";
    const totalPages = Math.ceil(totalItems / state.pageSize);
    if (totalPages <= 1) { pagerEl.classList.add("hidden"); return; }
    pagerEl.classList.remove("hidden");

    const wrapper = document.createElement("div");
    wrapper.className = "flex justify-between items-center w-full";
    wrapper.innerHTML = `
      <span class="text-xs text-gray-500 font-medium">Halaman ${state.page} dari ${totalPages} (${totalItems} cabang)</span>
      <div class="flex gap-2">
        <button class="w-8 h-8 flex items-center justify-center rounded-lg border ${state.page === 1 ? "bg-gray-50 text-gray-300 cursor-not-allowed" : "bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"} transition" type="button" data-action="prev" ${state.page === 1 ? "disabled" : ""}>
          <i class="fa-solid fa-chevron-left text-xs"></i>
        </button>
        <button class="w-8 h-8 flex items-center justify-center rounded-lg border ${state.page === totalPages ? "bg-gray-50 text-gray-300 cursor-not-allowed" : "bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"} transition" type="button" data-action="next" ${state.page === totalPages ? "disabled" : ""}>
          <i class="fa-solid fa-chevron-right text-xs"></i>
        </button>
      </div>`;
    wrapper.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (btn.disabled) return;
        if (btn.dataset.action === "prev") state.page--;
        if (btn.dataset.action === "next") state.page++;
        render();
      });
    });
    pagerEl.appendChild(wrapper);
  };

  // --- Render Card Grid ---
  const render = () => {
    if (!rowsEl) return;
    rowsEl.innerHTML = "";
    const filteredData = applyFilter();

    if (totalCabangEl) totalCabangEl.textContent = state.rows.length;
    if (activeCabangEl) activeCabangEl.textContent = state.rows.filter((r) => r.is_active).length;

    if (!filteredData.length) {
      if (emptyEl) emptyEl.classList.remove("hidden");
      if (pagerEl) pagerEl.classList.add("hidden");
      return;
    }
    if (emptyEl) emptyEl.classList.add("hidden");

    const totalPages = Math.ceil(filteredData.length / state.pageSize);
    if (state.page > totalPages) state.page = Math.max(1, totalPages);
    const start = (state.page - 1) * state.pageSize;
    const pageData = filteredData.slice(start, start + state.pageSize);

    pageData.forEach((item) => {
      const colors = getColorFromName(item.nama);
      const initials = getInitials(item.nama);
      const card = document.createElement("div");
      card.className = "cabang-card group flex flex-col h-full";

      const statusBadge = item.is_active
        ? '<span class="status-active text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">Aktif</span>'
        : '<span class="status-inactive text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">Nonaktif</span>';

      card.innerHTML = `
        <div class="p-5 flex-1 relative" data-action="detail" data-id="${item.id}">
            <div class="absolute top-4 right-4">${statusBadge}</div>
            <div class="flex items-center gap-4 mb-4">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm transition-transform group-hover:scale-110 duration-300"
                     style="background-color:${colors.bg};color:${colors.icon};border:1px solid ${colors.border};">
                    ${initials}
                </div>
                <div>
                    <span class="block text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-1.5 rounded inline-block mb-1 border border-slate-100">${item.kode || "N/A"}</span>
                    <h3 class="font-bold text-slate-800 text-lg leading-tight line-clamp-1" title="${item.nama}">${item.nama}</h3>
                </div>
            </div>
            <div class="space-y-2 mt-2">
                <div class="flex items-start gap-2 text-sm text-slate-500">
                    <i class="fa-solid fa-location-dot mt-1 text-slate-400 text-xs w-4 text-center"></i>
                    <span class="line-clamp-2 text-xs leading-relaxed">${item.alamat || "Alamat belum diisi"}</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-slate-500">
                    <i class="fa-solid fa-phone text-slate-400 text-xs w-4 text-center"></i>
                    <span class="text-xs font-mono">${item.telepon || "-"}</span>
                </div>
            </div>
        </div>
        <div class="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center opacity-80 group-hover:opacity-100 transition-opacity">
            <button class="text-xs font-bold text-indigo-500 hover:text-indigo-700 transition flex items-center gap-1" data-action="detail" data-id="${item.id}">
                <i class="fa-solid fa-chart-pie"></i> Lihat Detail
            </button>
            <div class="flex gap-2">
                <button class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center transition shadow-sm"
                        data-action="edit" data-id="${item.id}" title="Edit">
                    <i class="fa-regular fa-pen-to-square text-xs"></i>
                </button>
                <button class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200 flex items-center justify-center transition shadow-sm"
                        data-action="toggle" data-id="${item.id}" title="${item.is_active ? "Nonaktifkan" : "Aktifkan"}">
                    <i class="fa-solid fa-power-off text-xs"></i>
                </button>
                <button class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center transition shadow-sm"
                        data-action="delete" data-id="${item.id}" title="Hapus">
                    <i class="fa-regular fa-trash-can text-xs"></i>
                </button>
            </div>
        </div>`;
      rowsEl.appendChild(card);
    });
    renderPager(filteredData.length);
  };

  // =============================================
  // DRAWER - Detail Cabang
  // =============================================
  const openDrawer = async (cabangId) => {
    if (!drawerPanel || !drawerOverlay) return;
    state.drawerCabangId = cabangId;
    state.activeTab = "profil";

    // Reset tabs
    tabButtons.forEach((b) => b.classList.remove("active"));
    const firstTab = drawerPanel.querySelector('[data-tab="profil"]');
    if (firstTab) firstTab.classList.add("active");

    // Show drawer
    drawerOverlay.classList.remove("hidden");
    drawerPanel.classList.add("open");
    state.drawerOpen = true;

    // Set header from local data
    const local = state.rows.find((r) => String(r.id) === String(cabangId));
    if (local) {
      const colors = getColorFromName(local.nama);
      if (drawerTitle) drawerTitle.textContent = local.nama;
      if (drawerSubtitle) drawerSubtitle.textContent = local.kode || "";
      if (drawerAvatar) {
        drawerAvatar.textContent = getInitials(local.nama);
        drawerAvatar.style.backgroundColor = colors.bg;
        drawerAvatar.style.color = colors.icon;
        drawerAvatar.style.border = `1px solid ${colors.border}`;
      }
    }

    // Show loading
    if (drawerContent) {
      drawerContent.innerHTML = '<div class="flex items-center justify-center py-20"><div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>';
    }

    // Fetch detail
    try {
      const res = await requester(`/api/cabang/${cabangId}/detail`, { credentials: "same-origin" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Gagal memuat detail.");
      state.drawerData = json.data;
      renderActiveTab();
    } catch (err) {
      if (drawerContent) {
        drawerContent.innerHTML = `<div class="flex flex-col items-center justify-center py-20 text-center">
          <i class="fa-solid fa-circle-exclamation text-3xl text-rose-300 mb-3"></i>
          <p class="text-sm text-slate-500">${err.message}</p>
        </div>`;
      }
    }
  };

  const closeDrawer = () => {
    if (drawerPanel) drawerPanel.classList.remove("open");
    setTimeout(() => {
      if (drawerOverlay) drawerOverlay.classList.add("hidden");
    }, 350);
    state.drawerOpen = false;
    state.drawerData = null;
    drawerMapInstance = null;
    drawerMarkerInstance = null;
  };

  const renderActiveTab = () => {
    if (!state.drawerData || !drawerContent) return;
    const d = state.drawerData;
    switch (state.activeTab) {
      case "profil": renderProfilTab(d); break;
      case "statistik": renderStatistikTab(d); break;
      case "keuangan": renderKeuanganTab(d); break;
      case "feedback": renderFeedbackTab(d); break;
    }
  };

  // --- Tab: Profil ---
  const renderProfilTab = (d) => {
    const c = d.cabang;
    const statusHtml = c.is_active
      ? '<span class="status-active text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Aktif</span>'
      : '<span class="status-inactive text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">Nonaktif</span>';

    const manajemenList = d.manajemen || [];
    const manajemenHtml = manajemenList.length > 0 ? `
      <div class="mt-6">
        <h4 class="text-sm font-bold text-slate-700 mb-3"><i class="fa-solid fa-sitemap text-indigo-500 mr-1"></i> Struktur Manajemen</h4>
        <div class="space-y-3">
          ${manajemenList.map(m => `
            <div class="bg-white border border-slate-200 rounded-xl p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-bold text-indigo-700">${m.jabatan}</span>
                <span class="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">+${formatCurrency(m.gaji_tambahan)}</span>
              </div>
              ${m.edukators.length > 0 ? `
                <div class="space-y-2">
                  ${m.edukators.map(e => `
                    <div class="flex items-center gap-3 bg-slate-50 rounded-lg p-2">
                      <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        ${e.foto ? `<img src="${e.foto}" class="w-8 h-8 object-cover rounded-full" alt="">` : `<i class="fa-solid fa-user text-indigo-400 text-xs"></i>`}
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-slate-700 truncate">${e.nama}</p>
                        <p class="text-[10px] text-slate-400">${e.pendidikan_terakhir || "-"}</p>
                      </div>
                    </div>
                  `).join("")}
                </div>
              ` : '<p class="text-xs text-slate-400 italic">Belum ada edukator yang ditugaskan</p>'}
            </div>
          `).join("")}
        </div>
      </div>` : '<div class="mt-6"><p class="text-xs text-slate-400 italic">Belum ada data manajemen</p></div>';

    drawerContent.innerHTML = `
      <div class="space-y-5">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-bold text-slate-700">Informasi Cabang</h4>
          ${statusHtml}
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-slate-50 p-3 rounded-xl">
            <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Kode</p>
            <p class="text-sm font-bold font-mono text-slate-700">${c.kode || "-"}</p>
          </div>
          <div class="bg-slate-50 p-3 rounded-xl">
            <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Telepon</p>
            <p class="text-sm font-mono text-slate-700">${c.telepon || "-"}</p>
          </div>
          <div class="col-span-2 bg-slate-50 p-3 rounded-xl">
            <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Alamat</p>
            <p class="text-sm text-slate-700">${c.alamat || "Belum diisi"}</p>
          </div>
          <div class="bg-slate-50 p-3 rounded-xl">
            <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Tgl Jatuh Tempo</p>
            <p class="text-sm font-bold text-slate-700">Tanggal ${c.tanggal_jatuh_tempo || 10}</p>
          </div>
          <div class="bg-slate-50 p-3 rounded-xl">
            <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Dibuat</p>
            <p class="text-sm text-slate-700">${formatDate(c.created_at)}</p>
          </div>
        </div>
        ${c.latitude && c.longitude ? '<div id="drawerMapWrap"><h4 class="text-sm font-bold text-slate-700 mb-2 mt-2">Lokasi</h4><div id="drawerMap"></div></div>' : ""}
        ${manajemenHtml}
      </div>`;

    if (c.latitude && c.longitude) {
      setTimeout(() => {
        const mapEl = document.getElementById("drawerMap");
        if (!mapEl) return;
        drawerMapInstance = L.map(mapEl, { scrollWheelZoom: false, dragging: false, zoomControl: false }).setView([c.latitude, c.longitude], 14);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OSM" }).addTo(drawerMapInstance);
        drawerMarkerInstance = L.marker([c.latitude, c.longitude]).addTo(drawerMapInstance);
      }, 100);
    }
  };

  // --- Tab: Statistik ---
  const renderStatistikTab = (d) => {
    const s = d.statistik;
    const selisihColor = s.selisih >= 0 ? "text-emerald-600" : "text-rose-600";
    const selisihIcon = s.selisih >= 0 ? "fa-arrow-trend-up" : "fa-arrow-trend-down";

    drawerContent.innerHTML = `
      <div class="space-y-4">
        <h4 class="text-sm font-bold text-slate-700">Statistik Bulan Ini</h4>
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div class="flex items-center gap-2 mb-1"><i class="fa-solid fa-users text-blue-500 text-xs"></i><span class="text-[10px] font-bold text-blue-400 uppercase">Total Siswa</span></div>
            <p class="text-2xl font-bold text-blue-700">${s.total_siswa}</p>
          </div>
          <div class="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
            <div class="flex items-center gap-2 mb-1"><i class="fa-solid fa-user-check text-emerald-500 text-xs"></i><span class="text-[10px] font-bold text-emerald-400 uppercase">Siswa Aktif</span></div>
            <p class="text-2xl font-bold text-emerald-700">${s.siswa_aktif}</p>
          </div>
          <div class="bg-purple-50 p-4 rounded-xl border border-purple-100">
            <div class="flex items-center gap-2 mb-1"><i class="fa-solid fa-user-plus text-purple-500 text-xs"></i><span class="text-[10px] font-bold text-purple-400 uppercase">Siswa Baru</span></div>
            <p class="text-2xl font-bold text-purple-700">${s.siswa_baru}</p>
          </div>
          <div class="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <div class="flex items-center gap-2 mb-1"><i class="fa-solid fa-chalkboard-user text-indigo-500 text-xs"></i><span class="text-[10px] font-bold text-indigo-400 uppercase">Edukator</span></div>
            <p class="text-2xl font-bold text-indigo-700">${s.total_edukator}</p>
          </div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200">
          <h5 class="text-xs font-bold text-slate-500 uppercase mb-3">Keuangan Bulan Ini</h5>
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-sm text-slate-600"><i class="fa-solid fa-arrow-down text-emerald-500 mr-2"></i>Pendapatan</span>
              <span class="text-sm font-bold text-emerald-600">${formatCurrency(s.pendapatan)}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-slate-600"><i class="fa-solid fa-arrow-up text-rose-500 mr-2"></i>Pengeluaran</span>
              <span class="text-sm font-bold text-rose-600">${formatCurrency(s.pengeluaran)}</span>
            </div>
            <div class="border-t border-slate-100 pt-3 flex justify-between items-center">
              <span class="text-sm font-bold text-slate-700"><i class="fa-solid ${selisihIcon} ${selisihColor} mr-2"></i>Selisih</span>
              <span class="text-sm font-bold ${selisihColor}">${formatCurrency(s.selisih)}</span>
            </div>
          </div>
        </div>
      </div>`;
  };

  // --- Tab: Keuangan ---
  const renderKeuanganTab = (d) => {
    const k = d.keuangan;
    const summary = k.summary || {};
    const entries = k.entries || [];

    drawerContent.innerHTML = `
      <div class="space-y-4">
        <h4 class="text-sm font-bold text-slate-700">Ringkasan Kas Bulan Ini</h4>
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-slate-50 p-3 rounded-xl">
            <p class="text-[10px] font-bold text-slate-400 uppercase">Saldo Awal</p>
            <p class="text-lg font-bold text-slate-700">${formatCurrency(summary.saldo_awal)}</p>
          </div>
          <div class="bg-slate-50 p-3 rounded-xl">
            <p class="text-[10px] font-bold text-slate-400 uppercase">Saldo Akhir</p>
            <p class="text-lg font-bold text-slate-700">${formatCurrency(summary.saldo_akhir)}</p>
          </div>
          <div class="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
            <p class="text-[10px] font-bold text-emerald-400 uppercase">Pemasukan</p>
            <p class="text-lg font-bold text-emerald-600">${formatCurrency(summary.pemasukan)}</p>
          </div>
          <div class="bg-rose-50 p-3 rounded-xl border border-rose-100">
            <p class="text-[10px] font-bold text-rose-400 uppercase">Pengeluaran</p>
            <p class="text-lg font-bold text-rose-600">${formatCurrency(summary.pengeluaran)}</p>
          </div>
        </div>

        <div>
          <h5 class="text-xs font-bold text-slate-500 uppercase mb-3">Transaksi Terakhir</h5>
          ${entries.length === 0
            ? '<p class="text-sm text-slate-400 text-center py-6">Belum ada transaksi bulan ini.</p>'
            : `<div class="space-y-2">${entries.map((e) => {
                const isPemasukan = e.tipe === "pemasukan";
                return `
                  <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg ${isPemasukan ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"} flex items-center justify-center text-xs">
                        <i class="fa-solid ${isPemasukan ? "fa-arrow-down" : "fa-arrow-up"}"></i>
                      </div>
                      <div>
                        <p class="text-xs font-bold text-slate-700">${e.kategori}</p>
                        <p class="text-[10px] text-slate-400">${e.deskripsi || "-"}</p>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class="text-xs font-bold ${isPemasukan ? "text-emerald-600" : "text-rose-600"}">${isPemasukan ? "+" : "-"}${formatCurrency(e.nominal)}</p>
                      <p class="text-[10px] text-slate-400">${formatDate(e.tanggal)}</p>
                    </div>
                  </div>`;
              }).join("")}</div>`}
        </div>
      </div>`;
  };

  // --- Tab: Feedback ---
  const renderFeedbackTab = (d) => {
    const fb = d.feedback;
    const stats = fb.stats || {};
    const recent = fb.recent || [];
    const avgRating = Number(stats.avg_rating || 0).toFixed(1);
    const total = Number(stats.total_feedback || 0);
    const positif = Number(stats.positif_count || 0);
    const negatif = Number(stats.negatif_count || 0);
    const netral = Number(stats.netral_count || 0);

    drawerContent.innerHTML = `
      <div class="space-y-4">
        <h4 class="text-sm font-bold text-slate-700">Feedback & Rating</h4>

        ${total === 0
          ? '<div class="text-center py-10"><i class="fa-solid fa-comment-slash text-3xl text-slate-200 mb-3"></i><p class="text-sm text-slate-400">Belum ada feedback untuk cabang ini.</p></div>'
          : `
        <!-- Rating Overview -->
        <div class="bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-xl border border-amber-100">
          <div class="flex items-center gap-4">
            <div class="text-center">
              <p class="text-4xl font-black text-amber-600">${avgRating}</p>
              <div class="flex gap-0.5 mt-1">${renderStars(avgRating, "text-xs")}</div>
              <p class="text-[10px] text-slate-400 mt-1">${total} review</p>
            </div>
            <div class="flex-1 space-y-1.5 ml-4">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-emerald-600 w-14">Positif</span>
                <div class="flex-1 h-2 bg-white rounded-full overflow-hidden"><div class="h-full bg-emerald-400 rounded-full" style="width:${total ? (positif / total) * 100 : 0}%"></div></div>
                <span class="text-[10px] font-bold text-slate-500 w-6 text-right">${positif}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-slate-400 w-14">Netral</span>
                <div class="flex-1 h-2 bg-white rounded-full overflow-hidden"><div class="h-full bg-slate-300 rounded-full" style="width:${total ? (netral / total) * 100 : 0}%"></div></div>
                <span class="text-[10px] font-bold text-slate-500 w-6 text-right">${netral}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-rose-500 w-14">Negatif</span>
                <div class="flex-1 h-2 bg-white rounded-full overflow-hidden"><div class="h-full bg-rose-400 rounded-full" style="width:${total ? (negatif / total) * 100 : 0}%"></div></div>
                <span class="text-[10px] font-bold text-slate-500 w-6 text-right">${negatif}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Aspek Penilaian -->
        <div class="grid grid-cols-2 gap-3">
          ${["materi", "edukator", "fasilitas", "pelayanan"].map((key) => {
            const val = Number(stats[key + "_avg"] || 0);
            const icons = { materi: "fa-book", edukator: "fa-chalkboard-user", fasilitas: "fa-building", pelayanan: "fa-headset" };
            return `
              <div class="bg-slate-50 p-3 rounded-xl text-center">
                <i class="fa-solid ${icons[key]} text-slate-400 text-sm mb-1"></i>
                <p class="text-[10px] font-bold text-slate-400 uppercase">${key}</p>
                <div class="flex gap-0.5 justify-center mt-1">${renderStars(val, "text-[10px]")}</div>
                <p class="text-xs font-bold text-slate-700 mt-1">${val.toFixed(1)}</p>
              </div>`;
          }).join("")}
        </div>

        <!-- Recent Reviews -->
        <div>
          <h5 class="text-xs font-bold text-slate-500 uppercase mb-3">Review Terbaru</h5>
          ${recent.length === 0
            ? '<p class="text-sm text-slate-400 text-center py-4">Tidak ada review terbaru.</p>'
            : `<div class="space-y-3">${recent.map((r) => {
                const sentimentColor = r.hasil_sentimen === "positif" ? "bg-emerald-100 text-emerald-600" : r.hasil_sentimen === "negatif" ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500";
                return `
                  <div class="p-3 bg-slate-50 rounded-xl">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-bold text-slate-700">${r.user_nama || "Anonim"}</span>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${sentimentColor}">${r.hasil_sentimen || "netral"}</span>
                    </div>
                    <div class="flex gap-0.5 mb-1">${renderStars(r.rating, "text-[10px]")}</div>
                    ${r.komentar ? `<p class="text-xs text-slate-500 leading-relaxed">${r.komentar}</p>` : ""}
                    <p class="text-[10px] text-slate-400 mt-1">${r.program_nama ? r.program_nama + " &middot; " : ""}${formatDate(r.created_at)}</p>
                  </div>`;
              }).join("")}</div>`}
        </div>`}
      </div>`;
  };

  // --- Drawer Events ---
  if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener("click", closeDrawer);
  if (drawerEdit) {
    drawerEdit.addEventListener("click", () => {
      const cabang = state.rows.find((r) => String(r.id) === String(state.drawerCabangId));
      if (cabang) { closeDrawer(); setTimeout(() => openModal("edit", cabang), 400); }
    });
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeTab = btn.dataset.tab;
      renderActiveTab();
    });
  });

  // =============================================
  // API & CRUD
  // =============================================
  const fetchCabang = async () => {
    try {
      const res = await requester("/api/cabang", { credentials: "same-origin" });
      if (!res.ok) { state.rows = []; }
      else {
        const payload = await res.json();
        const data = unwrapData(payload);
        state.rows = Array.isArray(data) ? data : [];
      }
      render();
    } catch (err) {
      console.error(err);
      state.rows = [];
      render();
    }
  };

  // Fetch summary stats (total siswa, revenue) from analytics
  const fetchSummaryStats = async () => {
    try {
      const now = new Date();
      const res = await requester(`/api/dashboard/cabang-analytics?year=${now.getFullYear()}&month=${now.getMonth() + 1}`, { credentials: "same-origin" });
      if (res.ok) {
        const json = await res.json();
        const d = json.data || json;
        const summary = d.summary || d;
        if (totalSiswaEl) totalSiswaEl.textContent = summary.total_siswa || 0;
        if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(summary.pendapatan || 0);
      }
    } catch (_) { /* silent */ }
  };

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      state.page = 1;
      render();
    });
  }

  // --- Modal Logic ---
  const openModal = (mode, data) => {
    if (!modal || !form) return;
    state.mode = mode;
    form.reset();

    fields.id.value = data?.id || "";
    fields.kode.value = data?.kode || "";
    fields.nama.value = data?.nama || "";
    fields.telepon.value = data?.telepon || "";
    fields.alamat.value = data?.alamat || "";
    fields.tempo.value = data?.tanggal_jatuh_tempo || "";
    fields.active.checked = mode === "create" ? true : data?.is_active !== false;
    setLatLngFields(data?.latitude || "", data?.longitude || "");
    fields.email.value = data?.admin_email || "";
    fields.password.value = "";

    const titleEl = modal.querySelector(".modal-title");
    if (titleEl) titleEl.textContent = mode === "create" ? "Tambah Cabang Baru" : "Edit Data Cabang";

    modal.classList.remove("hidden", "pointer-events-none", "opacity-0");
    const card = modal.querySelector(".modal-card");
    if (card) { card.classList.remove("scale-95"); card.classList.add("scale-100"); }

    initMap();
    setTimeout(() => {
      if (mapInstance) mapInstance.invalidateSize();
      const lat = Number(data?.latitude);
      const lng = Number(data?.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) setMarker(lat, lng);
      else if (mapInstance) mapInstance.setView(defaultCenter, 5);
    }, 120);
  };

  const closeModal_ = () => {
    if (!modal) return;
    const card = modal.querySelector(".modal-card");
    if (card) { card.classList.add("scale-95"); card.classList.remove("scale-100"); }
    setTimeout(() => modal.classList.add("hidden", "pointer-events-none", "opacity-0"), 150);
  };

  const createPayload = () => ({
    kode: fields.kode.value.trim(),
    nama: fields.nama.value.trim(),
    telepon: fields.telepon.value.trim(),
    alamat: fields.alamat.value.trim(),
    latitude: fields.latitude.value ? Number(fields.latitude.value) : null,
    longitude: fields.longitude.value ? Number(fields.longitude.value) : null,
    tanggal_jatuh_tempo: fields.tempo.value || 10,
    is_active: fields.active.checked,
    admin_email: fields.email.value.trim(),
    admin_password: fields.password.value,
  });

  const saveCabang = async (payload, id) => {
    const url = id ? `/api/cabang/${id}` : "/api/cabang";
    const method = id ? "PUT" : "POST";
    const res = await requester(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Gagal menyimpan data.");
  };

  const deleteCabang = async (id) => {
    const res = await requester(`/api/cabang/${id}`, { method: "DELETE", credentials: "same-origin" });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Gagal menghapus data.");
  };

  // --- Event Listeners ---
  if (addButton) addButton.addEventListener("click", () => openModal("create"));
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal_);
  if (cancelModalBtn) cancelModalBtn.addEventListener("click", closeModal_);
  if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) closeModal_(); });

  if (useMyLocationBtn) {
    useMyLocationBtn.addEventListener("click", () => {
      if (!navigator.geolocation) { if (window.toast?.error) window.toast.error("Lokasi", "Browser tidak mendukung lokasi."); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => setMarker(pos.coords.latitude, pos.coords.longitude),
        () => { if (window.toast?.error) window.toast.error("Lokasi", "Izin lokasi ditolak."); }
      );
    });
  }

  // Card Actions (delegation)
  if (rowsEl) {
    rowsEl.addEventListener("click", async (event) => {
      const target = event.target.closest("[data-action]");
      if (!target) return;

      const action = target.getAttribute("data-action");
      const id = target.getAttribute("data-id");
      if (!action || !id) return;

      if (action === "detail") {
        openDrawer(id);
        return;
      }

      const cabang = state.rows.find((row) => String(row.id) === String(id));
      if (!cabang) return;

      if (action === "edit") openModal("edit", cabang);

      if (action === "toggle") {
        try {
          await saveCabang({ is_active: !cabang.is_active }, id);
          if (window.toast?.success) window.toast.success("Status diperbarui", cabang.nama);
          fetchCabang();
        } catch (err) {
          if (window.toast?.error) window.toast.error("Gagal", err.message);
        }
      }

      if (action === "delete") {
        if (!confirm(`Hapus cabang "${cabang.nama}"? Data tidak bisa dikembalikan.`)) return;
        try {
          await deleteCabang(id);
          if (window.toast?.success) window.toast.success("Terhapus", "Cabang berhasil dihapus");
          fetchCabang();
        } catch (err) {
          if (window.toast?.error) window.toast.error("Gagal", err.message);
        }
      }
    });
  }

  // Form Submit
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
      submitBtn.disabled = true;

      try {
        const payload = createPayload();
        if (!payload.kode || !payload.nama) { alert("Kode dan Nama wajib diisi"); return; }
        await saveCabang(payload, fields.id.value || null);
        if (window.toast?.success) window.toast.success(state.mode === "edit" ? "Berhasil Diperbarui" : "Berhasil Ditambahkan", payload.nama);
        closeModal_();
        fetchCabang();
      } catch (err) {
        if (window.toast?.error) window.toast.error("Error", err.message);
        else alert(err.message);
      } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // Init
  fetchCabang();
  fetchSummaryStats();
})();
