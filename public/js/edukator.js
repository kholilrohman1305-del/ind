(() => {
  // --- 1. DOM ELEMENTS ---
  
  // Containers & Empty States
  const rowsActiveEl = document.getElementById("edukatorRowsActive");
  const rowsInactiveEl = document.getElementById("edukatorRowsInactive");
  const emptyActiveEl = document.getElementById("edukatorEmptyActive");
  const emptyInactiveEl = document.getElementById("edukatorEmptyInactive");
  
  // Counters (Badges di Tab)
  const countActiveEl = document.getElementById("edukatorCountActive");
  const countInactiveEl = document.getElementById("edukatorCountInactive");
  
  // Search & Filter (Desktop)
  const searchInput = document.getElementById("searchInput");
  const filterMapel = document.getElementById("filterMapel");
  
  // Search & Filter (Mobile - jika ada di HTML)
  const searchInputMobile = document.getElementById("searchInputMobile");
  const filterMapelMobile = document.getElementById("filterMapelMobile");
  
  // Buttons & Modals
  const addButton = document.getElementById("addEdukator");
  const modal = document.getElementById("edukatorModal");
  const closeModal = document.getElementById("closeModal");
  const cancelModal = document.getElementById("cancelModal");
  const modalTitle = document.getElementById("modalTitle");
  const form = document.getElementById("edukatorForm");
  const formError = document.getElementById("formError");

  // Views Wrappers
  const adminPanelWrapper = document.getElementById("adminPanelWrapper");
  const schedulePanel = document.getElementById("edukatorSchedulePanel");
  // Toolbar wrapper (untuk disembunyikan jika login sebagai edukator)
  const topbarActions = document.querySelector(".topbar-actions"); 

  // Form Fields Mapping
  const fields = [
    "edukator_id",
    "nama",
    "nik",
    "telepon",
    "alamat",
    "pendidikan_terakhir",
    "email",
    "password",
    "is_active",
  ].reduce((acc, id) => {
    acc[id] = document.getElementById(id);
    return acc;
  }, {});

  // --- 2. STATE MANAGEMENT ---
  const state = {
    rows: [],          // Data mentah dari API
    filteredRows: [],  // Data setelah difilter
    mapel: [],         // Data Master Mapel
    mode: "create",    // Mode Modal (create/edit)
    role: null,        // Role User Login
    searchQuery: "",   // Query pencarian saat ini
    filterMapelId: ""  // ID Mapel filter saat ini
  };

  // --- 3. HELPER FUNCTIONS ---

  const initials = (name) => {
    if (!name) return "ED";
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]).join("").toUpperCase();
  };

  const stringToHue = (text) => {
    let hash = 0;
    const value = text || "";
    for (let i = 0; i < value.length; i += 1) {
      hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
  };

  const avatarGradient = (name) => {
    const hue = stringToHue(name || "Edukator");
    return `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${(hue + 40) % 360}, 80%, 50%))`;
  };

  // --- 4. FILTER LOGIC (SEARCH & DROPDOWN) ---

  const applyFilters = () => {
    let data = state.rows;

    // A. Filter by Search Query
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      data = data.filter(item => 
        (item.nama && item.nama.toLowerCase().includes(q)) ||
        (item.nik && item.nik.includes(q)) ||
        (item.telepon && item.telepon.includes(q))
      );
    }

    // B. Filter by Mapel Dropdown
    if (state.filterMapelId) {
      data = data.filter(item => {
        if (!item.mapel_ids) return false;
        // Konversi ke array string agar aman
        const ids = Array.isArray(item.mapel_ids) 
           ? item.mapel_ids.map(String) 
           : String(item.mapel_ids).split(',');
        return ids.includes(String(state.filterMapelId));
      });
    }

    state.filteredRows = data;
    render(state.filteredRows);
  };

  // --- 5. RENDER LOGIC (GRID CARDS) ---

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
      // Style Card: Putih, Rounded, Shadow halus
      card.className = "bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group flex flex-col h-full";
      
      const nikLabel = item.nik || "-";
      const telLabel = item.telepon || "-";
      const pendidikan = item.pendidikan_terakhir || "N/A";
      
      // Logic Badge Mapel (Max 2, sisanya +X)
      let mapelHtml = '<span class="text-xs text-gray-400 italic">Tidak ada mapel</span>';
      if (item.mapel_nama) {
          const mapelList = item.mapel_nama.split(',').map(m => m.trim());
          const displayMapel = mapelList.slice(0, 2);
          const remaining = mapelList.length - 2;
          
          mapelHtml = displayMapel.map(m => 
            `<span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-semibold border border-indigo-100 truncate max-w-[80px] inline-block" title="${m}">${m}</span>`
          ).join(" ");
          
          if (remaining > 0) {
              mapelHtml += `<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-semibold inline-block">+${remaining}</span>`;
          }
      }

      card.innerHTML = `
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
             <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm ring-2 ring-white" 
                  style="background:${avatarGradient(item.nama)}">
                ${initials(item.nama)}
             </div>
             <div class="overflow-hidden">
                <h3 class="font-bold text-gray-800 text-base leading-tight truncate w-32 md:w-40" title="${item.nama}">${item.nama || "-"}</h3>
                <span class="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">${pendidikan}</span>
             </div>
          </div>
          <div class="flex flex-col items-end gap-1">
             <span class="${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'} text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                ${item.is_active ? 'Aktif' : 'Off'}
             </span>
          </div>
        </div>

        <div class="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-100 mb-4 flex-1">
           <div class="flex items-center gap-2 text-xs text-gray-600">
              <i class="fa-solid fa-phone w-4 text-center text-gray-400"></i> ${telLabel}
           </div>
           <div class="flex items-center gap-2 text-xs text-gray-600">
              <i class="fa-solid fa-id-card w-4 text-center text-gray-400"></i> ${nikLabel}
           </div>
           <div class="pt-2 border-t border-gray-200 mt-2 flex flex-wrap gap-1">
              ${mapelHtml}
           </div>
        </div>

        <div class="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 mt-auto">
          <button class="flex items-center justify-center p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition" 
                  data-action="edit" data-id="${item.id}" title="Edit Data">
             <i class="fa-regular fa-pen-to-square"></i>
          </button>
          
          <button class="flex items-center justify-center p-2 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition" 
                  data-action="toggle" data-id="${item.id}" title="${item.is_active ? 'Nonaktifkan' : 'Aktifkan'}">
             <i class="fa-solid ${item.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
          </button>
          
          <button class="flex items-center justify-center p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition" 
                  data-action="delete" data-id="${item.id}" title="Hapus Data">
             <i class="fa-regular fa-trash-can"></i>
          </button>
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
    
    // Update Badge Counter
    if (countActiveEl) countActiveEl.textContent = `${active.length}`;
    if (countInactiveEl) countInactiveEl.textContent = `${inactive.length}`;
  };

  // --- 6. API FETCHING ---

  const fetchEdukator = async () => {
    try {
      const res = await fetch("/api/edukator", { credentials: "same-origin" });
      if (!res.ok) {
        state.rows = [];
      } else {
        const data = await res.json();
        state.rows = Array.isArray(data) ? data : [];
      }
      // Panggil applyFilters, bukan render langsung, agar search/filter diterapkan
      applyFilters();
    } catch (err) {
      state.rows = [];
      applyFilters();
    }
  };

  // --- 7. MAPEL LOGIC (MODAL + FILTER DROPDOWN) ---

  const renderMapelChecklist = (selected = []) => {
    const container = document.getElementById("mapelChecklist");
    if (!container) return;
    container.innerHTML = "";

    state.mapel.forEach((item) => {
      const wrapper = document.createElement("label");
      wrapper.className = "flex items-center gap-2 p-2 rounded border border-gray-200 cursor-pointer hover:bg-gray-50 transition bg-white";
      
      const isChecked = selected.includes(String(item.id));
      
      wrapper.innerHTML = `
         <input type="checkbox" value="${item.id}" ${isChecked ? 'checked' : ''} class="peer sr-only">
         <div class="w-full flex items-center gap-2 peer-checked:text-indigo-600">
            <div class="w-4 h-4 rounded border border-gray-300 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 flex items-center justify-center text-white text-[10px] transition-colors"><i class="fa-solid fa-check"></i></div>
            <span class="text-sm select-none">${item.nama}</span>
         </div>
      `;
      container.appendChild(wrapper);
    });
  };

  const renderFilterOptions = () => {
    // Render untuk Desktop Dropdown
    if (filterMapel) {
        let options = '<option value="">Semua Mapel</option>';
        state.mapel.forEach(item => {
            options += `<option value="${item.id}">${item.nama}</option>`;
        });
        filterMapel.innerHTML = options;
    }

    // Render untuk Mobile Dropdown (Sync)
    if (filterMapelMobile) {
        let options = '<option value="">Semua Mapel</option>';
        state.mapel.forEach(item => {
            options += `<option value="${item.id}">${item.nama}</option>`;
        });
        filterMapelMobile.innerHTML = options;
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
      renderMapelChecklist();
      renderFilterOptions(); // Populate dropdown filter
    } catch (err) {
      state.mapel = [];
      renderMapelChecklist();
      renderFilterOptions();
    }
  };

  // --- 8. MODAL & CRUD OPERATIONS ---
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
    
    if (formError) {
        formError.textContent = "";
        formError.classList.add('hidden');
    }

    // Isi Form
    fields.edukator_id.value = data?.id || "";
    fields.nama.value = data?.nama || "";
    fields.nik.value = data?.nik || "";
    fields.telepon.value = data?.telepon || "";
    fields.alamat.value = data?.alamat || "";
    fields.pendidikan_terakhir.value = data?.pendidikan_terakhir || "";
    fields.email.value = data?.email || "";
    fields.password.value = "";
    fields.is_active.checked = data ? (data.is_active ? true : false) : true;
    
    // Checklist Mapel
    const selected = data?.mapel_ids ? String(data.mapel_ids).split(",") : [];
    renderMapelChecklist(selected);

    if (modalTitle) {
      modalTitle.textContent = mode === "edit" ? "Edit Data Edukator" : "Tambah Edukator";
    }

    setModalVisible(modal, true);
  };

  const close = () => {
    setModalVisible(modal, false);
  };

  const createPayload = () => {
    const selectedMapel = Array.from(
      document.querySelectorAll("#mapelChecklist input:checked")
    ).map((input) => input.value);

    const payload = {
      nama: fields.nama.value.trim(),
      nik: fields.nik.value.trim(),
      telepon: fields.telepon.value.trim(),
      alamat: fields.alamat.value.trim(),
      pendidikan_terakhir: fields.pendidikan_terakhir.value.trim(),
      is_active: fields.is_active.checked,
      mapel_ids: selectedMapel,
    };

    if (fields.email.value.trim()) payload.email = fields.email.value.trim();
    if (fields.password.value) payload.password = fields.password.value;

    return payload;
  };

  const saveEdukator = async (payload, id) => {
    const url = id ? `/api/edukator/${id}` : "/api/edukator";
    const method = id ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Gagal menyimpan data.");
  };

  const deleteEdukator = async (id) => {
    const res = await fetch(`/api/edukator/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Gagal menghapus data.");
  };

  // --- 9. EVENT LISTENERS ---

  // Search Desktop
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      // Sync ke mobile jika ada
      if (searchInputMobile) searchInputMobile.value = e.target.value;
      applyFilters();
    });
  }

  // Filter Dropdown Desktop
  if (filterMapel) {
    filterMapel.addEventListener("change", (e) => {
      state.filterMapelId = e.target.value;
      // Sync ke mobile jika ada
      if (filterMapelMobile) filterMapelMobile.value = e.target.value;
      applyFilters();
    });
  }

  // Search Mobile (Sync ke Desktop)
  if (searchInputMobile) {
      searchInputMobile.addEventListener("input", (e) => {
          state.searchQuery = e.target.value;
          if (searchInput) searchInput.value = e.target.value;
          applyFilters();
      });
  }

  // Filter Mobile (Sync ke Desktop)
  if (filterMapelMobile) {
      filterMapelMobile.addEventListener("change", (e) => {
          state.filterMapelId = e.target.value;
          if (filterMapel) filterMapel.value = e.target.value;
          applyFilters();
      });
  }

  // Modal Triggers
  if (addButton) addButton.addEventListener("click", () => openModal("create"));
  if (closeModal) closeModal.addEventListener("click", close);
  if (cancelModal) cancelModal.addEventListener("click", close);

  // Row Action Delegation (Edit/Delete/Toggle)
  const handleRowClick = async (event) => {
    const target = event.target;
    // Cari tombol terdekat karena bisa jadi klik icon
    const button = target.closest("button[data-action]");
    if (!button) return;
    
    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");
    if (!action || !id) return;

    const edukator = state.rows.find((row) => String(row.id) === String(id));
    if (!edukator) return;

    if (action === "edit") openModal("edit", edukator);

    if (action === "toggle") {
      try {
        await saveEdukator({ is_active: !edukator.is_active }, id);
        if (window.notifySuccess) window.notifySuccess("Status Diperbarui", `Edukator kini ${!edukator.is_active ? 'Aktif' : 'Nonaktif'}`);
        fetchEdukator();
      } catch (err) {
        if (window.notifyError) window.notifyError("Gagal update", err.message);
      }
    }

    if (action === "delete") {
      if (!confirm(`Hapus data edukator: ${edukator.nama}?`)) return;
      try {
        await deleteEdukator(id);
        if (window.notifySuccess) window.notifySuccess("Terhapus", "Data edukator berhasil dihapus.");
        fetchEdukator();
      } catch (err) {
        if (window.notifyError) window.notifyError("Gagal hapus", err.message);
      }
    }
  };

  if (rowsActiveEl) rowsActiveEl.addEventListener("click", handleRowClick);
  if (rowsInactiveEl) rowsInactiveEl.addEventListener("click", handleRowClick);

  // Form Submit
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const payload = createPayload();
        
        // Simple Validation
        if (!payload.nama) throw new Error("Nama wajib diisi.");
        if (state.mode === "create") {
          if (!payload.email || !payload.password) throw new Error("Email dan password akun wajib diisi.");
        }
        if (!payload.mapel_ids.length) throw new Error("Pilih minimal satu mata pelajaran.");

        await saveEdukator(payload, fields.edukator_id.value || null);
        
        if (window.notifySuccess) window.notifySuccess("Berhasil", "Data tersimpan.");
        close();
        fetchEdukator();
      } catch (err) {
        if (formError) {
          formError.textContent = err.message;
          formError.classList.remove('hidden');
        }
        if (window.notifyWarning) window.notifyWarning("Validasi Gagal", err.message);
      }
    });
  }

  // --- 10. EDUKATOR SCHEDULE VIEW (ROLE BASED) ---

  const renderEdukatorSchedule = (privat, kelas) => {
    const privatEl = document.getElementById("edukatorJadwalPrivat");
    const kelasEl = document.getElementById("edukatorJadwalKelas");
    const privatEmpty = document.getElementById("edukatorJadwalPrivatEmpty");
    const kelasEmpty = document.getElementById("edukatorJadwalKelasEmpty");

    const createScheduleCard = (item, type) => {
        const card = document.createElement("div");
        card.className = "flex items-center gap-4 p-3 bg-white rounded-lg border border-gray-100 hover:shadow-md transition";
        const iconColor = type === 'privat' ? 'text-pink-500 bg-pink-50' : 'text-blue-500 bg-blue-50';
        const icon = type === 'privat' ? 'fa-user' : 'fa-users';
        
        const title = type === 'privat' ? (item.siswa_nama || 'Siswa') : (item.kelas_nama || 'Kelas');
        const subTitle = item.program_nama || '-';
        const time = item.jam_mulai ? item.jam_mulai.slice(0,5) : '-';
        const dateStr = item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}) : '-';

        card.innerHTML = `
            <div class="w-10 h-10 rounded-full ${iconColor} flex items-center justify-center shrink-0">
                <i class="fa-solid ${icon}"></i>
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="text-sm font-bold text-gray-800 truncate">${title}</h4>
                <p class="text-xs text-gray-500 truncate">${subTitle}</p>
            </div>
            <div class="text-right">
                <div class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                    ${time}
                </div>
                <div class="text-[10px] text-gray-400 mt-1">
                    ${dateStr}
                </div>
            </div>
        `;
        return card;
    };

    if (privatEl) {
      privatEl.innerHTML = "";
      if (!privat.length) {
        if (privatEmpty) privatEmpty.classList.remove("hidden");
      } else {
        if (privatEmpty) privatEmpty.classList.add("hidden");
        privat.forEach((item) => privatEl.appendChild(createScheduleCard(item, 'privat')));
      }
    }

    if (kelasEl) {
      kelasEl.innerHTML = "";
      if (!kelas.length) {
        if (kelasEmpty) kelasEmpty.classList.remove("hidden");
      } else {
        if (kelasEmpty) kelasEmpty.classList.add("hidden");
        kelas.forEach((item) => kelasEl.appendChild(createScheduleCard(item, 'kelas')));
      }
    }
  };

  // --- 11. INITIALIZATION ---

  const init = async () => {
    try {
      // Cek Session User
      const sessionRes = await fetch("/api/auth/session", { credentials: "same-origin" });
      const session = await sessionRes.json();
      state.role = session && session.loggedIn ? session.user.role : null;
    } catch (err) {
      state.role = null;
    }

    // A. Tampilan Khusus jika login sebagai Edukator
    if (state.role === "edukator") {
      // Sembunyikan elemen Admin
      if (addButton) addButton.style.display = "none";
      if (modal) modal.classList.add("hidden");
      if (adminPanelWrapper) adminPanelWrapper.style.display = "none";
      if (topbarActions) topbarActions.style.display = "none"; // Sembunyikan tombol tambah & search

      // Tampilkan Panel Jadwal
      if (schedulePanel) schedulePanel.classList.remove("hidden");

      // Fetch Jadwal
      const [privatRes, kelasRes] = await Promise.all([
        fetch("/api/jadwal?tipe=privat", { credentials: "same-origin" }),
        fetch("/api/jadwal?tipe=kelas", { credentials: "same-origin" }),
      ]);
      const privatData = await privatRes.json();
      const kelasData = await kelasRes.json();
      renderEdukatorSchedule(
        Array.isArray(privatData.data) ? privatData.data : [], 
        Array.isArray(kelasData.data) ? kelasData.data : []
      );
      return;
    }

    // B. Tampilan Default (Admin)
    fetchEdukator();
    fetchMapel();
  };

  init();
})();
