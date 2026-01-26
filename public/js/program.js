(() => {
  // --- DOM Elements ---
  const rowsActiveEl = document.getElementById("programRowsActive");
  const rowsInactiveEl = document.getElementById("programRowsInactive");
  const emptyActiveEl = document.getElementById("programEmptyActive");
  const emptyInactiveEl = document.getElementById("programEmptyInactive");
  
  const countActiveEl = document.getElementById("programCountActive");
  const countInactiveEl = document.getElementById("programCountInactive");
  
  // Search
  const searchInput = document.getElementById("searchInput");

  // Modal & Form
  const addButton = document.getElementById("addProgram");
  const modal = document.getElementById("programModal");
  const closeModal = document.getElementById("closeModal");
  const cancelModal = document.getElementById("cancelModal");
  const modalTitle = document.getElementById("modalTitle");
  const form = document.getElementById("programForm");
  const formError = document.getElementById("formError");

  const fields = [
    "program_id",
    "program_nama",
    "program_mapel",
    "program_tipe",
    "program_pertemuan",
    "program_harga",
    "program_deskripsi",
    "program_active",
  ].reduce((acc, id) => {
    acc[id] = document.getElementById(id);
    return acc;
  }, {});

  // --- State ---
  const state = {
    rows: [],         // Raw data
    filteredRows: [], // Data after search
    mode: "create",
    mapel: [],
    searchQuery: "",
  };

  // --- Helpers ---
  const formatCurrency = (value) => {
    const number = Number(value || 0);
    return new Intl.NumberFormat("id-ID").format(number);
  };

  const stringToHue = (text) => {
    let hash = 0;
    const value = text || "";
    for (let i = 0; i < value.length; i += 1) {
      hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
  };

  // --- Filtering Logic (Search Only) ---
  const applyFilters = () => {
    let data = state.rows;

    // Filter by Search (Name or Type)
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      data = data.filter(item => 
        (item.nama && item.nama.toLowerCase().includes(q)) ||
        (item.tipe_les && item.tipe_les.toLowerCase().includes(q))
      );
    }

    state.filteredRows = data;
    render(state.filteredRows);
  };

  // --- Render Functions ---
  const renderSection = (data, container, emptyEl) => {
    if (!container) return;
    container.innerHTML = "";

    if (!data.length) {
      if (emptyEl) emptyEl.classList.remove("hidden");
      return;
    }
    if (emptyEl) emptyEl.classList.add("hidden");

    data.forEach((item) => {
      const card = document.createElement("div");
      // Style Modern Card
      card.className = "bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group flex flex-col h-full";
      
      const tipeLabel = item.tipe_les === "kelas" ? "Kelas" : "Privat";
      const tipeColor = item.tipe_les === "kelas" ? "text-blue-600 bg-blue-50 border-blue-100" : "text-purple-600 bg-purple-50 border-purple-100";
      
      const pertemuanLabel = item.jumlah_pertemuan ? `${item.jumlah_pertemuan} Sesi` : "Fleksibel";
      
      // Icon color based on name hash
      const hue = stringToHue(item.nama);
      const iconBg = `hsl(${hue}, 85%, 90%)`;
      const iconColor = `hsl(${hue}, 70%, 40%)`;

      card.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold" style="background-color: ${iconBg}; color: ${iconColor};">
                ${(item.nama || "P").substring(0,2).toUpperCase()}
            </div>
            <div class="flex flex-col items-end gap-1">
                 <span class="${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'} text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    ${item.is_active ? 'Aktif' : 'Off'}
                 </span>
            </div>
        </div>

        <div class="flex-1 mb-4">
            <h3 class="font-bold text-gray-800 text-lg leading-tight mb-1" title="${item.nama}">${item.nama}</h3>
            <p class="text-xs text-gray-400 line-clamp-2">${item.deskripsi || "Tidak ada deskripsi."}</p>
        </div>

        <div class="space-y-2 mb-4">
            <div class="flex items-center justify-between text-xs">
                 <span class="text-gray-500 font-medium">Mapel</span>
                 <span class="font-semibold text-gray-700 bg-gray-50 px-2 py-1 rounded">${item.mapel_nama || item.mapel_id || "-"}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
                 <span class="text-gray-500 font-medium">Tipe</span>
                 <span class="font-semibold px-2 py-1 rounded border ${tipeColor}">${tipeLabel}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
                 <span class="text-gray-500 font-medium">Paket</span>
                 <span class="font-semibold text-gray-700">${pertemuanLabel}</span>
            </div>
        </div>

        <div class="pt-3 border-t border-gray-100 mt-auto">
            <div class="mb-3">
                <span class="text-xs text-gray-400 block">Harga Paket</span>
                <span class="text-lg font-bold text-indigo-600">Rp ${formatCurrency(item.harga)}</span>
            </div>
            
            <div class="grid grid-cols-3 gap-2">
                <button class="flex items-center justify-center p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition" 
                      data-action="edit" data-id="${item.id}" title="Edit Program">
                   <i class="fa-regular fa-pen-to-square"></i>
                </button>
                <button class="flex items-center justify-center p-2 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition" 
                      data-action="toggle" data-id="${item.id}" title="${item.is_active ? 'Nonaktifkan' : 'Aktifkan'}">
                   <i class="fa-solid ${item.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                </button>
                <button class="flex items-center justify-center p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition" 
                      data-action="delete" data-id="${item.id}" title="Hapus Program">
                   <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
        </div>
      `;
      container.appendChild(card);
    });
  };

  const render = (data) => {
    const active = data.filter((item) => item.is_active);
    const inactive = data.filter((item) => !item.is_active);
    
    renderSection(active, rowsActiveEl, emptyActiveEl);
    renderSection(inactive, rowsInactiveEl, emptyInactiveEl);
    
    if (countActiveEl) countActiveEl.textContent = `${active.length}`;
    if (countInactiveEl) countInactiveEl.textContent = `${inactive.length}`;
  };

  // --- Fetching ---
  const fetchProgram = async () => {
    try {
      const res = await fetch("/api/program", { credentials: "same-origin" });
      if (!res.ok) {
        state.rows = [];
      } else {
        const data = await res.json();
        state.rows = Array.isArray(data) ? data : [];
      }
      applyFilters();
    } catch (err) {
      state.rows = [];
      applyFilters();
    }
  };

  const renderMapelOptions = () => {
    // Only Render for Form Select (Filter removed)
    const select = fields.program_mapel;
    if (select) {
        select.innerHTML = '<option value="">-- Pilih Mapel --</option>';
        state.mapel.forEach((item) => {
          const option = document.createElement("option");
          option.value = item.id;
          option.textContent = item.nama;
          select.appendChild(option);
        });
    }
  };

  const fetchMapel = async () => {
    try {
      const res = await fetch("/api/mapel", { credentials: "same-origin" });
      if (!res.ok) {
        state.mapel = [];
      } else {
        const data = await res.json();
        state.mapel = Array.isArray(data) ? data : [];
      }
      renderMapelOptions();
    } catch (err) {
      state.mapel = [];
      renderMapelOptions();
    }
  };

  // --- Event Listeners (Search Only) ---
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
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

  const openModal = (mode, data) => {
    if (!modal || !form) return;
    state.mode = mode;
    form.reset();
    if (formError) formError.classList.add('hidden');

    fields.program_id.value = data?.id || "";
    fields.program_nama.value = data?.nama || "";
    fields.program_mapel.value = data?.mapel_id || "";
    fields.program_tipe.value = data?.tipe_les || "privat";
    fields.program_pertemuan.value = data?.jumlah_pertemuan || "";
    fields.program_harga.value = data?.harga || "";
    fields.program_deskripsi.value = data?.deskripsi || "";
    fields.program_active.checked = data ? (data.is_active ? true : false) : true;

    if (modalTitle) {
        modalTitle.textContent = mode === "edit" ? "Edit Program" : "Tambah Program";
    }

    setModalVisible(modal, true);
  };

  const close = () => {
    setModalVisible(modal, false);
  };

  // --- CRUD Operations ---
  const createPayload = () => ({
    nama: fields.program_nama.value.trim(),
    mapel_id: fields.program_mapel.value || null,
    tipe_les: fields.program_tipe.value,
    jumlah_pertemuan: fields.program_pertemuan.value || null,
    harga: fields.program_harga.value || 0,
    deskripsi: fields.program_deskripsi.value.trim(),
    is_active: fields.program_active.checked,
  });

  const saveProgram = async (payload, id) => {
    const url = id ? `/api/program/${id}` : "/api/program";
    const method = id ? "PUT" : "POST";

    const res = await fetch(url, {
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
    const res = await fetch(`/api/program/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Gagal menghapus data.");
    }
  };

  // --- Click Handlers ---
  if (addButton) addButton.addEventListener("click", () => openModal("create"));
  if (closeModal) closeModal.addEventListener("click", close);
  if (cancelModal) cancelModal.addEventListener("click", close);

  // Delegation for Grid Actions
  const handleRowClick = async (event) => {
      const target = event.target;
      const button = target.closest("button[data-action]");
      if (!button) return;
      const action = button.getAttribute("data-action");
      const id = button.getAttribute("data-id");
      if (!action || !id) return;

      const program = state.rows.find((row) => String(row.id) === String(id));
      if (!program) return;

      if (action === "edit") openModal("edit", program);

      if (action === "toggle") {
        try {
          await saveProgram({ is_active: !program.is_active }, id);
          if (window.notifySuccess) window.notifySuccess("Status diperbarui", program.nama);
          fetchProgram();
        } catch (err) {
          if (window.notifyError) window.notifyError("Gagal update", err.message);
        }
      }

      if (action === "delete") {
        if (!confirm(`Hapus program: ${program.nama}?`)) return;
        try {
          await deleteProgram(id);
          if (window.notifySuccess) window.notifySuccess("Terhapus", "Program berhasil dihapus.");
          fetchProgram();
        } catch (err) {
          if (window.notifyError) window.notifyError("Gagal hapus", err.message);
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
        
        // Validasi
        if (!payload.nama || !payload.tipe_les) throw new Error("Nama dan Tipe Les wajib diisi.");
        if (!payload.harga) throw new Error("Harga paket wajib diisi.");

        await saveProgram(payload, fields.program_id.value || null);
        
        if (window.notifySuccess) {
          window.notifySuccess(
            fields.program_id.value ? "Program Diperbarui" : "Program Ditambahkan",
            payload.nama
          );
        }
        close();
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

  // --- Init ---
  fetchProgram();
  fetchMapel();
})();
