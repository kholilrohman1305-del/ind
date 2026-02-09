(() => {
  const { TIPE_LES } = window.APP_CONSTANTS;

  const state = {
    rows: [],
    search: "",
    month: "",
    startDate: "",
    endDate: "",
  };

  const parseData = (payload) => {
    if (payload && typeof payload === "object" && payload.success) {
      return payload.data;
    }
    return payload;
  };

  const fetchJson = async (url, options = {}) => {
    const requester = window.api?.request || fetch;
    const res = await requester(url, { credentials: "same-origin", ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Permintaan gagal.");
    return parseData(data);
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    return date.toLocaleDateString("id-ID", {
      weekday: 'short',
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return date.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
  };

  const toSafeDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const normalizeDateRange = (from, to) => {
    if (!from || !to) return { startDate: from, endDate: to };
    const start = toSafeDate(from);
    const end = toSafeDate(to);
    if (!start || !end) return { startDate: from, endDate: to };
    if (start.getTime() <= end.getTime()) {
      return { startDate: from, endDate: to };
    }
    return { startDate: to, endDate: from };
  };

  const formatShortDateLabel = (value) => {
    const date = toSafeDate(value);
    if (!date) return value || "-";
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  };

  const formatMonthLabel = (value) => {
    if (!value) return "-";
    const safeMonth = toSafeDate(`${value}-01`);
    if (!safeMonth) return value;
    return safeMonth.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
  };

  const getInitials = (name) => {
      if(!name) return "T";
      return name.split(" ").map(n => n[0]).slice(0,2).join("").toUpperCase();
  };

  // --- Render List Tentor (Table) ---
  const renderList = (rows) => {
    const list = document.getElementById("presensiList");
    const empty = document.getElementById("presensiEmpty");
    const countEdukator = document.getElementById("countEdukator");
    const totalKehadiran = document.getElementById("totalKehadiran");
    if (!list) return;
    list.innerHTML = "";
    state.rows = rows;

    if (!rows || !rows.length) {
      empty.classList.remove("hidden");
      const table = list.closest("table");
      if (table) table.classList.add("hidden");
      if (countEdukator) countEdukator.textContent = "0";
      if (totalKehadiran) totalKehadiran.textContent = "0";
      return;
    }
    
    empty.classList.add("hidden");
    const table = list.closest("table");
    if (table) table.classList.remove("hidden");

    if (countEdukator) countEdukator.textContent = rows.length;
    if (totalKehadiran) {
      const total = rows.reduce((sum, row) => sum + Number(row.hadir_bulan_ini || 0), 0);
      totalKehadiran.textContent = total;
    }

    rows.forEach((row) => {
      const initials = getInitials(row.nama);
      // Dynamic pastel color
      const hue = (row.id * 50) % 360; 
      const avatarStyle = `background: hsl(${hue}, 70%, 95%); color: hsl(${hue}, 60%, 40%); border: 1px solid hsl(${hue}, 70%, 90%);`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm" style="${avatarStyle}">
              ${initials}
            </div>
            <div class="min-w-0">
              <div class="font-bold text-gray-800 text-sm truncate" title="${row.nama}">${row.nama}</div>
              <div class="text-xs text-gray-400">ID: #${row.id}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-50 text-gray-700 border border-gray-200">
            ${row.hadir_bulan_ini || 0} Sesi
          </span>
        </td>
        <td class="text-right">
          <button class="px-3 py-2 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white transition text-xs font-bold detail-btn">
            Lihat Detail
          </button>
        </td>
      `;
      tr.querySelector(".detail-btn").addEventListener("click", () => openDetailModal(row));
      list.appendChild(tr);
    });
  };

  // --- Modal Logic ---
  const toggleModal = (show) => {
      const modal = document.getElementById("presensiDetailModal");
      if(show){
          modal.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
          modal.querySelector('.modal-card').classList.replace('scale-95', 'scale-100');
      } else {
          modal.classList.add('hidden', 'opacity-0', 'pointer-events-none');
          modal.querySelector('.modal-card').classList.replace('scale-100', 'scale-95');
      }
  };

  const openDetailModal = async (tentorData) => {
    // Set Header Info
    document.getElementById("detailNama").textContent = tentorData.nama;
    document.getElementById("detailAvatar").textContent = getInitials(tentorData.nama);
    const detailPeriodText =
      state.startDate && state.endDate
        ? `${formatShortDateLabel(state.startDate)} - ${formatShortDateLabel(state.endDate)}`
        : formatMonthLabel(state.month);
    document.getElementById("detailBulan").textContent = `Periode: ${detailPeriodText}`;

    // Fetch Detail
    const detailContainer = document.getElementById("presensiDetailRows");
    const detailEmpty = document.getElementById("presensiDetailEmpty");
    
    // Show loading state if needed, or clear prev data
    detailContainer.innerHTML = '<div class="p-8 text-center text-gray-400"><i class="fa-solid fa-circle-notch fa-spin"></i> Memuat data...</div>';
    
    toggleModal(true);

    try {
        const detailParams = new URLSearchParams();
        if (state.startDate && state.endDate) {
          detailParams.append("start_date", state.startDate);
          detailParams.append("end_date", state.endDate);
        } else if (state.month) {
          detailParams.append("month", state.month);
        }
        const detailQuery = detailParams.toString();
        const rows = await fetchJson(
          `/api/presensi/edukator/${tentorData.id}${detailQuery ? `?${detailQuery}` : ""}`
        );
        
        detailContainer.innerHTML = "";
        
        if (!rows.length) {
          detailEmpty.classList.remove("hidden");
          return;
        }
        detailEmpty.classList.add("hidden");

        rows.forEach((row) => {
          const item = document.createElement("div");
          item.className = "bg-white p-4 border-b border-gray-100 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row gap-4 sm:items-center justify-between";

          const mapUrl = row.latitude && row.longitude
            ? `https://www.google.com/maps/search/?api=1&query=${row.latitude},${row.longitude}`
            : null;

          const isKelas = row.tipe_les === TIPE_LES.KELAS;
          const titleText = isKelas
            ? (row.kelas_nama || "Kelas")
            : (row.siswa_nama || "Tanpa Siswa");

          // Attendance info for kelas
          const attendanceInfo = isKelas ? `
            <div class="flex gap-2 mt-1.5">
              <span class="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100 font-medium">
                <i class="fa-solid fa-user-check mr-1"></i> Hadir: ${row.hadir_count || 0}
              </span>
              <span class="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100 font-medium">
                <i class="fa-solid fa-user-xmark mr-1"></i> Tidak Hadir: ${row.tidak_hadir_count || 0}
              </span>
            </div>
          ` : '';

          // Type badge
          const typeBadge = isKelas
            ? `<span class="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100 font-medium">
                <i class="fa-solid fa-users mr-1"></i> Kelas
              </span>`
            : `<span class="text-[10px] bg-cyan-50 text-cyan-600 px-2 py-0.5 rounded border border-cyan-100 font-medium">
                <i class="fa-solid fa-user mr-1"></i> Privat
              </span>`;

          item.innerHTML = `
            <div class="flex items-start gap-4">
                <div class="flex flex-col items-center min-w-[60px]">
                    <span class="text-xs font-bold text-gray-400 uppercase">${formatDate(row.tanggal).split(',')[0]}</span>
                    <span class="text-lg font-bold text-violet-600">${formatDate(row.tanggal).split(',')[1]}</span>
                </div>

                <div class="h-10 w-[1px] bg-gray-200 hidden sm:block"></div>

                <div>
                    <h4 class="font-bold text-gray-800 text-sm">${titleText}</h4>
                    <div class="flex flex-wrap gap-2 mt-1">
                        ${typeBadge}
                        <span class="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 font-medium">
                            <i class="fa-solid fa-layer-group mr-1"></i> ${row.program_nama || "-"}
                        </span>
                        <span class="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-100 font-medium">
                            <i class="fa-solid fa-chalkboard mr-1"></i> ${row.materi || "Materi -"}
                        </span>
                    </div>
                    ${attendanceInfo}
                </div>
            </div>

            <div class="flex items-center gap-4 text-xs text-gray-500 sm:justify-end mt-2 sm:mt-0 pl-[76px] sm:pl-0">
                <div class="flex items-center gap-1.5" title="Waktu Input">
                    <i class="fa-regular fa-clock text-gray-400"></i> ${formatTime(row.waktu_absen)}
                </div>

                ${mapUrl ? `
                <a href="${mapUrl}" target="_blank" class="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 hover:underline transition-colors font-medium">
                    <i class="fa-solid fa-location-dot"></i> Lokasi
                </a>` :
                `<span class="text-gray-300 cursor-not-allowed flex items-center gap-1.5"><i class="fa-solid fa-location-slash"></i> -</span>`}
            </div>
          `;
          detailContainer.appendChild(item);
        });

    } catch (err) {
        detailContainer.innerHTML = `<div class="p-4 text-red-500 text-center text-sm">Gagal memuat detail.</div>`;
    }
  };

  // --- Init ---
  const init = async () => {
    // Event Listeners for Modal
    document.getElementById("closePresensiDetail").addEventListener("click", () => toggleModal(false));
    document.getElementById("closePresensiDetailFooter").addEventListener("click", () => toggleModal(false));
    
    // Filters
    const searchInput = document.getElementById("presensiSearch");
    const monthInput = document.getElementById("presensiMonth");
    const startInput = document.getElementById("presensiStart");
    const endInput = document.getElementById("presensiEnd");
    
    // Default Month
    const now = new Date();
    state.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (monthInput) monthInput.value = state.month;
    if (startInput) startInput.value = "";
    if (endInput) endInput.value = "";

    const loadSummary = async () => {
      const params = new URLSearchParams();
      if (state.startDate && state.endDate) {
        params.append("start_date", state.startDate);
        params.append("end_date", state.endDate);
      } else if (state.month) {
        params.append("month", state.month);
      }
      if (state.search) {
        params.append("search", state.search);
      }
      const query = params.toString();
      try {
          const rows = await fetchJson(
            `/api/presensi/summary${query ? `?${query}` : ""}`
          );
          renderList(rows || []);
      } catch (err) {
          renderList([]);
      }
    };

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        state.search = e.target.value.trim();
        loadSummary();
      });
    }

    if (monthInput) {
      monthInput.addEventListener("change", (e) => {
        state.month = e.target.value;
        state.startDate = "";
        state.endDate = "";
        if (startInput) startInput.value = "";
        if (endInput) endInput.value = "";
        loadSummary();
      });
    }

    const applyRangeFilter = () => {
      const fromValue = startInput?.value || "";
      const toValue = endInput?.value || "";
      const normalized = normalizeDateRange(fromValue, toValue);
      state.startDate = normalized.startDate;
      state.endDate = normalized.endDate;
      if (state.startDate && state.endDate) {
        state.month = "";
        if (monthInput) monthInput.value = "";
      }
      if (startInput) startInput.value = state.startDate;
      if (endInput) endInput.value = state.endDate;
      loadSummary();
    };

    if (startInput) {
      startInput.addEventListener("change", applyRangeFilter);
    }

    if (endInput) {
      endInput.addEventListener("change", applyRangeFilter);
    }

    await loadSummary();
  };

  init();
})();
