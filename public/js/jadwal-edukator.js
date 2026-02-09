(() => {
  const { JADWAL_STATUS, TIPE_LES } = window.APP_CONSTANTS;

  const state = {
    privat: [],
    kelas: [],
    currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedDate: null,
    search: "",
  };

  // Helper: Fetch dengan error handling aman
  const fetchJson = async (url, options = {}) => {
    try {
      const requester = window.api?.request || fetch;
      const res = await requester(url, options);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Gagal memuat data.");
      return data && data.success ? data.data : data;
    } catch (e) {
      console.warn("Fetch warning:", e);
      return []; // Return array kosong agar aplikasi tidak crash
    }
  };

  // Helper: Format jam "08:00:00" -> "08:00"
  const formatTime = (row) => {
    if (!row || !row.jam_mulai) return "-";
    const start = row.jam_mulai.substring(0, 5);
    const end = row.jam_selesai ? row.jam_selesai.substring(0, 5) : "";
    return end ? `${start} - ${end}` : start;
  };

  // Helper: Build judul jadwal
  const buildTitle = (row) => {
    if (row.siswa_nama) {
      // Format Privat
      return `<span class="font-bold text-slate-800">${row.siswa_nama}</span> <span class="text-slate-300 mx-1">|</span> <span class="text-slate-500 text-xs">${row.mapel_nama || row.program_nama || "-"}</span>`;
    }
    // Format Kelas
    return `<span class="font-bold text-slate-800">${row.kelas_nama || row.program_nama || "-"}</span> <span class="text-slate-300 mx-1">|</span> <span class="text-slate-500 text-xs">${row.mapel_nama || "-"}</span>`;
  };

  // Helper: Konversi ke format tanggal YYYY-MM-DD
  const toDateKey = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null;
      // Gunakan local timezone offset trick agar tanggal tidak mundur
      const offset = value.getTimezoneOffset() * 60000;
      const local = new Date(value.getTime() - offset);
      return local.toISOString().slice(0, 10);
    }
    const raw = String(value);
    const normalized = raw.includes("T") ? raw.split("T")[0] : raw;
    // Validasi format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
    return null;
  };

  const formatMonthLabel = (date) =>
    new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(date);

  // Render Header Hari (Sen, Sel, Rab...)
  const buildCalendarHeader = () => {
    const header = document.getElementById("calendarHeader");
    if (!header) return;
    const names = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
    header.innerHTML = names.map((name) => `<div class="py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">${name}</div>`).join("");
  };

  // Mapping data jadwal ke tanggal
  const buildScheduleMap = () => {
    const map = new Map();
    const addRow = (row, type) => {
      const key = toDateKey(row.tanggal);
      if (!key) return;
      const entry = map.get(key) || { privat: [], kelas: [] };
      entry[type].push({ ...row, _type: type });
      map.set(key, entry);
    };
    const filteredPrivat = filterRows(state.privat);
    const filteredKelas = filterRows(state.kelas);
    filteredPrivat.forEach((row) => addRow(row, "privat"));
    filteredKelas.forEach((row) => addRow(row, "kelas"));
    return map;
  };

  const normalizeText = (value) => String(value || "").toLowerCase();
  
  // Filter pencarian
  const filterRows = (rows) => {
    const query = normalizeText(state.search);
    if (!query) return rows || [];
    return (rows || []).filter((row) => {
      return (
        normalizeText(row.siswa_nama).includes(query) ||
        normalizeText(row.program_nama).includes(query) ||
        normalizeText(row.mapel_nama).includes(query) ||
        normalizeText(row.kelas_nama).includes(query) ||
        normalizeText(row.tanggal).includes(query)
      );
    });
  };

  // --- RENDER CALENDAR GRID ---
  const renderCalendar = () => {
    const grid = document.getElementById("calendarGrid");
    const label = document.getElementById("calendarLabel");
    const empty = document.getElementById("jadwalEmpty");
    if (!grid) return;

    const month = state.currentMonth;
    const scheduleMap = buildScheduleMap();

    if (label) label.textContent = formatMonthLabel(month);

    // Algoritma Grid Kalender
    // Cari hari pertama bulan ini
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    // Cari hari dalam minggu (0=Minggu, 1=Senin...6=Sabtu)
    const dayOfWeek = firstDay.getDay(); 
    // Kita mulai hari Senin. Jika hari Minggu (0), maka mundur 6 hari. Jika Senin (1), mundur 0 hari.
    const startOffset = (dayOfWeek + 6) % 7; 
    
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - startOffset);

    const cells = [];
    let hasAny = false;
    
    // Loop 42 kotak (6 minggu x 7 hari)
    for (let i = 0; i < 42; i += 1) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);
      
      const key = toDateKey(cellDate);
      const isCurrentMonth = cellDate.getMonth() === month.getMonth();
      const nowKey = toDateKey(new Date()); 
      const isToday = nowKey === key;
      const isSelected = state.selectedDate === key;
      
      const entry = scheduleMap.get(key);
      const privatCount = entry ? entry.privat.length : 0;
      const kelasCount = entry ? entry.kelas.length : 0;

      if (isCurrentMonth && (privatCount || kelasCount)) {
        hasAny = true;
      }

      // Render Dots
      const dotPrivat = privatCount ? `<span class="calendar-dot privat"></span>` : "";
      const dotKelas = kelasCount ? `<span class="calendar-dot kelas"></span>` : "";

      // Tentukan Style Background
      const hasPrivat = privatCount > 0;
      const hasKelas = kelasCount > 0;
      let eventClass = "";
      if (hasPrivat && hasKelas) eventClass = " has-both";
      else if (hasPrivat) eventClass = " has-privat";
      else if (hasKelas) eventClass = " has-kelas";

      cells.push(`
        <button
          type="button"
          class="calendar-cell${isCurrentMonth ? "" : " is-out"}${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}${isCurrentMonth ? eventClass : ""}"
          data-date="${key}"
          ${isCurrentMonth ? "" : "disabled"}
        >
          <div class="text-xs font-semibold z-10">${cellDate.getDate()}</div>
          <div class="calendar-dots z-10">${dotPrivat}${dotKelas}</div>
        </button>
      `);
    }

    grid.innerHTML = cells.join("");
    
    if (empty) {
      // Sembunyikan pesan kosong jika ada jadwal apapun bulan ini
      empty.style.display = hasAny ? "none" : "block";
    }
  };

  // --- RENDER LIST HARIAN ---
  const renderList = (dateKey) => {
    const list = document.getElementById("calendarList");
    const empty = document.getElementById("calendarEmpty");
    const label = document.getElementById("selectedDateLabel");
    if (!list || !empty || !label) return;

    if (!dateKey) {
      list.innerHTML = "";
      empty.style.display = "flex";
      label.textContent = "-";
      return;
    }

    const scheduleMap = buildScheduleMap();
    const entry = scheduleMap.get(dateKey);
    const rows = entry ? [...entry.privat, ...entry.kelas] : [];
    
    // Sort berdasarkan jam
    rows.sort((a, b) => {
      const aKey = `${a.jam_mulai || ""}`;
      const bKey = `${b.jam_mulai || ""}`;
      return aKey.localeCompare(bKey);
    });

    const parsed = new Date(`${dateKey}T00:00:00`);
    label.textContent = Number.isNaN(parsed.getTime())
      ? dateKey
      : new Intl.DateTimeFormat("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }).format(parsed);

    if (!rows.length) {
      list.innerHTML = "";
      empty.style.display = "flex";
      return;
    }

    empty.style.display = "none";
    list.innerHTML = rows
      .map((row) => {
        const isDone = row.status_jadwal === JADWAL_STATUS.COMPLETED;
        const pertemuan = row.pertemuan_ke ? `<span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded ml-1">P${row.pertemuan_ke}</span>` : "";
        const typeLabel = row._type === TIPE_LES.KELAS ? "Kelas" : "Privat";
        const jadwalData = JSON.stringify(row).replace(/"/g, '&quot;');
        
        return `
          <div class="schedule-card group">
            <div class="time-box">
               <div class="text-xs font-bold text-slate-700">${row.jam_mulai ? row.jam_mulai.substring(0,5) : '--:--'}</div>
               <div class="text-[9px] text-slate-400 font-medium">WIB</div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="status-badge ${row._type}">${typeLabel}</span>
                ${isDone ? '<span class="status-badge done"><i class="fa-solid fa-check mr-1"></i>Selesai</span>' : ''}
              </div>
              <div class="truncate text-sm text-slate-700 leading-tight">${buildTitle(row)} ${pertemuan}</div>
            </div>
            
            ${!isDone ? `
            <button class="w-9 h-9 rounded-full bg-slate-50 hover:bg-orange-50 text-slate-400 hover:text-orange-500 flex items-center justify-center transition shadow-sm border border-slate-100 flex-shrink-0" 
                    onclick='window.openPengajuanModal(${row.id}, ${jadwalData})'
                    title="Ajukan Perubahan">
              <i class="fa-solid fa-pen-to-square text-sm"></i>
            </button>` : ''}
          </div>
        `;
      })
      .join("");
  };

  const load = async () => {
    const [privat, kelas] = await Promise.all([
      fetchJson("/api/jadwal?tipe=privat"),
      fetchJson("/api/jadwal?tipe=kelas"),
    ]);
    
    const sortRows = (rows) =>
      (rows || [])
        .filter((row) => row.tanggal)
        .sort((a, b) => {
          const aKey = `${a.tanggal || ""} ${a.jam_mulai || ""}`;
          const bKey = `${b.tanggal || ""} ${b.jam_mulai || ""}`;
          return aKey.localeCompare(bKey);
        });

    state.privat = sortRows(privat);
    state.kelas = sortRows(kelas);
    
    // Set hari ini
    const todayKey = toDateKey(new Date());
    state.selectedDate = todayKey;
    
    renderCalendar();
    renderList(state.selectedDate);
  };

  const init = async () => {
    buildCalendarHeader();
    const prevBtn = document.getElementById("calendarPrev");
    const nextBtn = document.getElementById("calendarNext");
    const grid = document.getElementById("calendarGrid");
    const searchInput = document.getElementById("jadwalSearch");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        state.currentMonth = new Date(
          state.currentMonth.getFullYear(),
          state.currentMonth.getMonth() - 1,
          1
        );
        renderCalendar();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        state.currentMonth = new Date(
          state.currentMonth.getFullYear(),
          state.currentMonth.getMonth() + 1,
          1
        );
        renderCalendar();
      });
    }

    if (grid) {
      grid.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-date]");
        if (!button || button.disabled) return;
        state.selectedDate = button.dataset.date;
        renderCalendar();
        renderList(state.selectedDate);
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", (event) => {
        state.search = event.target.value || "";
        renderCalendar();
        renderList(state.selectedDate);
      });
    }

    await load();
  };

  // Run Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
