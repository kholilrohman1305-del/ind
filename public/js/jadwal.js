(() => {
  const { ROLES, TIPE_LES, JADWAL_STATUS, ENROLLMENT_STATUS } = window.APP_CONSTANTS;

  const state = {
    siswaList: [],
    programs: [],
    mapel: [],
    edukator: [],
    jadwalRows: [],
    kelasGroups: [],
    gajiSettings: [],
    tipeLes: [],
    isAdmin: false,
    detailSlots: [],
    fillSlotIndex: null,
    currentFilter: "all",
    currentTipe: "privat",
    currentStatus: ENROLLMENT_STATUS.AKTIF, // "aktif" or "selesai"
    detailContext: null,
  };

  const dayOptions = [
    { value: "senin", label: "Senin" },
    { value: "selasa", label: "Selasa" },
    { value: "rabu", label: "Rabu" },
    { value: "kamis", label: "Kamis" },
    { value: "jumat", label: "Jumat" },
    { value: "sabtu", label: "Sabtu" },
    { value: "minggu", label: "Minggu" },
  ];

  const dayNames = {
    0: "Minggu",
    1: "Senin",
    2: "Selasa",
    3: "Rabu",
    4: "Kamis",
    5: "Jumat",
    6: "Sabtu",
  };

  const jenjangLabels = {
    PAUD_TK: "PAUD/TK",
    SD: "SD",
    SMP: "SMP",
    SMA: "SMA",
    ALUMNI: "Alumni",
  };

  const parseData = (payload) => {
    if (payload && typeof payload === "object" && payload.success) {
      return payload.data;
    }
    return payload;
  };

  // Fix: Parse date string as local date, not UTC
  const formatDate = (value) => {
    if (!value) return "";
    const str = String(value);
    // Handle ISO format with time
    if (str.includes("T")) {
      return str.split("T")[0];
    }
    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    // Try to parse other formats
    const parsed = new Date(str);
    if (!Number.isNaN(parsed.getTime())) {
      // Format as YYYY-MM-DD using local timezone
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, "0");
      const day = String(parsed.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return str;
  };

  const formatDateDisplay = (value) => {
    if (!value) return "-";
    const dateStr = formatDate(value);
    if (!dateStr || dateStr === "-") return "-";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Fix: Calculate day from date string correctly using local timezone
  const getDayName = (dateValue) => {
    if (!dateValue) return "-";
    const dateStr = formatDate(dateValue);
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return "-";
    // Create date using local timezone (year, month-1, day)
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (Number.isNaN(date.getTime())) return "-";
    return dayNames[date.getDay()] || "-";
  };

  // Format time to 24-hour format
  const formatTime24 = (timeStr) => {
    if (!timeStr) return "-";
    const parts = String(timeStr).split(":");
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    }
    return timeStr;
  };

  const formatRupiah = (value) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const fetchJson = async (url, options = {}) => {
    const requester = window.api?.request || fetch;
    const res = await requester(url, { credentials: "same-origin", ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Permintaan gagal.");
    }
    return parseData(data);
  };

  const buildOptions = (items, placeholder) => {
    if (!items.length) {
      return `<option value="">${placeholder}</option>`;
    }
    const options = items
      .map((item) => `<option value="${item.id}">${item.nama || item.label}</option>`)
      .join("");
    return `<option value="">${placeholder}</option>${options}`;
  };

  // Get tipe les label
  const getTipeLesLabel = (kode) => {
    if (!kode) return "-";
    const found = state.tipeLes.find((t) => t.kode === kode);
    return found?.nama || kode;
  };

  // Render filter pills based on tipe_les
  const renderFilterPills = () => {
    const container = document.querySelector(".filter-pill")?.parentElement;
    if (!container) return;

    // Get unique tipe_les from jadwal
    const uniqueTipes = [...new Set(state.jadwalRows.map((r) => r.tipe_les))].filter(Boolean);

    let html = `
      <span class="text-sm font-medium text-gray-500">Filter:</span>
      <button class="filter-pill ${state.currentFilter === "all" ? "active" : ""}" data-filter="all">Semua</button>
    `;

    uniqueTipes.forEach((tipe) => {
      const label = getTipeLesLabel(tipe);
      const isActive = state.currentFilter === tipe ? "active" : "";
      const icon = tipe === "kelas"
        ? '<i class="fa-solid fa-users text-emerald-500 mr-1"></i>'
        : '<i class="fa-solid fa-user text-blue-500 mr-1"></i>';
      html += `<button class="filter-pill ${isActive}" data-filter="${tipe}">${icon} ${label}</button>`;
    });

    container.innerHTML = html;

    // Re-attach event listeners
    container.querySelectorAll(".filter-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        container.querySelectorAll(".filter-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        state.currentFilter = pill.dataset.filter;
        renderJadwalList();
      });
    });
  };

  // Check if jadwal is completed (all pertemuan done)
  const isJadwalSelesai = (row) => {
    const totalPertemuan = Number(row.jumlah_pertemuan || 0);
    const completed = Number(row.completed_jadwal || 0);
    // Consider selesai if has pertemuan and all completed
    return totalPertemuan > 0 && completed >= totalPertemuan;
  };

  // Render combined jadwal list (table)
  const renderJadwalList = () => {
    const container = document.getElementById("jadwalList");
    const empty = document.getElementById("jadwalEmpty");
    if (!container) return;
    container.innerHTML = "";

    let filteredRows = state.jadwalRows;

    // Filter by status (aktif/selesai)
    if (state.currentStatus === ENROLLMENT_STATUS.AKTIF) {
      filteredRows = filteredRows.filter((row) => !isJadwalSelesai(row));
    } else if (state.currentStatus === ENROLLMENT_STATUS.SELESAI) {
      filteredRows = filteredRows.filter((row) => isJadwalSelesai(row));
    }

    // Filter by tipe_les
    if (state.currentFilter !== "all") {
      filteredRows = filteredRows.filter((row) => row.tipe_les === state.currentFilter);
    }

    if (!filteredRows.length) {
      empty.classList.remove("hidden");
      empty.classList.add("flex");
      const table = container.closest("table");
      if (table) table.classList.add("hidden");
      return;
    }
    empty.classList.add("hidden");
    empty.classList.remove("flex");
    const table = container.closest("table");
    if (table) table.classList.remove("hidden");

    const isSelesaiTab = state.currentStatus === ENROLLMENT_STATUS.SELESAI;

    filteredRows.forEach((row) => {
      const isKelas = row.tipe_les === TIPE_LES.KELAS;
      const totalPertemuan = Number(row.jumlah_pertemuan || 0);
      const completed = Number(row.completed_jadwal || 0);
      const tipeLesLabel = getTipeLesLabel(row.tipe_les);
      const jadwalSelesai = isJadwalSelesai(row);

      if (!isKelas) {
        const actionButtons = state.isAdmin
          ? isSelesaiTab
            ? `<div class="flex gap-2 justify-end">
                <button class="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition" data-action="detail" data-tipe="privat" data-id="${row.enrollment_id}">
                  <i class="fa-solid fa-eye"></i>
                </button>
              </div>`
            : `<div class="flex gap-2 justify-end">
                <button class="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-semibold transition" data-action="detail" data-tipe="privat" data-id="${row.enrollment_id}">
                  <i class="fa-solid fa-eye"></i>
                </button>
                <button class="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg text-xs font-semibold transition" data-action="delete" data-tipe="privat" data-id="${row.enrollment_id}">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>`
          : "";

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br ${jadwalSelesai ? "from-emerald-100 to-green-100 text-emerald-600" : "from-blue-100 to-indigo-100 text-blue-600"} flex items-center justify-center font-bold text-xs shadow-sm">
                ${(row.siswa_nama || "?").substring(0, 2).toUpperCase()}
              </div>
              <div class="min-w-0">
                <div class="font-bold text-gray-800 text-sm truncate">${row.siswa_nama || "-"}</div>
                <div class="text-xs text-gray-500">${jenjangLabels[row.jenjang] || row.jenjang || "-"}</div>
              </div>
            </div>
          </td>
          <td class="text-sm text-gray-600">${row.program_nama || "-"}</td>
          <td class="text-sm text-gray-600">${tipeLesLabel}</td>
          <td class="text-sm font-semibold ${jadwalSelesai ? "text-emerald-600" : "text-gray-700"}">
            ${completed} / ${totalPertemuan}
          </td>
          <td>
            <span class="status-pill ${jadwalSelesai ? "completed" : "pending"}">
              ${jadwalSelesai ? "Selesai" : "Aktif"}
            </span>
          </td>
          <td class="text-right">${actionButtons}</td>
        `;
        container.appendChild(tr);
      } else {
        const actionButtons = state.isAdmin
          ? isSelesaiTab
            ? `<div class="flex gap-2 justify-end">
                <button class="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition" data-action="detail" data-tipe="kelas" data-id="${row.kelas_id}">
                  <i class="fa-solid fa-eye"></i>
                </button>
              </div>`
            : `<div class="flex gap-2 justify-end">
                <button class="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-xs font-semibold transition" data-action="detail" data-tipe="kelas" data-id="${row.kelas_id}">
                  <i class="fa-solid fa-eye"></i>
                </button>
                <button class="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg text-xs font-semibold transition" data-action="delete" data-tipe="kelas" data-id="${row.kelas_id}">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>`
          : "";

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 flex items-center justify-center font-bold text-xs shadow-sm">
                <i class="fa-solid fa-users"></i>
              </div>
              <div class="min-w-0">
                <div class="font-bold text-gray-800 text-sm truncate">${row.kelas_nama || "-"}</div>
                <div class="text-xs text-gray-500">Kelas</div>
              </div>
            </div>
          </td>
          <td class="text-sm text-gray-600">${row.program_list || "Program belum ditentukan"}</td>
          <td class="text-sm text-gray-600">${tipeLesLabel}</td>
          <td class="text-sm font-semibold text-gray-700">${row.total_jadwal || 0} Jadwal</td>
          <td><span class="status-pill pending">Aktif</span></td>
          <td class="text-right">${actionButtons}</td>
        `;
        container.appendChild(tr);
      }
    });
  };

  // Render tipe jadwal radio buttons dynamically
  const renderTipeJadwalOptions = () => {
    const container = document.querySelector('[name="tipeJadwal"]')?.closest("div.grid");
    if (!container) return;

    // Get unique tipe_les that have non-kelas (individual) and kelas options
    const nonKelasTipes = state.tipeLes.filter((t) => t.kode !== TIPE_LES.KELAS);
    const kelasTipe = state.tipeLes.find((t) => t.kode === TIPE_LES.KELAS);

    let html = "";

    // Add non-kelas options (individual types like privat, semi_privat, etc.)
    nonKelasTipes.forEach((tipe, index) => {
      const checked = index === 0 ? "checked" : "";
      html += `
        <label class="relative cursor-pointer">
          <input type="radio" name="tipeJadwal" value="${tipe.kode}" class="peer sr-only" ${checked} />
          <div class="p-4 border-2 border-gray-200 rounded-xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 transition">
            <i class="fa-solid fa-user text-2xl text-blue-500 mb-2"></i>
            <div class="font-semibold text-gray-700">${tipe.nama}</div>
            <div class="text-xs text-gray-500">${tipe.deskripsi || "Les individual"}</div>
          </div>
        </label>
      `;
    });

    // Add kelas option if exists
    if (kelasTipe) {
      html += `
        <label class="relative cursor-pointer">
          <input type="radio" name="tipeJadwal" value="kelas" class="peer sr-only" />
          <div class="p-4 border-2 border-gray-200 rounded-xl text-center peer-checked:border-emerald-500 peer-checked:bg-emerald-50 transition">
            <i class="fa-solid fa-users text-2xl text-emerald-500 mb-2"></i>
            <div class="font-semibold text-gray-700">${kelasTipe.nama}</div>
            <div class="text-xs text-gray-500">${kelasTipe.deskripsi || "Les kelompok"}</div>
          </div>
        </label>
      `;
    }

    container.innerHTML = html;

    // Re-attach event listeners
    container.querySelectorAll('input[name="tipeJadwal"]').forEach((radio) => {
      radio.addEventListener("change", toggleTipeJadwal);
    });
  };

  // Render slots for individual jadwal
  const renderPrivatSlots = (jumlah, startIndex = 1) => {
    const slotsContainer = document.getElementById("jadwalSlots");
    slotsContainer.innerHTML = "";
    const total = jumlah > 0 ? jumlah : 1;
    for (let i = 1; i <= total; i += 1) {
      const card = document.createElement("div");
      card.className = "slot-card";
      card.innerHTML = `
        <div class="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">
          <i class="fa-solid fa-hashtag mr-1"></i> Pertemuan ${startIndex + i - 1}
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-gray-600 text-xs font-medium mb-1">Tanggal</label>
            <input type="date" class="slot-tanggal custom-input" />
          </div>
          <div>
            <label class="block text-gray-600 text-xs font-medium mb-1">Edukator</label>
            <select class="slot-edukator custom-select text-sm">
              ${buildOptions(state.edukator, "Pilih edukator")}
            </select>
          </div>
          <div>
            <label class="block text-gray-600 text-xs font-medium mb-1">Jam Mulai</label>
            <input type="text" class="slot-mulai custom-input" placeholder="HH:MM" pattern="[0-2][0-9]:[0-5][0-9]" maxlength="5" />
          </div>
          <div>
            <label class="block text-gray-600 text-xs font-medium mb-1">Jam Selesai</label>
            <input type="text" class="slot-selesai custom-input" placeholder="HH:MM" pattern="[0-2][0-9]:[0-5][0-9]" maxlength="5" />
          </div>
          <div class="col-span-2">
            <label class="block text-gray-600 text-xs font-medium mb-1">Mapel</label>
            <select class="slot-mapel custom-select text-sm">
              ${buildOptions(state.mapel, "Pilih mapel")}
            </select>
          </div>
        </div>
      `;
      slotsContainer.appendChild(card);

      // Add time input formatter
      const timeInputs = card.querySelectorAll(".slot-mulai, .slot-selesai");
      timeInputs.forEach((input) => {
        input.addEventListener("input", formatTimeInput);
        input.addEventListener("blur", validateTimeInput);
      });
    }

    // Sync times from first slot to others
    const cards = Array.from(slotsContainer.querySelectorAll(".slot-card"));
    if (!cards.length) return;
    const firstCard = cards[0];
    const firstStart = firstCard.querySelector(".slot-mulai");
    const firstEnd = firstCard.querySelector(".slot-selesai");
    const syncTimes = () => {
      const startValue = firstStart.value;
      const endValue = firstEnd.value;
      cards.slice(1).forEach((card) => {
        const startInput = card.querySelector(".slot-mulai");
        const endInput = card.querySelector(".slot-selesai");
        if (startValue && !startInput.value) startInput.value = startValue;
        if (endValue && !endInput.value) endInput.value = endValue;
      });
    };
    firstStart.addEventListener("blur", syncTimes);
    firstEnd.addEventListener("blur", syncTimes);
  };

  // Format time input as user types (HH:MM)
  const formatTimeInput = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 3) {
      value = value.slice(0, 2) + ":" + value.slice(2);
    }
    e.target.value = value;
  };

  // Validate time input
  const validateTimeInput = (e) => {
    const value = e.target.value;
    if (!value) return;
    const match = value.match(/^(\d{1,2}):?(\d{2})?$/);
    if (match) {
      let hours = parseInt(match[1], 10);
      let minutes = parseInt(match[2] || "0", 10);
      if (hours > 23) hours = 23;
      if (minutes > 59) minutes = 59;
      e.target.value = String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");
    }
  };

  // Render slots for kelas jadwal
  const renderKelasSlots = () => {
    const container = document.getElementById("jadwalSlots");
    container.innerHTML = "";
    addKelasSlot();
  };

  const addKelasSlot = () => {
    const container = document.getElementById("jadwalSlots");
    const card = document.createElement("div");
    card.className = "slot-card";
    card.innerHTML = `
      <button type="button" class="slot-remove" title="Hapus slot">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <div class="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">
        <i class="fa-solid fa-calendar-day mr-1"></i> Slot Hari
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-gray-600 text-xs font-medium mb-1">Hari</label>
          <select class="slot-hari custom-select text-sm" required>
            ${dayOptions.map((day) => `<option value="${day.value}">${day.label}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="block text-gray-600 text-xs font-medium mb-1">Mapel</label>
          <select class="slot-mapel custom-select text-sm" required>
            ${buildOptions(state.mapel, "Pilih mapel")}
          </select>
        </div>
        <div>
          <label class="block text-gray-600 text-xs font-medium mb-1">Jam Mulai</label>
          <input type="text" class="slot-mulai custom-input" placeholder="HH:MM" pattern="[0-2][0-9]:[0-5][0-9]" maxlength="5" />
        </div>
        <div>
          <label class="block text-gray-600 text-xs font-medium mb-1">Jam Selesai</label>
          <input type="text" class="slot-selesai custom-input" placeholder="HH:MM" pattern="[0-2][0-9]:[0-5][0-9]" maxlength="5" />
        </div>
      </div>
    `;
    const removeBtn = card.querySelector(".slot-remove");
    removeBtn.addEventListener("click", () => {
      const all = container.querySelectorAll(".slot-card");
      if (all.length <= 1) return;
      card.remove();
    });

    // Add time input formatter
    const timeInputs = card.querySelectorAll(".slot-mulai, .slot-selesai");
    timeInputs.forEach((input) => {
      input.addEventListener("input", formatTimeInput);
      input.addEventListener("blur", validateTimeInput);
    });

    container.appendChild(card);
  };

  // Update form based on selected siswa
  const updatePrivatForm = (forcedCount = null, startIndex = 1) => {
    const select = document.getElementById("jadwalSiswa");
    const tipeRadio = document.querySelector('input[name="tipeJadwal"]:checked');
    const currentTipe = tipeRadio?.value || "privat";

    // Filter siswa based on selected tipe_les
    const filteredSiswa = state.siswaList.filter(
      (s) => s.tipe_les === currentTipe || currentTipe === "privat"
    );

    const selected = filteredSiswa.find((item) => String(item.enrollment_id) === select.value);

    const programText = document.getElementById("programText");
    const jenjangText = document.getElementById("jenjangText");
    const tarifText = document.getElementById("tarifText");
    const pertemuanText = document.getElementById("pertemuanText");

    if (!selected) {
      programText.textContent = "-";
      jenjangText.textContent = "-";
      tarifText.textContent = "-";
      pertemuanText.textContent = "-";
      renderPrivatSlots(0);
      return;
    }

    const pertemuan = selected.jumlah_pertemuan || 0;
    programText.textContent = selected.program_nama || "-";
    jenjangText.textContent = jenjangLabels[selected.jenjang] || selected.jenjang || "-";
    pertemuanText.textContent = `${pertemuan} pertemuan`;

    // Find matching gaji setting
    const matchingGaji = state.gajiSettings.find(
      (g) => g.tipe_les === selected.tipe_les && g.jenjang === selected.jenjang
    );
    if (matchingGaji && matchingGaji.nominal > 0) {
      tarifText.textContent = formatRupiah(matchingGaji.nominal) + " / pertemuan";
    } else {
      tarifText.textContent = "Belum diatur";
    }

    const target = forcedCount || pertemuan || 1;
    renderPrivatSlots(target, startIndex);
  };

  // Update siswa dropdown based on tipe_les
  const updateSiswaDropdown = () => {
    const tipeRadio = document.querySelector('input[name="tipeJadwal"]:checked');
    const currentTipe = tipeRadio?.value || "privat";
    const jadwalSiswa = document.getElementById("jadwalSiswa");

    // Filter siswa by tipe_les (all non-kelas if "privat", else by exact match)
    let filteredSiswa;
    if (currentTipe === TIPE_LES.KELAS) {
      filteredSiswa = [];
    } else {
      filteredSiswa = state.siswaList.filter((s) => s.tipe_les === currentTipe);
    }

    if (!filteredSiswa.length) {
      jadwalSiswa.innerHTML = `<option value="">Belum ada siswa untuk tipe ${getTipeLesLabel(currentTipe)}</option>`;
    } else {
      jadwalSiswa.innerHTML =
        `<option value="">Pilih siswa</option>` +
        filteredSiswa
          .map(
            (row) =>
              `<option value="${row.enrollment_id}">${row.siswa_nama} - ${row.program_nama} (${jenjangLabels[row.jenjang] || row.jenjang || "-"})</option>`
          )
          .join("");
    }
  };

  // Render kelas groups dropdown
  const renderKelasGroups = () => {
    const select = document.getElementById("jadwalKelas");
    if (!select) return;
    const options = [
      `<option value="">Pilih kelas</option>`,
      `<option value="__new__">+ Buat kelas baru</option>`,
    ];
    state.kelasGroups.forEach((group) => {
      options.push(`<option value="${group.id}">${group.nama}</option>`);
    });
    select.innerHTML = options.join("");
  };

  const renderKelasProgramChecklist = () => {
    const container = document.getElementById("kelasProgramChecklist");
    if (!container) return;
    container.innerHTML = "";
    state.programs.forEach((program) => {
      const label = document.createElement("label");
      label.className = "flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-emerald-300 transition";
      label.innerHTML = `
        <input type="checkbox" value="${program.id}" class="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
        <span class="text-gray-700">${program.nama}</span>
      `;
      container.appendChild(label);
    });
  };

  const getSelectedProgramIds = () => {
    const inputs = Array.from(
      document.querySelectorAll("#kelasProgramChecklist input:checked")
    );
    return inputs.map((input) => Number(input.value));
  };

  const toggleKelasMode = () => {
    const select = document.getElementById("jadwalKelas");
    const createSection = document.getElementById("kelasCreateSection");
    const infoSection = document.getElementById("kelasInfoSection");
    const listEl = document.getElementById("kelasProgramList");
    if (!select) return;
    const value = select.value;
    if (value === "__new__") {
      if (createSection) createSection.classList.remove("hidden");
      if (infoSection) infoSection.classList.add("hidden");
      return;
    }
    if (createSection) createSection.classList.add("hidden");
    if (value) {
      if (infoSection) infoSection.classList.remove("hidden");
    } else {
      if (infoSection) infoSection.classList.add("hidden");
    }
    const selected = state.kelasGroups.find((item) => String(item.id) === String(value));
    if (listEl) {
      listEl.textContent = selected?.program_names || "-";
    }
  };

  const updateKelasSiswa = async () => {
    const select = document.getElementById("jadwalKelas");
    const container = document.getElementById("kelasSiswaList");
    if (!select) return;
    const kelasId = select.value;
    if (!kelasId) {
      container.textContent = "Pilih kelas terlebih dahulu.";
      return;
    }

    if (kelasId === "__new__") {
      const programIds = getSelectedProgramIds();
      if (!programIds.length) {
        container.textContent = "Pilih program kelas terlebih dahulu.";
        return;
      }
      try {
        const rows = await fetchJson(
          `/api/jadwal/kelas/programs/siswa?program_ids=${programIds.join(",")}`
        );
        if (!rows.length) {
          container.textContent = "Belum ada siswa pada program terpilih.";
          return;
        }
        container.innerHTML = rows
          .map((row) => `<div class="py-1"><i class="fa-solid fa-user text-gray-400 mr-2 text-xs"></i>${row.siswa_nama} - <span class="text-gray-500">${row.program_nama}</span></div>`)
          .join("");
      } catch (err) {
        container.textContent = "Gagal memuat siswa.";
      }
      return;
    }

    try {
      const rows = await fetchJson(`/api/jadwal/kelas/${kelasId}/siswa`);
      if (!rows.length) {
        container.textContent = "Belum ada siswa pada kelas ini.";
        return;
      }
      container.innerHTML = rows
        .map((row) => `<div class="py-1"><i class="fa-solid fa-user text-gray-400 mr-2 text-xs"></i>${row.siswa_nama} - <span class="text-gray-500">${row.program_nama}</span></div>`)
        .join("");
    } catch (err) {
      container.textContent = "Gagal memuat siswa.";
    }
  };

  // Toggle between privat and kelas sections
  const toggleTipeJadwal = () => {
    const tipeRadios = document.querySelectorAll('input[name="tipeJadwal"]');
    const tipe = Array.from(tipeRadios).find((r) => r.checked)?.value || "privat";
    state.currentTipe = tipe;

    const privatSection = document.getElementById("privatSection");
    const kelasSection = document.getElementById("kelasSection");
    const addSlotBtn = document.getElementById("addSlotBtn");

    if (tipe === TIPE_LES.KELAS) {
      privatSection.classList.add("hidden");
      kelasSection.classList.remove("hidden");
      addSlotBtn.classList.remove("hidden");
      renderKelasSlots();
      toggleKelasMode();
      updateKelasSiswa();
    } else {
      privatSection.classList.remove("hidden");
      kelasSection.classList.add("hidden");
      addSlotBtn.classList.add("hidden");
      updateSiswaDropdown();
      updatePrivatForm();
    }
  };

  const loadLists = async () => {
    const [privatRows, kelasRows] = await Promise.all([
      fetchJson("/api/jadwal/privat/summary"),
      fetchJson("/api/jadwal/kelas/summary"),
    ]);

    // Combine both lists with tipe_les marker
    const combined = [];
    (privatRows || []).forEach((row) => {
      combined.push({ ...row, tipe_les: row.tipe_les || "privat" });
    });
    (kelasRows || []).forEach((row) => {
      combined.push({ ...row, tipe_les: "kelas" });
    });

    state.jadwalRows = combined;
    renderFilterPills();
    renderJadwalList();
  };

  const initStatusTabs = () => {
    const statusTabs = document.querySelectorAll(".status-tab");
    statusTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        statusTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        state.currentStatus = tab.dataset.status;
        renderJadwalList();

        // Update header text based on status
        const header = document.querySelector("section.glass-panel .p-5.border-b h3");
        const subheader = document.querySelector("section.glass-panel .p-5.border-b p");
        if (header && subheader) {
          if (state.currentStatus === ENROLLMENT_STATUS.SELESAI) {
            header.innerHTML = '<i class="fa-solid fa-check-circle text-emerald-500"></i> Jadwal Selesai';
            subheader.textContent = "Jadwal yang sudah selesai semua pertemuannya (read-only)";
          } else {
            header.innerHTML = '<i class="fa-solid fa-list-check text-indigo-500"></i> Daftar Jadwal';
            subheader.textContent = "Jadwal les privat dan kelas";
          }
        }

        // Hide/show add button based on status
        const addBtn = document.getElementById("openJadwalModal");
        if (addBtn) {
          if (state.currentStatus === ENROLLMENT_STATUS.SELESAI) {
            addBtn.style.display = "none";
          } else if (state.isAdmin) {
            addBtn.style.display = "";
          }
        }
      });
    });
  };

  const initFilters = () => {
    const filterPills = document.querySelectorAll(".filter-pill");
    filterPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        filterPills.forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        state.currentFilter = pill.dataset.filter;
        renderJadwalList();
      });
    });
  };

  const initForms = () => {
    const jadwalModal = document.getElementById("jadwalModal");
    const openJadwalModal = document.getElementById("openJadwalModal");
    const closeJadwalModal = document.getElementById("closeJadwalModal");
    const cancelJadwalModal = document.getElementById("cancelJadwalModal");

    if (openJadwalModal) {
      openJadwalModal.addEventListener("click", () => {
        state.fillSlotIndex = null;
        state.currentTipe = state.tipeLes.length > 0 ? state.tipeLes[0].kode : "privat";
        const firstRadio = document.querySelector(`input[name="tipeJadwal"][value="${state.currentTipe}"]`);
        if (firstRadio) firstRadio.checked = true;
        toggleTipeJadwal();
        openModal(jadwalModal);
      });
    }
    if (closeJadwalModal) {
      closeJadwalModal.addEventListener("click", () => closeModal(jadwalModal));
    }
    if (cancelJadwalModal) {
      cancelJadwalModal.addEventListener("click", () => closeModal(jadwalModal));
    }
    if (jadwalModal) {
      jadwalModal.addEventListener("click", (event) => {
        if (event.target === jadwalModal) closeModal(jadwalModal);
      });
    }

    // Tipe jadwal toggle
    const tipeRadios = document.querySelectorAll('input[name="tipeJadwal"]');
    tipeRadios.forEach((radio) => {
      radio.addEventListener("change", toggleTipeJadwal);
    });

    // Siswa select change
    const jadwalSiswa = document.getElementById("jadwalSiswa");
    jadwalSiswa.addEventListener("change", () => {
      state.fillSlotIndex = null;
      updatePrivatForm();
    });

    // Kelas select change
    const jadwalKelas = document.getElementById("jadwalKelas");
    jadwalKelas.addEventListener("change", () => {
      toggleKelasMode();
      updateKelasSiswa();
    });

    // Program checklist change
    const kelasChecklist = document.getElementById("kelasProgramChecklist");
    if (kelasChecklist) {
      kelasChecklist.addEventListener("change", (event) => {
        if (event.target && event.target.matches("input[type='checkbox']")) {
          updateKelasSiswa();
        }
      });
    }

    // Add slot button
    document.getElementById("addSlotBtn").addEventListener("click", addKelasSlot);

    // Form submit
    document.getElementById("jadwalForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const error = document.getElementById("jadwalError");
      error.textContent = "";

      try {
        if (state.currentTipe !== TIPE_LES.KELAS) {
          // Submit individual jadwal (privat, etc.)
          const enrollmentId = jadwalSiswa.value;
          if (!enrollmentId) throw new Error("Siswa wajib dipilih.");

          const rawSlots = Array.from(document.querySelectorAll("#jadwalSlots .slot-card")).map(
            (card) => ({
              tanggal: card.querySelector(".slot-tanggal").value,
              jam_mulai: card.querySelector(".slot-mulai").value,
              jam_selesai: card.querySelector(".slot-selesai").value,
              edukator_id: card.querySelector(".slot-edukator").value,
              mapel_id: card.querySelector(".slot-mapel").value,
            })
          );
          const filledSlots = rawSlots.filter((slot) => slot.edukator_id && slot.mapel_id);
          const partialSlots = rawSlots.filter((slot) => {
            const hasTime = slot.jam_mulai || slot.jam_selesai;
            return hasTime && !(slot.jam_mulai && slot.jam_selesai);
          });
          if (partialSlots.length) {
            throw new Error("Lengkapi jam mulai dan selesai.");
          }

          await fetchJson("/api/jadwal/privat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enrollment_id: enrollmentId, slots: filledSlots }),
          });

          if (window.notifySuccess) {
            window.notifySuccess("Jadwal disimpan", "Slot terisi diperbarui.");
          }
        } else {
          // Submit kelas jadwal
          const kelasValue = jadwalKelas.value;
          const kelasId = kelasValue && kelasValue !== "__new__" ? kelasValue : null;
          const kelasNama = kelasValue === "__new__" ? document.getElementById("kelasNamaBaru").value.trim() : null;
          const programIds = kelasValue === "__new__" ? getSelectedProgramIds() : [];
          const edukatorId = document.getElementById("kelasEdukator").value;
          const tanggalMulai = document.getElementById("kelasTanggalMulai").value;
          const tanggalAkhir = document.getElementById("kelasTanggalAkhir").value;

          if (!kelasValue) throw new Error("Kelas wajib dipilih.");
          if (kelasValue === "__new__" && !kelasNama) throw new Error("Nama kelas wajib diisi.");
          if (kelasValue === "__new__" && !programIds.length) throw new Error("Program kelas wajib dipilih.");
          if (!edukatorId) throw new Error("Edukator wajib dipilih.");

          const slots = Array.from(document.querySelectorAll("#jadwalSlots .slot-card")).map(
            (card) => ({
              hari: card.querySelector(".slot-hari").value,
              jam_mulai: card.querySelector(".slot-mulai").value,
              jam_selesai: card.querySelector(".slot-selesai").value,
              mapel_id: card.querySelector(".slot-mapel").value,
            })
          );
          const invalidTime = slots.some(
            (slot) =>
              (slot.jam_mulai && !slot.jam_selesai) || (!slot.jam_mulai && slot.jam_selesai)
          );
          if (invalidTime) {
            throw new Error("Jam mulai dan selesai harus diisi bersama.");
          }

          await fetchJson("/api/jadwal/kelas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kelas_id: kelasId,
              kelas_nama: kelasNama,
              program_ids: programIds,
              edukator_id: edukatorId,
              tanggal_mulai: tanggalMulai,
              tanggal_akhir: tanggalAkhir,
              slots,
            }),
          });

          if (window.notifySuccess) {
            window.notifySuccess("Jadwal kelas disimpan", "Slot mingguan diperbarui.");
          }

          // Refresh kelas groups
          const updatedGroups = await fetchJson("/api/jadwal/kelas/groups");
          state.kelasGroups = updatedGroups || [];
          renderKelasGroups();
        }

        await loadLists();
        document.getElementById("jadwalForm").reset();
        toggleTipeJadwal();
        closeModal(jadwalModal);
      } catch (err) {
        error.textContent = err.message;
        if (window.notifyError) {
          window.notifyError("Gagal menyimpan jadwal", err.message);
        }
      }
    });

    // Edit modal
    const editModal = document.getElementById("editModal");
    const closeEditModal = document.getElementById("closeEditModal");
    const cancelEditModal = document.getElementById("cancelEditModal");
    if (closeEditModal) {
      closeEditModal.addEventListener("click", () => closeModal(editModal));
    }
    if (cancelEditModal) {
      cancelEditModal.addEventListener("click", () => closeModal(editModal));
    }
    if (editModal) {
      editModal.addEventListener("click", (event) => {
        if (event.target === editModal) closeModal(editModal);
      });
    }

    // Add time input formatter to edit modal
    const editMulai = document.getElementById("editMulai");
    const editSelesai = document.getElementById("editSelesai");
    [editMulai, editSelesai].forEach((input) => {
      if (input) {
        input.addEventListener("input", formatTimeInput);
        input.addEventListener("blur", validateTimeInput);
      }
    });

    document.getElementById("editForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const error = document.getElementById("editError");
      error.textContent = "";
      try {
        const id = document.getElementById("editJadwalId").value;
        const jamMulai = document.getElementById("editMulai").value;
        const jamSelesai = document.getElementById("editSelesai").value;
        if ((jamMulai && !jamSelesai) || (!jamMulai && jamSelesai)) {
          throw new Error("Jam mulai dan selesai harus diisi bersama.");
        }
        await fetchJson(`/api/jadwal/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tanggal: document.getElementById("editTanggal").value,
            jam_mulai: jamMulai,
            jam_selesai: jamSelesai,
            edukator_id: document.getElementById("editEdukator").value,
            mapel_id: document.getElementById("editMapel").value,
          }),
        });
        if (window.notifySuccess) {
          window.notifySuccess("Jadwal diperbarui", "Perubahan tersimpan.");
        }
        // Close edit modal first, then refresh detail
        closeModal(editModal);
        await loadLists();
        if (state.detailContext) {
          await openDetailModal(state.detailContext.id, state.detailContext.tipe);
        }
      } catch (err) {
        error.textContent = err.message;
        if (window.notifyError) {
          window.notifyError("Gagal memperbarui jadwal", err.message);
        }
      }
    });

    // Detail modal
    const detailModal = document.getElementById("detailModal");
    const closeDetailModal = document.getElementById("closeDetailModal");
    const closeDetailFooter = document.getElementById("closeDetailFooter");
    if (closeDetailModal) {
      closeDetailModal.addEventListener("click", () => closeModal(detailModal));
    }
    if (closeDetailFooter) {
      closeDetailFooter.addEventListener("click", () => closeModal(detailModal));
    }
    if (detailModal) {
      detailModal.addEventListener("click", (event) => {
        if (event.target === detailModal) closeModal(detailModal);
      });
    }

    // Detail row actions
    document.getElementById("detailRows").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      if (button.dataset.action === "edit") {
        const row = state.detailSlots.find((item) => String(item.id) === button.dataset.id);
        if (!row) return;
        openEditModal(row);
      }
      if (button.dataset.action === "fill") {
        const enrollmentId = button.dataset.enrollment;
        const pertemuan = Number(button.dataset.pertemuan || 1);
        openJadwalModalWith(enrollmentId, pertemuan);
        closeModal(detailModal);
      }
    });

    // Jadwal list actions
    document.getElementById("jadwalList").addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      const tipe = button.dataset.tipe;
      const id = button.dataset.id;

      if (action === "detail") {
        if (tipe === "privat") {
          await openDetailModal(id, "privat");
        } else {
          await openDetailModal(id, "kelas");
        }
      }
      if (action === "delete") {
        const confirmMsg = tipe === "privat"
          ? "Hapus seluruh jadwal untuk siswa ini?"
          : "Hapus seluruh jadwal untuk kelas ini?";
        if (window.confirm(confirmMsg)) {
          try {
            const url = tipe === "privat"
              ? `/api/jadwal/privat/enrollment/${id}`
              : `/api/jadwal/kelas/${id}`;
            await fetchJson(url, { method: "DELETE" });
            if (window.notifySuccess) {
              window.notifySuccess("Jadwal dihapus", "Silakan tambah jadwal baru.");
            }
            await loadLists();
          } catch (err) {
            if (window.notifyError) {
              window.notifyError("Gagal menghapus jadwal", err.message);
            }
          }
        }
      }
    });
  };

  const openJadwalModalWith = (enrollmentId, pertemuan) => {
    const select = document.getElementById("jadwalSiswa");
    // Find the siswa's tipe_les
    const siswa = state.siswaList.find((s) => String(s.enrollment_id) === String(enrollmentId));
    if (siswa) {
      state.currentTipe = siswa.tipe_les || "privat";
      const radio = document.querySelector(`input[name="tipeJadwal"][value="${state.currentTipe}"]`);
      if (radio) radio.checked = true;
    }
    toggleTipeJadwal();
    if (select) {
      select.value = enrollmentId;
    }
    state.fillSlotIndex = pertemuan || 1;
    updatePrivatForm(1, state.fillSlotIndex);
    openModal(document.getElementById("jadwalModal"));
  };

  const openEditModal = (row) => {
    if (row.status_jadwal === JADWAL_STATUS.COMPLETED) {
      if (window.notifyError) {
        window.notifyError("Tidak bisa diedit", "Jadwal yang sudah selesai tidak dapat diubah.");
      }
      return;
    }
    const editModal = document.getElementById("editModal");
    document.getElementById("editJadwalId").value = row.id;
    // Fix: Use the raw date string to avoid timezone issues
    document.getElementById("editTanggal").value = formatDate(row.tanggal) || "";
    document.getElementById("editMulai").value = formatTime24(row.jam_mulai) !== "-" ? formatTime24(row.jam_mulai) : "";
    document.getElementById("editSelesai").value = formatTime24(row.jam_selesai) !== "-" ? formatTime24(row.jam_selesai) : "";
    document.getElementById("editEdukator").value = row.edukator_id || "";
    document.getElementById("editMapel").value = row.mapel_id || "";
    openModal(editModal);
  };

  const openDetailModal = async (id, tipe) => {
    const modal = document.getElementById("detailModal");
    const subtitle = document.getElementById("detailSubtitle");
    const detailRows = document.getElementById("detailRows");
    detailRows.innerHTML = "";
    state.detailContext = { id, tipe };

    if (tipe === "privat") {
      const rows = await fetchJson(`/api/jadwal/privat/${id}/slots`);
      if (!rows.length) return;

      const jumlahPertemuan = Number(rows[0].jumlah_pertemuan || 0);
      const tipeLesLabel = getTipeLesLabel(rows[0].tipe_les || "privat");
      subtitle.textContent = `${rows[0].siswa_nama || "-"} - ${rows[0].program_nama || "-"} (${tipeLesLabel})`;

      const filled = rows.filter((row) => row.id);
      state.detailSlots = filled;
      const entries = [];
      for (let i = 1; i <= (jumlahPertemuan || filled.length); i += 1) {
        entries.push(filled[i - 1] || null);
      }

      // Check if this jadwal group is selesai (all slots completed)
      const jadwalGroupSelesai = jumlahPertemuan > 0 && filled.length >= jumlahPertemuan &&
        filled.every((slot) => slot.status_jadwal === JADWAL_STATUS.COMPLETED);

      entries.forEach((entry, index) => {
        const tr = document.createElement("tr");
        if (entry) {
          const statusText = entry.status_jadwal === JADWAL_STATUS.COMPLETED ? "Selesai" : "Belum";
          const statusClass = entry.status_jadwal === JADWAL_STATUS.COMPLETED ? "completed" : "pending";
          const jamText = entry.jam_mulai
            ? `${formatTime24(entry.jam_mulai)}${entry.jam_selesai ? " - " + formatTime24(entry.jam_selesai) : ""}`
            : "-";
          const dayName = getDayName(entry.tanggal);

          const isSlotSelesai = entry.status_jadwal === JADWAL_STATUS.COMPLETED;
          // Only show edit button if not viewing from selesai tab or slot/group selesai
          const actionCell = state.currentStatus === ENROLLMENT_STATUS.SELESAI || jadwalGroupSelesai || isSlotSelesai
            ? `<td class="text-center text-gray-400 text-xs">-</td>`
            : `<td class="text-center">
                <button class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg text-xs font-semibold transition" data-action="edit" data-id="${entry.id}">
                  <i class="fa-solid fa-pen mr-1"></i> Edit
                </button>
              </td>`;

          tr.innerHTML = `
            <td class="font-semibold text-gray-700">Pertemuan ${index + 1}</td>
            <td><span class="text-indigo-600 font-medium">${dayName}</span></td>
            <td>${formatDateDisplay(entry.tanggal)}</td>
            <td class="font-mono text-sm">${jamText}</td>
            <td>${entry.edukator_nama || "-"}</td>
            <td>${entry.mapel_nama || "-"}</td>
            <td class="max-w-[150px] truncate">${entry.materi || "-"}</td>
            <td><span class="status-pill ${statusClass}">${statusText}</span></td>
            ${actionCell}
          `;
        } else {
          // Only show fill button if not viewing from selesai tab
          const actionCell = state.currentStatus === ENROLLMENT_STATUS.SELESAI || jadwalGroupSelesai
            ? `<td class="text-center text-gray-400 text-xs">-</td>`
            : `<td class="text-center">
                <button class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-semibold transition" data-action="fill" data-enrollment="${id}" data-pertemuan="${index + 1}">
                  <i class="fa-solid fa-plus mr-1"></i> Isi
                </button>
              </td>`;

          tr.innerHTML = `
            <td class="font-semibold text-gray-700">Pertemuan ${index + 1}</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td><span class="status-pill empty">Slot tersedia</span></td>
            ${actionCell}
          `;
        }
        detailRows.appendChild(tr);
      });
      } else {
        // Kelas detail
        const rows = await fetchJson(`/api/jadwal/kelas/${id}/slots`);
        if (!rows.length) return;

        subtitle.textContent = `${rows[0].kelas_nama || "-"} (Kelas)`;
        state.detailSlots = rows;

        rows.forEach((row) => {
          const statusText = row.status_jadwal === JADWAL_STATUS.COMPLETED ? "Selesai" : "Belum";
          const statusClass = row.status_jadwal === JADWAL_STATUS.COMPLETED ? "completed" : "pending";
          const jamText = row.jam_mulai
            ? `${formatTime24(row.jam_mulai)}${row.jam_selesai ? " - " + formatTime24(row.jam_selesai) : ""}`
            : "-";
          const dayName = getDayName(row.tanggal);
          const actionCell = state.currentStatus === ENROLLMENT_STATUS.SELESAI || row.status_jadwal === JADWAL_STATUS.COMPLETED
            ? `<td class="text-center text-gray-400 text-xs">-</td>`
            : `<td class="text-center">
                <button class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg text-xs font-semibold transition" data-action="edit" data-id="${row.id}">
                  <i class="fa-solid fa-pen mr-1"></i> Edit
                </button>
              </td>`;
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>-</td>
            <td><span class="text-emerald-600 font-medium">${dayName}</span></td>
            <td>${formatDateDisplay(row.tanggal)}</td>
            <td class="font-mono text-sm">${jamText}</td>
            <td>${row.edukator_nama || "-"}</td>
            <td>${row.mapel_nama || "-"}</td>
            <td class="max-w-[150px] truncate">${row.materi || "-"}</td>
            <td><span class="status-pill ${statusClass}">${statusText}</span></td>
            ${actionCell}
          `;
          detailRows.appendChild(tr);
        });
      }

    openModal(modal);
  };

  const openModal = (modal) => {
    if (!modal) return;
    modal.classList.remove("hidden");
    setTimeout(() => {
      modal.classList.add("show");
    }, 10);
  };

  const closeModal = (modal) => {
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => {
      modal.classList.add("hidden");
    }, 200);
  };

  const init = async () => {
    initStatusTabs();
    initFilters();
    initForms();

    try {
      const session = await fetchJson("/api/auth/session");
      const role = session && session.loggedIn ? session.user.role : null;
      const isAdmin = role === ROLES.ADMIN_CABANG || role === ROLES.SUPER_ADMIN;
      state.isAdmin = isAdmin;

      if (!isAdmin) {
        const openBtn = document.getElementById("openJadwalModal");
        if (openBtn) openBtn.style.display = "none";
      }

      if (isAdmin) {
        const [mapelRows, edukatorRows, programRows, siswaRows, kelasGroups, gajiSettings, tipeLesRows] = await Promise.all([
          fetchJson("/api/mapel"),
          fetchJson("/api/edukator"),
          fetchJson("/api/program"),
          fetchJson("/api/jadwal/privat/siswa"),
          fetchJson("/api/jadwal/kelas/groups"),
          fetchJson("/api/penggajian/setting").catch(() => []),
          fetchJson("/api/penggajian/tipe-les").catch(() => []),
        ]);

        state.mapel = (mapelRows || []).filter((item) => item.is_active !== 0);
        state.edukator = (edukatorRows || []).filter((item) => item.is_active !== 0);
        state.programs = (programRows || []).filter((item) => item.tipe_les === TIPE_LES.KELAS);
        state.siswaList = siswaRows || [];
        state.kelasGroups = kelasGroups || [];
        state.gajiSettings = gajiSettings || [];
        state.tipeLes = tipeLesRows || [];

        // Add default tipe_les if none exist
        if (!state.tipeLes.length) {
          state.tipeLes = [
            { kode: "privat", nama: "Privat", deskripsi: "Les privat 1 siswa" },
            { kode: "kelas", nama: "Kelas", deskripsi: "Les kelas/reguler" },
          ];
        }

        // Render tipe jadwal options
        renderTipeJadwalOptions();

        renderKelasGroups();
        renderKelasProgramChecklist();

        document.getElementById("kelasEdukator").innerHTML = buildOptions(
          state.edukator,
          "Pilih edukator"
        );
        document.getElementById("editEdukator").innerHTML = buildOptions(
          state.edukator,
          "Pilih edukator"
        );
        document.getElementById("editMapel").innerHTML = buildOptions(
          state.mapel,
          "Pilih mapel"
        );

        toggleTipeJadwal();
      }

      await loadLists();
    } catch (err) {
      console.error(err);
      await loadLists();
    }
  };

  init();
})();
