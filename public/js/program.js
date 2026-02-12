(() => {
  const requester = window.api?.request || fetch;
  const { TIPE_LES } = window.APP_CONSTANTS;
  const unwrapData = (payload) => {
    if (payload && typeof payload === "object" && "data" in payload) {
      return payload.data;
    }
    return payload;
  };

  // --- DOM Elements ---
  const rowsActiveEl = document.getElementById("programRowsActive");
  const rowsInactiveEl = document.getElementById("programRowsInactive");
  const tableActiveEl = document.getElementById("programTableActive");
  const tableInactiveEl = document.getElementById("programTableInactive");
  const emptyActiveEl = document.getElementById("programEmptyActive");
  const emptyInactiveEl = document.getElementById("programEmptyInactive");
  const paginationActiveEl = document.getElementById("paginationActive");
  const paginationInactiveEl = document.getElementById("paginationInactive");

  const countActiveEl = document.getElementById("programCountActive");
  const countInactiveEl = document.getElementById("programCountInactive");

  // Search & Filter
  const searchInput = document.getElementById("searchInput");
  const filterJenjang = document.getElementById("filterJenjang");

  // Modal & Form
  const addButton = document.getElementById("addProgram");
  const modal = document.getElementById("programModal");
  const closeModalBtn = document.getElementById("closeModal");
  const cancelModalBtn = document.getElementById("cancelModal");
  const modalTitle = document.getElementById("modalTitle");
  const form = document.getElementById("programForm");
  const formError = document.getElementById("formError");

  const fields = {
    program_id: document.getElementById("program_id"),
    program_nama: document.getElementById("program_nama"),
    program_jenjang: document.getElementById("program_jenjang"),
    program_tipe: document.getElementById("program_tipe"),
    program_tarif: document.getElementById("program_tarif"),
    program_pertemuan: document.getElementById("program_pertemuan"),
    program_harga: document.getElementById("program_harga"),
    program_transport_edukator: document.getElementById("program_transport_edukator"),
    program_transport_ilhami: document.getElementById("program_transport_ilhami"),
    program_deskripsi: document.getElementById("program_deskripsi"),
    program_active: document.getElementById("program_active"),
    program_tarif_tidak_hadir: document.getElementById("program_tarif_tidak_hadir"),
  };

  const transportSection = document.getElementById("transportSection");
  const tarifTidakHadirSection = document.getElementById("tarifTidakHadirSection");
  const gajiInfoEl = document.getElementById("gajiInfo");

  // --- State ---
  const state = {
    rows: [],
    filteredRows: [],
    mode: "create",
    tarifOptions: [], // Tarif options for current kategori_les
    gajiSetting: [],
    searchQuery: "",
    filterJenjang: "",
    pageActive: 1,
    pageInactive: 1,
    perPage: 10,
  };

  // --- Jenjang Labels ---
  const jenjangLabels = {
    PAUD_TK: "PAUD/TK",
    SD: "SD",
    SMP: "SMP",
    SMA: "SMA",
    ALUMNI: "Alumni",
  };

  // --- Helpers ---
  const formatCurrency = (value) => {
    const number = Number(value || 0);
    return new Intl.NumberFormat("id-ID").format(number);
  };

  // Get gaji from setting based on tarif_id + jenjang (using Sarjana as default klasifikasi for display)
  const getGajiFromSetting = (tarifId, jenjang) => {
    if (!tarifId || !jenjang) return null;
    // First find the tarif to get nama_tarif and kategori_les
    const tarif = state.gajiSetting.find(s => s.id === Number(tarifId));
    if (!tarif) return null;

    // Find the gaji setting for this nama_tarif + kategori_les + jenjang
    const found = state.gajiSetting.find(
      s => s.nama_tarif === tarif.nama_tarif &&
           s.kategori_les === tarif.kategori_les &&
           s.jenjang === jenjang &&
           s.klasifikasi_edukator === 'Sarjana'
    );
    return found ? found.nominal : null;
  };

  // Get gaji from setting by nama_tarif + kategori_les + jenjang
  const getGajiByTarifNameAndJenjang = (namaTarif, kategoriLes, jenjang) => {
    if (!namaTarif || !kategoriLes || !jenjang) return null;
    const found = state.gajiSetting.find(
      s => s.nama_tarif === namaTarif &&
           s.kategori_les === kategoriLes &&
           s.jenjang === jenjang &&
           s.klasifikasi_edukator === 'Sarjana'
    );
    return found ? found.nominal : null;
  };

  // Auto-fill gaji from setting when jenjang + tarif changes
  const autoFillGajiFromSetting = () => {
    const jenjang = fields.program_jenjang?.value;
    const tarifId = fields.program_tarif?.value;

    if (!jenjang || !tarifId) {
      updateGajiInfo(null);
      return;
    }

    // Get tarif info
    const tarif = state.tarifOptions.find(t => String(t.id) === String(tarifId));
    if (!tarif) {
      updateGajiInfo(null);
      return;
    }

    const gaji = getGajiByTarifNameAndJenjang(tarif.nama_tarif, tarif.kategori_les, jenjang);
    updateGajiInfo(gaji, jenjang, tarif);
  };

  // Update gaji info display
  const updateGajiInfo = (gaji, jenjang, tarif) => {
    if (!gajiInfoEl) return;

    if (gaji !== null && gaji > 0) {
      const kategoriLabel = tarif?.kategori_les === TIPE_LES.PRIVAT ? 'Privat' : 'Kelas';
      gajiInfoEl.innerHTML = `
        <div class="flex items-center gap-2 text-emerald-600">
          <i class="fa-solid fa-circle-check"></i>
          <span class="text-sm font-medium">
            Gaji ${tarif?.nama_tarif || ''} (${kategoriLabel}) untuk ${jenjangLabels[jenjang] || jenjang}:
            <strong>Rp ${formatCurrency(gaji)}</strong>/pertemuan
          </span>
        </div>
      `;
      gajiInfoEl.classList.remove('hidden');
    } else if (jenjang && tarif) {
      gajiInfoEl.innerHTML = `
        <div class="flex items-center gap-2 text-amber-600">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span class="text-sm">Tarif belum diatur untuk jenjang ini. Silakan atur di menu Penggajian > Setting Tarif.</span>
        </div>
      `;
      gajiInfoEl.classList.remove('hidden');
    } else {
      gajiInfoEl.classList.add('hidden');
    }
  };

  // --- Filtering Logic ---
  const applyFilters = () => {
    let data = state.rows;

    // Filter by jenjang
    if (state.filterJenjang) {
      data = data.filter(item => item.jenjang === state.filterJenjang);
    }

    // Filter by search
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      data = data.filter(item =>
        (item.nama && item.nama.toLowerCase().includes(q)) ||
        (item.tipe_les && item.tipe_les.toLowerCase().includes(q)) ||
        (item.mapel_nama && item.mapel_nama.toLowerCase().includes(q))
      );
    }

    state.filteredRows = data;
    state.pageActive = 1;
    state.pageInactive = 1;
    render();
  };

  // --- Pagination ---
  const paginate = (data, page) => {
    const start = (page - 1) * state.perPage;
    const end = start + state.perPage;
    return data.slice(start, end);
  };

  const renderPagination = (container, totalItems, currentPage, onPageChange) => {
    if (!container) return;
    container.innerHTML = "";

    const totalPages = Math.ceil(totalItems / state.perPage);
    if (totalPages <= 1) return;

    // Prev button
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn bg-white border border-gray-200 text-gray-600";
    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => onPageChange(currentPage - 1));
    container.appendChild(prevBtn);

    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      const firstBtn = document.createElement("button");
      firstBtn.className = "pagination-btn bg-white border border-gray-200 text-gray-600";
      firstBtn.textContent = "1";
      firstBtn.addEventListener("click", () => onPageChange(1));
      container.appendChild(firstBtn);

      if (startPage > 2) {
        const dots = document.createElement("span");
        dots.className = "px-2 text-gray-400";
        dots.textContent = "...";
        container.appendChild(dots);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const btn = document.createElement("button");
      btn.className = `pagination-btn ${i === currentPage ? 'active' : 'bg-white border border-gray-200 text-gray-600'}`;
      btn.textContent = i;
      btn.addEventListener("click", () => onPageChange(i));
      container.appendChild(btn);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const dots = document.createElement("span");
        dots.className = "px-2 text-gray-400";
        dots.textContent = "...";
        container.appendChild(dots);
      }

      const lastBtn = document.createElement("button");
      lastBtn.className = "pagination-btn bg-white border border-gray-200 text-gray-600";
      lastBtn.textContent = totalPages;
      lastBtn.addEventListener("click", () => onPageChange(totalPages));
      container.appendChild(lastBtn);
    }

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn bg-white border border-gray-200 text-gray-600";
    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener("click", () => onPageChange(currentPage + 1));
    container.appendChild(nextBtn);
  };

  // --- Render Table Row ---
  const renderTableRow = (item) => {
    // Tipe les display (privat/kelas)
    const tipeLabel = item.tipe_les === TIPE_LES.PRIVAT ? 'Privat' : item.tipe_les === TIPE_LES.KELAS ? 'Kelas' : item.tipe_les || '-';
    const tipeColor = item.tipe_les === TIPE_LES.KELAS
      ? "bg-blue-100 text-blue-700"
      : item.tipe_les === TIPE_LES.PRIVAT
      ? "bg-purple-100 text-purple-700"
      : "bg-gray-100 text-gray-700";

    // Tarif display
    const tarifLabel = item.nama_tarif || 'Reguler';

    const jenjangLabel = jenjangLabels[item.jenjang] || "-";
    const jenjangColor = item.jenjang
      ? "bg-amber-100 text-amber-700"
      : "bg-gray-100 text-gray-500";

    const pertemuanLabel = item.jumlah_pertemuan ? `${item.jumlah_pertemuan} sesi` : "-";

    // Get gaji from setting using tarif_id
    const gajiFromSetting = item.tarif_id && item.jenjang
      ? getGajiByTarifNameAndJenjang(item.nama_tarif, item.kategori_les, item.jenjang)
      : null;
    const transportTotal = Number(item.transport_edukator || 0) + Number(item.transport_ilhami || 0);

    return `
      <tr class="hover:bg-gray-50 transition">
        <td class="px-4 py-3">
          <div>
            <div class="font-semibold text-gray-800">${item.nama}</div>
            ${item.deskripsi ? `<div class="text-xs text-gray-400 truncate max-w-xs">${item.deskripsi}</div>` : ''}
          </div>
        </td>
        <td class="px-4 py-3">
          <span class="inline-block px-2 py-1 rounded text-xs font-semibold ${jenjangColor}">${jenjangLabel}</span>
        </td>
        <td class="px-4 py-3">
          <div class="text-xs text-gray-600 max-w-[200px] truncate" title="${item.mapel_nama || '-'}">${item.mapel_nama || '-'}</div>
        </td>
        <td class="px-4 py-3">
          <div class="flex flex-col gap-1">
            <span class="inline-block px-2 py-1 rounded text-xs font-semibold ${tipeColor} w-fit">${tipeLabel}</span>
            ${item.nama_tarif ? `<span class="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-600 w-fit">${tarifLabel}</span>` : ''}
          </div>
        </td>
        <td class="px-4 py-3 text-gray-600">${pertemuanLabel}</td>
        <td class="px-4 py-3 text-right font-semibold text-indigo-600">Rp ${formatCurrency(item.harga)}</td>
        <td class="px-4 py-3 text-right">
          ${gajiFromSetting !== null ? `<span class="font-medium text-emerald-600">Rp ${formatCurrency(gajiFromSetting)}</span>` : '<span class="text-gray-400">-</span>'}
          ${transportTotal > 0 ? `<div class="text-[10px] text-gray-400">+Transport Rp ${formatCurrency(transportTotal)}</div>` : ''}
        </td>
        <td class="px-4 py-3">
          <div class="flex items-center justify-center gap-1">
            <button class="w-8 h-8 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition flex items-center justify-center"
                    data-action="edit" data-id="${item.id}" title="Edit">
              <i class="fa-regular fa-pen-to-square"></i>
            </button>
            <button class="w-8 h-8 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition flex items-center justify-center"
                    data-action="toggle" data-id="${item.id}" title="${item.is_active ? 'Nonaktifkan' : 'Aktifkan'}">
              <i class="fa-solid ${item.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
            </button>
            <button class="w-8 h-8 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition flex items-center justify-center"
                    data-action="delete" data-id="${item.id}" title="Hapus">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  };

  // --- Render Functions ---
  const renderSection = (data, container, tableEl, emptyEl, paginationEl, page, setPage) => {
    if (!container) return;

    if (!data.length) {
      if (tableEl) tableEl.classList.add("hidden");
      if (emptyEl) emptyEl.classList.remove("hidden");
      if (paginationEl) paginationEl.innerHTML = "";
      return;
    }

    if (tableEl) tableEl.classList.remove("hidden");
    if (emptyEl) emptyEl.classList.add("hidden");

    const paged = paginate(data, page);
    container.innerHTML = paged.map(renderTableRow).join("");

    renderPagination(paginationEl, data.length, page, (newPage) => {
      setPage(newPage);
      render();
    });
  };

  const render = () => {
    const active = state.filteredRows.filter((item) => item.is_active);
    const inactive = state.filteredRows.filter((item) => !item.is_active);

    renderSection(
      active,
      rowsActiveEl,
      tableActiveEl,
      emptyActiveEl,
      paginationActiveEl,
      state.pageActive,
      (p) => { state.pageActive = p; }
    );

    renderSection(
      inactive,
      rowsInactiveEl,
      tableInactiveEl,
      emptyInactiveEl,
      paginationInactiveEl,
      state.pageInactive,
      (p) => { state.pageInactive = p; }
    );

    if (countActiveEl) countActiveEl.textContent = `${active.length}`;
    if (countInactiveEl) countInactiveEl.textContent = `${inactive.length}`;
  };

  // --- Render Tarif Options ---
  const renderTarifOptions = (selectedTarifId = null) => {
    if (!fields.program_tarif) return;

    if (!state.tarifOptions.length) {
      fields.program_tarif.innerHTML = '<option value="">-- Tidak ada tarif tersedia --</option>';
      return;
    }

    fields.program_tarif.innerHTML = state.tarifOptions.map(tarif =>
      `<option value="${tarif.id}" ${String(tarif.id) === String(selectedTarifId) ? 'selected' : ''}>${tarif.nama_tarif}</option>`
    ).join('');
  };

  // Tarif tidak hadir section is now always visible (for all tipe_les)
  const toggleTarifTidakHadirSection = (tipeLes) => {
    // No longer hiding based on tipe_les - always visible
  };

  // Load tarif options based on selected tipe_les (kategori_les)
  const loadTarifOptions = async (kategoriLes, selectedTarifId = null) => {
    if (!fields.program_tarif) return;

    if (!kategoriLes) {
      fields.program_tarif.innerHTML = '<option value="">-- Pilih Tipe Les terlebih dahulu --</option>';
      state.tarifOptions = [];
      return;
    }

    try {
      const res = await requester(`/api/penggajian/tarif-for-program?kategori_les=${encodeURIComponent(kategoriLes)}`, { credentials: "same-origin" });
      if (!res.ok) {
        state.tarifOptions = [];
      } else {
        const payload = await res.json();
        const data = unwrapData(payload);
        state.tarifOptions = Array.isArray(data) ? data : [];
      }
      renderTarifOptions(selectedTarifId);
    } catch (err) {
      state.tarifOptions = [];
      fields.program_tarif.innerHTML = '<option value="">-- Error loading tarif --</option>';
    }
  };


  // --- Fetching ---
  const fetchProgram = async () => {
    try {
      const res = await requester("/api/program", { credentials: "same-origin" });
      if (!res.ok) {
        state.rows = [];
      } else {
        const payload = await res.json();
        const data = unwrapData(payload);
        state.rows = Array.isArray(data) ? data : [];
      }
      applyFilters();
    } catch (err) {
      state.rows = [];
      applyFilters();
    }
  };

  const fetchGajiSetting = async () => {
    try {
      const res = await requester("/api/penggajian/setting", { credentials: "same-origin" });
      if (!res.ok) {
        state.gajiSetting = [];
      } else {
        const payload = await res.json();
        const data = unwrapData(payload);
        state.gajiSetting = Array.isArray(data) ? data : [];
      }
    } catch (err) {
      state.gajiSetting = [];
    }
  };

  // --- Event Listeners ---
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      applyFilters();
    });
  }

  if (filterJenjang) {
    filterJenjang.addEventListener("change", (e) => {
      state.filterJenjang = e.target.value;
      applyFilters();
    });
  }

  // --- Modal Logic ---
  const setModalVisible = (targetModal, isVisible) => {
    if (!targetModal) return;
    const card = targetModal.querySelector(".modal-card");
    if (isVisible) {
      targetModal.classList.remove("hidden", "opacity-0", "pointer-events-none");
      if (card) {
        card.classList.remove("scale-95");
        card.classList.add("scale-100");
      }
      return;
    }
    targetModal.classList.add("hidden", "opacity-0", "pointer-events-none");
    if (card) {
      card.classList.add("scale-95");
      card.classList.remove("scale-100");
    }
  };

  const openModal = async (mode, data) => {
    if (!modal || !form) return;
    state.mode = mode;
    form.reset();
    if (formError) formError.classList.add('hidden');

    fields.program_id.value = data?.id || "";
    fields.program_nama.value = data?.nama || "";
    fields.program_jenjang.value = data?.jenjang || "";
    fields.program_tipe.value = data?.tipe_les || TIPE_LES.PRIVAT;
    fields.program_pertemuan.value = data?.jumlah_pertemuan || "";
    fields.program_harga.value = data?.harga || "";
    fields.program_deskripsi.value = data?.deskripsi || "";
    fields.program_active.checked = data ? (data.is_active ? true : false) : true;

    // Transport fields
    if (fields.program_transport_edukator) {
      fields.program_transport_edukator.value = data?.transport_edukator || "";
    }
    if (fields.program_transport_ilhami) {
      fields.program_transport_ilhami.value = data?.transport_ilhami || "";
    }

    // Load tarif options based on tipe_les
    const tipeLes = data?.tipe_les || TIPE_LES.PRIVAT;
    await loadTarifOptions(tipeLes, data?.tarif_id || null);

    // Toggle tarif tidak hadir section and set value
    toggleTarifTidakHadirSection(tipeLes);
    if (fields.program_tarif_tidak_hadir) {
      fields.program_tarif_tidak_hadir.value = data?.tarif_tidak_hadir || "";
    }

    // Update gaji info
    autoFillGajiFromSetting();

    if (modalTitle) {
      modalTitle.textContent = mode === "edit" ? "Edit Program" : "Tambah Program";
    }

    setModalVisible(modal, true);
  };

  const closeModal = () => {
    setModalVisible(modal, false);
  };

  // --- CRUD Operations ---
  const createPayload = () => {
    const tipeLes = fields.program_tipe.value;
    const tarifId = fields.program_tarif?.value || null;
    const payload = {
      nama: fields.program_nama.value.trim(),
      jenjang: fields.program_jenjang.value || null,
      tipe_les: tipeLes,
      tarif_id: tarifId,
      jumlah_pertemuan: fields.program_pertemuan.value || null,
      harga: fields.program_harga.value || 0,
      deskripsi: fields.program_deskripsi.value.trim(),
      is_active: fields.program_active.checked,
      // Transport fields (apply to all types)
      transport_edukator: fields.program_transport_edukator?.value || 0,
      transport_ilhami: fields.program_transport_ilhami?.value || 0,
      // Tarif tidak hadir (apply to all types)
      tarif_tidak_hadir: fields.program_tarif_tidak_hadir?.value || 0,
      // Gaji per pertemuan is now from setting, but keep field for backward compat
      gaji_per_pertemuan: 0,
    };

    return payload;
  };

  const saveProgram = async (payload, id) => {
    const url = id ? `/api/program/${id}` : "/api/program";
    const method = id ? "PUT" : "POST";

    const res = await requester(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Gagal menyimpan data.");
    }
  };

  const deleteProgram = async (id) => {
    const res = await requester(`/api/program/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Gagal menghapus data.");
    }
  };

  // --- Click Handlers ---
  if (addButton) {
    addButton.addEventListener("click", () => {
      openModal("create");
    });
  }
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener("click", closeModal);

  // Delegation for Table Actions
  const handleRowClick = async (event) => {
    const target = event.target;
    const button = target.closest("button[data-action]");
    if (!button) return;

    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");
    if (!action || !id) return;

    const program = state.rows.find((row) => String(row.id) === String(id));
    if (!program) return;

    if (action === "edit") {
      openModal("edit", program);
    }

    if (action === "toggle") {
      try {
        await saveProgram({ is_active: !program.is_active }, id);
        if (window.toast.success) window.toast.success("Status diperbarui", program.nama);
        fetchProgram();
      } catch (err) {
        if (window.toast.error) window.toast.error("Gagal update", err.message);
      }
    }

    if (action === "delete") {
      if (!confirm(`Hapus program: ${program.nama}?`)) return;
      try {
        await deleteProgram(id);
        if (window.toast.success) window.toast.success("Terhapus", "Program berhasil dihapus.");
        fetchProgram();
      } catch (err) {
        if (window.toast.error) window.toast.error("Gagal hapus", err.message);
      }
    }
  };

  if (rowsActiveEl) rowsActiveEl.addEventListener("click", handleRowClick);
  if (rowsInactiveEl) rowsInactiveEl.addEventListener("click", handleRowClick);

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const payload = createPayload();

        if (!payload.nama || !payload.tipe_les) {
          throw new Error("Nama dan Tipe Les wajib diisi.");
        }
        if (!payload.harga) {
          throw new Error("Harga paket wajib diisi.");
        }

        await saveProgram(payload, fields.program_id.value || null);

        if (window.toast.success) {
          window.toast.success(
            fields.program_id.value ? "Program Diperbarui" : "Program Ditambahkan",
            payload.nama
          );
        }
        closeModal();
        fetchProgram();
      } catch (err) {
        if (formError) {
          formError.textContent = err.message;
          formError.classList.remove('hidden');
        }
        if (window.notifyWarning) window.notifyWarning("Validasi Gagal", err.message);
      }
    });
  }

  // --- Event Listeners for Gaji Auto-fill ---
  if (fields.program_jenjang) {
    fields.program_jenjang.addEventListener("change", autoFillGajiFromSetting);
  }
  if (fields.program_tipe) {
    fields.program_tipe.addEventListener("change", async () => {
      const tipeLes = fields.program_tipe.value;
      await loadTarifOptions(tipeLes);
      autoFillGajiFromSetting();
      toggleTarifTidakHadirSection(tipeLes);
    });
  }
  if (fields.program_tarif) {
    fields.program_tarif.addEventListener("change", autoFillGajiFromSetting);
  }

  // --- Init ---
  fetchGajiSetting().then(() => {
  const requester = window.api?.request || fetch;
    fetchProgram();
  });
})();

