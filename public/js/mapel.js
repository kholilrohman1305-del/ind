(() => {
  const requester = window.api?.request || fetch;
  const unwrapData = (payload) => {
    if (payload && typeof payload === "object" && "data" in payload) {
      return payload.data;
    }
    return payload;
  };
  // --- DOM Elements ---
  const rowsEl = document.getElementById("mapelRows");
  const emptyEl = document.getElementById("mapelEmpty");
  const pagerEl = document.getElementById("mapelPager"); // Container Paginasi Baru
  const searchInput = document.getElementById("searchMapel");
  const addButton = document.getElementById("addMapel");
  
  // Modal Elements
  const modal = document.getElementById("mapelModal");
  const closeModal = document.getElementById("closeModal");
  const cancelModal = document.getElementById("cancelModal");
  const form = document.getElementById("mapelForm");

  // Fields
  const fields = {
    id: document.getElementById("mapel_id"),
    nama: document.getElementById("mapel_nama"),
    deskripsi: document.getElementById("mapel_deskripsi"),
    active: document.getElementById("mapel_active"),
  };

  // State
  const state = {
    rows: [],
    filteredRows: [],
    searchQuery: "",
    mode: "create",
    page: 1,      // Halaman aktif
    pageSize: 10  // Item per halaman
  };

  // --- Helpers: Avatar Generator (Gradient Style) ---
  const stringToHue = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 360);
  };

  const avatarGradient = (name) => {
    const hue = stringToHue(name || "Mapel");
    return `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${(hue + 40) % 360}, 80%, 50%))`;
  };

  const initials = (name) => {
    if (!name) return "MP";
    return name.substring(0, 2).toUpperCase();
  };

  // --- Filter Logic ---
  const applyFilter = () => {
    const query = state.searchQuery.toLowerCase();
    state.filteredRows = state.rows.filter(item => {
        const nama = (item.nama || "").toLowerCase();
        const deskripsi = (item.deskripsi || "").toLowerCase();
        return nama.includes(query) || deskripsi.includes(query);
    });
    
    // Reset ke halaman 1 setiap kali filter berubah
    state.page = 1;
    render();
  };

  // --- Render Pager ---
  const renderPager = () => {
    if (!pagerEl) return;
    pagerEl.innerHTML = "";

    const totalPages = Math.ceil(state.filteredRows.length / state.pageSize);
    
    // Sembunyikan pager jika data kosong atau hanya 1 halaman
    if (totalPages <= 1) {
        pagerEl.classList.add("hidden");
        return;
    }
    pagerEl.classList.remove("hidden");

    const wrapper = document.createElement("div");
    wrapper.className = "flex justify-between items-center w-full";
    
    wrapper.innerHTML = `
      <span class="text-xs text-gray-500 font-medium">
        Halaman ${state.page} dari ${totalPages}
      </span>
      <div class="flex gap-2">
         <button class="w-8 h-8 flex items-center justify-center rounded-lg border ${state.page === 1 ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'} transition" 
            type="button" data-action="prev" ${state.page === 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left text-xs"></i>
         </button>
         <button class="w-8 h-8 flex items-center justify-center rounded-lg border ${state.page === totalPages ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'} transition" 
            type="button" data-action="next" ${state.page === totalPages ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-right text-xs"></i>
         </button>
      </div>
    `;

    // Event Listener Pager
    wrapper.querySelectorAll("button").forEach(btn => {
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

  // --- Render Table ---
  const render = () => {
    if (!rowsEl) return;
    rowsEl.innerHTML = "";

    // Calculate Pagination
    const totalPages = Math.ceil(state.filteredRows.length / state.pageSize);
    if (state.page > totalPages && totalPages > 0) state.page = totalPages;
    
    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageData = state.filteredRows.slice(start, end);

    // Handle Empty State
    const tableWrapper = rowsEl.closest('.bg-white'); // Wrapper tabel utama
    if (!pageData.length) {
      if (emptyEl) emptyEl.classList.remove("hidden");
      if (tableWrapper) tableWrapper.classList.add("hidden");
      if (pagerEl) pagerEl.classList.add("hidden");
      return;
    }
    
    if (emptyEl) emptyEl.classList.add("hidden");
    if (tableWrapper) tableWrapper.classList.remove("hidden");

    // Render Rows
    pageData.forEach((item) => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-none";
      
      const deskripsi = item.deskripsi ? item.deskripsi : '<span class="text-gray-300 italic">Tidak ada deskripsi</span>';

      tr.innerHTML = `
        <td class="p-4 align-middle">
           <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white shrink-0" 
                  style="background:${avatarGradient(item.nama)}">
                ${initials(item.nama)}
              </div>
              <div>
                 <h4 class="font-bold text-gray-900 text-sm leading-tight">${item.nama}</h4>
              </div>
           </div>
        </td>

        <td class="p-4 align-middle">
           <p class="text-xs text-gray-500 line-clamp-2 max-w-xs">${deskripsi}</p>
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
      rowsEl.appendChild(tr);
    });

    renderPager();
  };

  // --- API & Logic ---
  const fetchMapel = async () => {
    try {
      const res = await requester("/api/mapel", { credentials: "same-origin" });
      if (!res.ok) {
        state.rows = [];
      } else {
        const payload = await res.json();
        const data = unwrapData(payload);
        state.rows = Array.isArray(data) ? data : [];
      }
      applyFilter(); // Trigger filter + render
    } catch (err) {
      console.error(err);
      state.rows = [];
      applyFilter();
    }
  };

  // --- Search Handler ---
  if (searchInput) {
      searchInput.addEventListener("input", (e) => {
          state.searchQuery = e.target.value;
          applyFilter();
      });
  }

  // --- Modal Logic ---
  const openModal = (mode, data) => {
    if (!modal || !form) return;
    state.mode = mode;
    form.reset();

    fields.id.value = data?.id || "";
    fields.nama.value = data?.nama || "";
    fields.deskripsi.value = data?.deskripsi || "";
    fields.active.checked = mode === 'create' ? true : (data?.is_active !== false);

    const titleEl = modal.querySelector('.modal-title');
    if(titleEl) titleEl.textContent = mode === 'create' ? 'Tambah Mapel Baru' : 'Edit Mata Pelajaran';

    modal.classList.remove("hidden", "pointer-events-none", "opacity-0");
    const card = modal.querySelector('.modal-card');
    if(card) {
        card.classList.remove('scale-95');
        card.classList.add('scale-100');
    }
  };

  const close = () => {
    if (!modal) return;
    const card = modal.querySelector('.modal-card');
    if(card) {
        card.classList.add('scale-95');
        card.classList.remove('scale-100');
    }
    setTimeout(() => {
        modal.classList.add("hidden", "pointer-events-none", "opacity-0");
    }, 150);
  };

  const createPayload = () => ({
    nama: fields.nama.value.trim(),
    deskripsi: fields.deskripsi.value.trim(),
    is_active: fields.active.checked,
  });

  // --- Actions ---
  const saveMapel = async (payload, id) => {
    const url = id ? `/api/mapel/${id}` : "/api/mapel";
    const method = id ? "PUT" : "POST";

    const res = await requester(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok || result?.success === false) {
      throw new Error(result?.message || "Gagal menyimpan data.");
    }
  };

  const deleteMapel = async (id) => {
    const res = await requester(`/api/mapel/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const payload = await res.json();
    if (!res.ok || payload?.success === false) {
      throw new Error(payload?.message || "Gagal menghapus data.");
    }
  };

  // --- Event Listeners ---
  if (addButton) addButton.addEventListener("click", () => openModal("create"));
  if (closeModal) closeModal.addEventListener("click", close);
  if (cancelModal) cancelModal.addEventListener("click", close);
  
  if (modal) {
      modal.addEventListener("click", (e) => {
          if (e.target === modal) close();
      });
  }

  // Handle Table Actions (Event Delegation on TBODY)
  if (rowsEl) {
    rowsEl.addEventListener("click", async (event) => {
      const target = event.target.closest('button[data-action]');
      if (!target) return;
      
      const action = target.getAttribute("data-action");
      const id = target.getAttribute("data-id");
      if (!action || !id) return;

      const mapel = state.rows.find((row) => String(row.id) === String(id));
      if (!mapel) return;

      if (action === "edit") {
        openModal("edit", mapel);
      }

      if (action === "toggle") {
        try {
          await saveMapel({ is_active: !mapel.is_active }, id);
          if (window.notifySuccess) window.notifySuccess("Status diperbarui", mapel.nama);
          fetchMapel();
        } catch (err) {
          if (window.notifyError) window.notifyError("Gagal", err.message);
        }
      }

      if (action === "delete") {
        if (!confirm(`Hapus mapel "${mapel.nama}"?`)) return;
        try {
          await deleteMapel(id);
          if (window.notifySuccess) window.notifySuccess("Terhapus", "Mapel berhasil dihapus");
          fetchMapel();
        } catch (err) {
          if (window.notifyError) window.notifyError("Gagal", err.message);
        }
      }
    });
  }

  // Handle Form Submit
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
      submitBtn.disabled = true;

      try {
        const payload = createPayload();
        if (!payload.nama) {
          alert("Nama mapel wajib diisi");
          return;
        }

        await saveMapel(payload, fields.id.value || null);
        
        if (window.notifySuccess) {
          window.notifySuccess(
            state.mode === "edit" ? "Berhasil Diperbarui" : "Berhasil Ditambahkan",
            payload.nama
          );
        }
        
        close();
        fetchMapel();
      } catch (err) {
        if (window.notifyError) window.notifyError("Error", err.message);
        else alert(err.message);
      } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // Initial Fetch
  fetchMapel();
})();
