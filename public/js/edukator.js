(() => {
  const { ROLES } = window.APP_CONSTANTS;
  const requester = window.api?.request || fetch;
  const unwrapData = (payload) => {
    if (payload && typeof payload === "object" && "data" in payload) {
      return payload.data;
    }
    return payload;
  };

  // --- 1. DOM ELEMENTS ---
  
  // Containers & Empty States
  const rowsActiveEl = document.getElementById("edukatorRowsActive");
  const rowsInactiveEl = document.getElementById("edukatorRowsInactive");
  const emptyActiveEl = document.getElementById("edukatorEmptyActive");
  const emptyInactiveEl = document.getElementById("edukatorEmptyInactive");
  
  // Counters (Badges di Tab)
  const countActiveEl = document.getElementById("edukatorCountActive");
  const countInactiveEl = document.getElementById("edukatorCountInactive");

  // Riwayat Edukator
  const historyRowsEl = document.getElementById("edukatorHistoryRows");
  const historyEmptyEl = document.getElementById("edukatorHistoryEmpty");
  const historyMonthInput = document.getElementById("edukatorHistoryMonth");
  
  // Search & Filter (Desktop)
  const searchInput = document.getElementById("searchInput");
  const filterMapel = document.getElementById("filterMapel");
  
  // Search & Filter (Mobile)
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
  // Toolbar wrapper
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
    filterMapelId: "", // ID Mapel filter saat ini
    pageActive: 1,     // Halaman aktif tab Aktif
    pageInactive: 1,   // Halaman aktif tab Nonaktif
    pageSize: 10       // Jumlah item per halaman (Table View biasanya lebih banyak)
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

  const formatCurrency = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatHours = (value) => {
    const hours = Number(value || 0);
    if (!Number.isFinite(hours)) return "0 jam";
    return `${hours.toFixed(2)} jam`;
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
        const ids = Array.isArray(item.mapel_ids) 
            ? item.mapel_ids.map(String) 
            : String(item.mapel_ids).split(',');
        return ids.includes(String(state.filterMapelId));
      });
    }

    state.filteredRows = data;
    // Reset halaman ke 1 saat filter berubah
    state.pageActive = 1;
    state.pageInactive = 1;
    render(state.filteredRows);
  };

  // --- 5. RENDER LOGIC (TABLE LIST) ---

  const renderPager = (container, totalPages, pageKey) => {
    // Cari container pager khusus yang ada di luar tabel
    const pagerContainerId = pageKey === 'pageActive' ? 'pager-container-active' : 'pager-container-inactive';
    const pagerContainer = document.getElementById(pagerContainerId);
    
    if (!pagerContainer) return;
    pagerContainer.innerHTML = ""; 

    if (totalPages <= 1) {
      pagerContainer.classList.add("hidden");
      return;
    }
    pagerContainer.classList.remove("hidden");

    const current = state[pageKey];
    
    // Create Pager UI (Flexbox Layout: Info Kiri, Tombol Kanan)
    const wrapper = document.createElement("div");
    wrapper.className = "flex justify-between items-center w-full";
    
    wrapper.innerHTML = `
      <span class="text-xs text-gray-500 font-medium">
        Halaman ${current} dari ${totalPages}
      </span>
      <div class="flex gap-2">
         <button class="w-8 h-8 flex items-center justify-center rounded-lg border ${current === 1 ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'} transition" 
            type="button" data-action="prev" ${current === 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left text-xs"></i>
         </button>
         <button class="w-8 h-8 flex items-center justify-center rounded-lg border ${current === totalPages ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'} transition" 
            type="button" data-action="next" ${current === totalPages ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-right text-xs"></i>
         </button>
      </div>
    `;

    wrapper.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (btn.disabled) return;
        if (btn.dataset.action === "prev") state[pageKey]--;
        if (btn.dataset.action === "next") state[pageKey]++;
        
        // Scroll to top of table
        const tableWrapper = container.closest('.overflow-hidden');
        if(tableWrapper) tableWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        render(state.filteredRows);
      });
    });

    pagerContainer.appendChild(wrapper);
  };

  const renderSection = (data, container, emptyEl, pageKey) => {
    if (!container) return;
    container.innerHTML = "";
    
    const totalPages = Math.ceil(data.length / state.pageSize);
    if (state[pageKey] > totalPages && totalPages > 0) state[pageKey] = Math.max(1, totalPages);
    if (totalPages === 0) state[pageKey] = 1;

    const start = (state[pageKey] - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageData = data.slice(start, end);

    // Toggle Empty State Visibility
    // Kita perlu menyembunyikan wrapper tabel induknya jika kosong
    const parentCard = container.closest('.bg-white'); // Wrapper kartu putih
    
    if (!pageData.length) {
      if (emptyEl) emptyEl.classList.remove("hidden");
      if (parentCard) parentCard.classList.add("hidden");
      renderPager(container, 0, pageKey); // Clear pager
      return;
    }
    
    if (emptyEl) emptyEl.classList.add("hidden");
    if (parentCard) parentCard.classList.remove("hidden");

    pageData.forEach((item) => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-none";
      
      const nikLabel = item.nik || "-";
      const telLabel = item.telepon || "-";
      const pendidikan = item.pendidikan_terakhir || "-";
      
      // Logic Badge Mapel (Pills Style)
      let mapelHtml = '<span class="text-xs text-gray-400 italic">Tidak ada mapel</span>';
      if (item.mapel_nama) {
          const mapelList = item.mapel_nama.split(',').map(m => m.trim());
          const displayMapel = mapelList.slice(0, 2); 
          const remaining = mapelList.length - 2;
          
          mapelHtml = displayMapel.map(m => 
            `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 mr-1 mb-1">
              ${m}
             </span>`
          ).join("");
          
          if (remaining > 0) {
              mapelHtml += `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200" title="${mapelList.slice(2).join(', ')}">+${remaining}</span>`;
          }
      }

      tr.innerHTML = `
        <td class="p-4 align-middle">
           <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white shrink-0" 
                  style="background:${avatarGradient(item.nama)}">
                ${initials(item.nama)}
              </div>
              <div class="min-w-0">
                 <h4 class="font-bold text-gray-900 text-sm leading-tight truncate w-32 md:w-48" title="${item.nama}">${item.nama}</h4>
                 <div class="text-xs text-gray-500 mt-0.5 truncate">${item.email || "No Email"}</div>
              </div>
           </div>
        </td>

        <td class="p-4 align-middle">
           <div class="flex flex-col gap-1">
             <span class="text-xs text-gray-600 flex items-center gap-2">
                <i class="fa-solid fa-phone text-gray-300 w-3 text-center"></i> ${telLabel}
             </span>
             <span class="text-xs text-gray-500 flex items-center gap-2 font-mono">
                <i class="fa-solid fa-id-card text-gray-300 w-3 text-center"></i> ${nikLabel}
             </span>
           </div>
        </td>

        <td class="p-4 align-middle">
            <span class="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">
              ${pendidikan}
            </span>
        </td>

        <td class="p-4 align-middle">
           <div class="flex flex-wrap max-w-[200px]">
             ${mapelHtml}
           </div>
        </td>

        <td class="p-4 align-middle text-center">
             <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
               item.is_active 
               ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
               : 'bg-gray-100 text-gray-500 border-gray-200'
             }">
               <span class="w-1.5 h-1.5 rounded-full mr-1.5 ${item.is_active ? 'bg-emerald-500' : 'bg-gray-400'}"></span>
               ${item.is_active ? 'Aktif' : 'Nonaktif'}
             </span>
        </td>

        <td class="p-4 align-middle text-center">
           <div class="flex items-center justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
              <button class="w-8 h-8 flex items-center justify-center rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition" 
                  data-action="edit" data-id="${item.id}" title="Edit Data">
                 <i class="fa-regular fa-pen-to-square"></i>
              </button>
              
              <button class="w-8 h-8 flex items-center justify-center rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition" 
                  data-action="toggle" data-id="${item.id}" title="${item.is_active ? 'Nonaktifkan' : 'Aktifkan'}">
                 <i class="fa-solid ${item.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
              </button>
              
              <button class="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition" 
                  data-action="delete" data-id="${item.id}" title="Hapus Data">
                 <i class="fa-regular fa-trash-can"></i>
              </button>
           </div>
        </td>
      `;
      container.appendChild(tr);
    });

    renderPager(container, totalPages, pageKey);
  };

  const render = (data) => {
    const active = data.filter((item) => item.is_active);
    const inactive = data.filter((item) => !item.is_active);
    
    renderSection(active, rowsActiveEl, emptyActiveEl, 'pageActive');
    renderSection(inactive, rowsInactiveEl, emptyInactiveEl, 'pageInactive');
    
    // Update Badge Counter
    if (countActiveEl) countActiveEl.textContent = `${active.length}`;
    if (countInactiveEl) countInactiveEl.textContent = `${inactive.length}`;
  };

  const renderHistory = (rows) => {
    if (!historyRowsEl) return;
    historyRowsEl.innerHTML = "";

    if (!rows.length) {
      if (historyEmptyEl) historyEmptyEl.classList.remove("hidden");
      return;
    }
    if (historyEmptyEl) historyEmptyEl.classList.add("hidden");

    rows.forEach((row, idx) => {
      const tr = document.createElement("tr");
      const rankBadge =
        idx === 0
          ? "bg-yellow-100 text-yellow-700"
          : idx === 1
          ? "bg-slate-100 text-slate-600"
          : idx === 2
          ? "bg-amber-100 text-amber-700"
          : "bg-gray-100 text-gray-600";

      tr.innerHTML = `
        <td class="p-4 align-middle">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white shrink-0"
                style="background:${avatarGradient(row.nama)}">
              ${initials(row.nama)}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-gray-900 text-sm truncate">${row.nama || "-"}</h4>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${rankBadge}">#${idx + 1}</span>
              </div>
              <div class="text-xs text-gray-500">${row.email || "No Email"}</div>
            </div>
          </div>
        </td>
        <td class="p-4 align-middle text-sm text-gray-600">${row.cabang_nama || "-"}</td>
        <td class="p-4 align-middle text-sm font-semibold text-indigo-600">${formatHours(row.total_jam)}</td>
        <td class="p-4 align-middle text-sm font-semibold text-emerald-600">${formatCurrency(row.total_gaji)}</td>
        <td class="p-4 align-middle text-sm font-semibold text-gray-700">${Number(row.total_kehadiran || 0)}</td>
      `;
      historyRowsEl.appendChild(tr);
    });
  };

  // --- 6. API FETCHING ---

  const fetchEdukator = async () => {
    try {
      const res = await requester("/api/edukator", { credentials: "same-origin" });
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

  const fetchHistory = async () => {
    if (!historyRowsEl) return;

    const now = new Date();
    if (historyMonthInput && !historyMonthInput.value) {
      const monthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      historyMonthInput.value = monthValue;
    }

    const [year, month] = (historyMonthInput?.value || "").split("-");
    const query = new URLSearchParams({
      year: year || String(now.getFullYear()),
      month: month || String(now.getMonth() + 1),
    });

    try {
      const res = await requester(`/api/edukator/top-history?${query.toString()}`, {
        credentials: "same-origin",
      });
      const payload = await res.json();
      if (!res.ok || payload?.success === false) {
        throw new Error(payload?.message || "Gagal memuat riwayat");
      }
      const data = unwrapData(payload);
      renderHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      renderHistory([]);
    }
  };

  // --- 7. MAPEL LOGIC (MODAL + FILTER DROPDOWN) ---

  const renderMapelChecklist = (selected = []) => {
    const container = document.getElementById("mapelChecklist");
    if (!container) return;
    container.innerHTML = "";

    state.mapel.forEach((item) => {
      const wrapper = document.createElement("label");
      const isChecked = selected.includes(String(item.id));
      
      wrapper.className = `flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 group select-none ${
          isChecked 
          ? "bg-indigo-50 border-indigo-200 shadow-sm" 
          : "bg-white border-gray-200 hover:bg-gray-50"
      }`;
      
      wrapper.innerHTML = `
          <input type="checkbox" value="${item.id}" ${isChecked ? 'checked' : ''} class="sr-only">
          
          <div class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-200 shrink-0
              ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300 group-hover:border-indigo-300'}">
             <i class="fa-solid fa-check text-white text-xs ${isChecked ? '' : 'hidden'}"></i>
          </div>
          
          <span class="text-sm ${isChecked ? 'text-indigo-700 font-semibold' : 'text-gray-600 group-hover:text-gray-800'}">${item.nama}</span>
      `;

      wrapper.addEventListener('change', (e) => {
          const checkbox = e.target;
          const box = wrapper.querySelector('div');
          const icon = wrapper.querySelector('i');
          const text = wrapper.querySelector('span');
          
          if (checkbox.checked) {
              wrapper.className = "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 group select-none bg-indigo-50 border-indigo-200 shadow-sm";
              box.className = "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-200 shrink-0 bg-indigo-600 border-indigo-600";
              icon.classList.remove('hidden');
              text.className = "text-sm text-indigo-700 font-semibold";
          } else {
              wrapper.className = "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 group select-none bg-white border-gray-200 hover:bg-gray-50";
              box.className = "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-200 shrink-0 bg-white border-gray-300 group-hover:border-indigo-300";
              icon.classList.add('hidden');
              text.className = "text-sm text-gray-600 group-hover:text-gray-800";
          }
      });

      container.appendChild(wrapper);
    });
  };

  const renderFilterOptions = () => {
    if (filterMapel) {
        let options = '<option value="">Semua Mapel</option>';
        state.mapel.forEach(item => {
            options += `<option value="${item.id}">${item.nama}</option>`;
        });
        filterMapel.innerHTML = options;
    }

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
      const res = await requester("/api/mapel", { credentials: "same-origin" });
      if (!res.ok) {
        state.mapel = [];
      } else {
        const payload = await res.json();
        const data = unwrapData(payload);
        state.mapel = Array.isArray(data) ? data : [];
      }
      renderMapelChecklist();
      renderFilterOptions();
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
      targetModal.classList.remove("justify-end");
      targetModal.classList.add("justify-center", "items-center", "flex");
      
      if (card) {
          card.classList.remove("h-full", "max-w-md", "rounded-l-2xl", "rounded-none");
          card.classList.add("max-w-2xl", "w-full", "rounded-2xl", "max-h-[90vh]", "overflow-y-auto");
      }

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
    const res = await requester(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Gagal menyimpan data.");
  };

  const deleteEdukator = async (id) => {
    const res = await requester(`/api/edukator/${id}`, {
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
      if (searchInputMobile) searchInputMobile.value = e.target.value;
      applyFilters();
    });
  }

  // Filter Dropdown Desktop
  if (filterMapel) {
    filterMapel.addEventListener("change", (e) => {
      state.filterMapelId = e.target.value;
      if (filterMapelMobile) filterMapelMobile.value = e.target.value;
      applyFilters();
    });
  }

  // Search Mobile
  if (searchInputMobile) {
      searchInputMobile.addEventListener("input", (e) => {
          state.searchQuery = e.target.value;
          if (searchInput) searchInput.value = e.target.value;
          applyFilters();
      });
  }

  // Filter Mobile
  if (filterMapelMobile) {
      filterMapelMobile.addEventListener("change", (e) => {
          state.filterMapelId = e.target.value;
          if (filterMapel) filterMapel.value = e.target.value;
          applyFilters();
      });
  }

  if (historyMonthInput) {
    historyMonthInput.addEventListener("change", fetchHistory);
  }

  // Modal Triggers
  if (addButton) addButton.addEventListener("click", () => openModal("create"));
  if (closeModal) closeModal.addEventListener("click", close);
  if (cancelModal) cancelModal.addEventListener("click", close);

  // Row Action Delegation (Table Body)
  const handleRowClick = async (event) => {
    const target = event.target;
    // Cari tombol terdekat
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

  const initFormOptions = () => {
    let el = fields.pendidikan_terakhir;
    if (!el) return;

    if (el.tagName !== "SELECT") {
      const select = document.createElement("select");
      select.id = el.id;
      select.className = el.className.replace("custom-input", "custom-select");
      if (!select.classList.contains("custom-select")) select.classList.add("custom-select");
      el.parentNode.replaceChild(select, el);
      fields.pendidikan_terakhir = select;
      el = select;
    }

    const options = ["Mahasiswa", "S1", "S2"];
    el.innerHTML = `<option value="">-- Pilih Pendidikan --</option>` + 
      options.map(opt => `<option value="${opt}">${opt}</option>`).join("");
  };

  const init = async () => {
    try {
      const sessionRes = await requester("/api/auth/session", { credentials: "same-origin" });
      const session = await sessionRes.json();
      state.role = session && session.loggedIn ? session.user.role : null;
    } catch (err) {
      state.role = null;
    }

    initFormOptions();

    // A. Tampilan Khusus jika login sebagai Edukator
    if (state.role === ROLES.EDUKATOR) {
      if (addButton) addButton.style.display = "none";
      if (modal) modal.classList.add("hidden");
      if (adminPanelWrapper) adminPanelWrapper.style.display = "none";
      if (topbarActions) topbarActions.style.display = "none";

      if (schedulePanel) schedulePanel.classList.remove("hidden");

      const [privatRes, kelasRes] = await Promise.all([
        requester("/api/jadwal?tipe=privat", { credentials: "same-origin" }),
        requester("/api/jadwal?tipe=kelas", { credentials: "same-origin" }),
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
    fetchHistory();
  };

  init();
})();


