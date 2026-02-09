(() => {
  const { TIPE_LES } = window.APP_CONSTANTS;

  const jadwalContainer = document.getElementById("jadwalAktif");
  const jadwalEmpty = document.getElementById("jadwalAktifEmpty");
  const searchInput = document.getElementById("jadwalSearch");
  const siswaNameEl = document.getElementById("siswaNameJadwal");
  const weekDateInput = document.getElementById("jadwalWeekDate");

  let allJadwalRows = [];

  // --- Helpers ---

  const parseDateOnly = (value) => {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const [y, m, d] = raw.slice(0, 10).split("-");
      const parsed = new Date(Number(y), Number(m) - 1, Number(d));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) {
      const [d, m, y] = raw.slice(0, 10).split("/");
      const parsed = new Date(Number(y), Number(m) - 1, Number(d));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatDate = (dateStr) => {
    const date = parseDateOnly(dateStr);
    if (!date) return dateStr || "-";
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "--:--";
    return timeStr.slice(0, 5);
  };

  // Generate color based on subject name
  const getSubjectColor = (name) => {
    const colors = [
      { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100", icon: "bg-blue-500" },
      { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100", icon: "bg-purple-500" },
      { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100", icon: "bg-rose-500" },
      { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100", icon: "bg-amber-500" },
      { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100", icon: "bg-emerald-500" },
      { bg: "bg-cyan-50", text: "text-cyan-600", border: "border-cyan-100", icon: "bg-cyan-500" },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // --- Render Functions ---

  const renderJadwal = (rows) => {
    if (!jadwalContainer) return;
    jadwalContainer.innerHTML = "";
    
    if (!rows.length) {
      if (jadwalEmpty) jadwalEmpty.classList.remove("hidden");
      return;
    }
    if (jadwalEmpty) jadwalEmpty.classList.add("hidden");

    rows.forEach((row) => {
      const card = document.createElement("div");
      
      const isKelas = row.tipe_les === TIPE_LES.KELAS;
      const theme = isKelas 
        ? { badgeBg: "bg-indigo-100", badgeText: "text-indigo-700", icon: "fa-users", border: "border-l-4 border-indigo-500" } 
        : { badgeBg: "bg-orange-100", badgeText: "text-orange-700", icon: "fa-user", border: "border-l-4 border-orange-500" };
      
      const subjectTheme = getSubjectColor(row.mapel_nama || "Mapel");
      const mapelInitial = (row.mapel_nama || "?").substring(0, 2).toUpperCase();

      // Card Design
      card.className = `bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden ${theme.border}`;
      
      card.innerHTML = `
        <div class="absolute -right-6 -top-6 w-24 h-24 ${subjectTheme.bg} rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>

        <div class="flex justify-between items-start mb-4 relative z-10">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl ${subjectTheme.bg} ${subjectTheme.text} flex items-center justify-center text-lg font-bold border ${subjectTheme.border} shadow-sm">
                    ${mapelInitial}
                </div>
                <div>
                    <h3 class="text-lg font-extrabold text-slate-800 leading-tight line-clamp-1" title="${row.mapel_nama}">${row.mapel_nama || "Mapel"}</h3>
                    <p class="text-xs font-semibold text-slate-400 mt-0.5 line-clamp-1">${row.program_nama || "-"}</p>
                </div>
            </div>
        </div>
        
        <div class="space-y-3 relative z-10">
             <div class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-white group-hover:border-slate-200 transition-colors">
                <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                    <i class="fa-regular fa-calendar-days"></i>
                </div>
                <div>
                    <p class="text-[10px] uppercase font-bold text-slate-400">Tanggal</p>
                    <p class="text-sm font-bold text-slate-700">${formatDate(row.tanggal)}</p>
                </div>
             </div>

             <div class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-white group-hover:border-slate-200 transition-colors">
                <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                    <i class="fa-regular fa-clock"></i>
                </div>
                <div>
                    <p class="text-[10px] uppercase font-bold text-slate-400">Waktu</p>
                    <p class="text-sm font-bold text-slate-700">${formatTime(row.jam_mulai)} - ${formatTime(row.jam_selesai)} WIB</p>
                </div>
             </div>
        </div>

        <div class="flex items-center justify-between mt-5 pt-4 border-t border-slate-50 relative z-10">
            <div class="flex items-center gap-2">
                 <div class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">
                    <i class="fa-solid fa-chalkboard-user"></i>
                 </div>
                 <span class="text-xs font-semibold text-slate-500">${row.edukator_nama || "Tentor"}</span>
            </div>
            <span class="text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg ${theme.badgeBg} ${theme.badgeText}">
                 <i class="fa-solid ${theme.icon} mr-1"></i> ${isKelas ? "Kelas" : "Privat"}
            </span>
        </div>
      `;
      jadwalContainer.appendChild(card);
    });
  };

  const startOfWeek = (date) => {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const endOfWeek = (date) => {
    const start = startOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  };

  const filterByWeek = (rows, dateValue) => {
    if (!dateValue) return rows;
    const base = parseDateOnly(dateValue);
    if (!base) return rows;
    const start = startOfWeek(base);
    const end = endOfWeek(base);
    return rows.filter((row) => {
      const d = parseDateOnly(row.tanggal);
      if (!d) return false;
      d.setHours(0, 0, 0, 0);
      return d >= start && d <= end;
    });
  };

  const applyFilters = () => {
    const dateValue = weekDateInput?.value || new Date().toISOString().slice(0, 10);
    const weekRows = filterByWeek(allJadwalRows, dateValue);
    const value = (searchInput?.value || "").toLowerCase();
    const filtered = weekRows.filter((row) =>
      String(row.mapel_nama || "").toLowerCase().includes(value) ||
      String(row.program_nama || "").toLowerCase().includes(value) ||
      String(row.edukator_nama || "").toLowerCase().includes(value)
    );
    renderJadwal(filtered);
  };

  // --- Logic ---

  const loadProfile = async () => {
    if (!siswaNameEl) return;
    try {
      const res = await fetch("/api/siswa/profile", { credentials: "same-origin" });
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success && json.data) {
        siswaNameEl.textContent = json.data.nama || "Jadwal Belajar";
      }
    } catch (err) {
      // ignore profile load failure
    }
  };

  const loadData = async () => {
    try {
      loadProfile();
      // Parallel fetch for efficiency
      const [privatRows, kelasRows] = await Promise.all([
        fetch("/api/jadwal?tipe=privat", { credentials: "same-origin" }).then((r) => r.json()),
        fetch("/api/jadwal?tipe=kelas", { credentials: "same-origin" }).then((r) => r.json()),
      ]);

      // Merge and Sort Schedules
      allJadwalRows = []
        .concat(privatRows?.data || [])
        .concat(kelasRows?.data || [])
        .sort((a, b) => {
          // Sort by Date then Time
          if (a.tanggal === b.tanggal) return (a.jam_mulai || "").localeCompare(b.jam_mulai || "");
          return (a.tanggal || "").localeCompare(b.tanggal || "");
        });

      if (weekDateInput && !weekDateInput.value) {
        weekDateInput.value = new Date().toISOString().slice(0, 10);
      }
      applyFilters();

      // Search Logic
      if (searchInput) {
        searchInput.addEventListener("input", applyFilters);
      }
      if (weekDateInput) {
        weekDateInput.addEventListener("change", applyFilters);
      }
    } catch (err) {
      console.error("Failed to load jadwal:", err);
      renderJadwal([]);
    }
  };

  // Init
  loadData();
})();
