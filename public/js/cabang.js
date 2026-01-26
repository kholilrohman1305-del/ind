(() => {
  // --- DOM Elements ---
  const rowsEl = document.getElementById("cabangRows");
  const emptyEl = document.getElementById("cabangEmpty");
  const searchInput = document.getElementById("searchCabang"); // Search Input
  const addButton = document.getElementById("addCabang");
  
  // Stats Elements
  const totalCabangEl = document.getElementById("totalCabang");
  const activeCabangEl = document.getElementById("activeCabang");

  // Modal Elements
  const modal = document.getElementById("cabangModal");
  const closeModal = document.getElementById("closeModal");
  const cancelModal = document.getElementById("cancelModal");
  const form = document.getElementById("cabangForm");

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
  };

  // State
  const state = {
    rows: [],
    searchQuery: "",
    mode: "create",
  };

  // --- Helpers ---
  const stringToHue = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 360);
  };

  const getColorFromName = (name) => {
    const hue = stringToHue(name || "Cabang");
    return {
        bg: `hsl(${hue}, 85%, 96%)`,
        border: `hsl(${hue}, 70%, 90%)`,
        icon: `hsl(${hue}, 70%, 50%)`,
        text: `hsl(${hue}, 60%, 40%)`
    };
  };

  const getInitials = (name) => {
      const parts = (name || "").split(" ");
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return (name || "CB").substring(0, 2).toUpperCase();
  };

  // --- Filter Logic ---
  const applyFilter = () => {
    const query = state.searchQuery.toLowerCase();
    return state.rows.filter(item => {
        const nama = (item.nama || "").toLowerCase();
        const kode = (item.kode || "").toLowerCase();
        return nama.includes(query) || kode.includes(query);
    });
  };

  // --- Render Function ---
  const render = () => {
    if (!rowsEl) return;
    rowsEl.innerHTML = "";

    const filteredData = applyFilter();

    // Update Stats
    if (totalCabangEl) totalCabangEl.textContent = state.rows.length;
    if (activeCabangEl) activeCabangEl.textContent = state.rows.filter(r => r.is_active).length;

    // Handle Empty State
    if (!filteredData.length) {
      if (emptyEl) emptyEl.classList.remove("hidden");
      return;
    }
    if (emptyEl) emptyEl.classList.add("hidden");

    // Render Cards
    filteredData.forEach((item) => {
      const colors = getColorFromName(item.nama);
      const initials = getInitials(item.nama);
      
      const card = document.createElement("div");
      card.className = "cabang-card group flex flex-col h-full";
      
      const statusBadge = item.is_active
        ? `<span class="status-active text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">Aktif</span>`
        : `<span class="status-inactive text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">Nonaktif</span>`;

      card.innerHTML = `
        <div class="p-5 flex-1 relative">
            <div class="absolute top-4 right-4">
                ${statusBadge}
            </div>
            
            <div class="flex items-center gap-4 mb-4">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm transition-transform group-hover:scale-110 duration-300"
                     style="background-color: ${colors.bg}; color: ${colors.icon}; border: 1px solid ${colors.border};">
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
                <div class="flex items-center gap-2 text-sm text-slate-500">
                    <i class="fa-regular fa-calendar text-slate-400 text-xs w-4 text-center"></i>
                    <span class="text-xs">Jatuh Tempo: Tgl <strong>${item.tanggal_jatuh_tempo || 10}</strong></span>
                </div>
            </div>
        </div>

        <div class="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center opacity-80 group-hover:opacity-100 transition-opacity">
            <button class="text-xs font-bold text-slate-400 hover:text-indigo-600 transition flex items-center gap-1" data-action="toggle" data-id="${item.id}">
                <i class="fa-solid fa-power-off"></i> ${item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
            
            <div class="flex gap-2">
                <button class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center transition shadow-sm" 
                        data-action="edit" data-id="${item.id}" title="Edit">
                    <i class="fa-regular fa-pen-to-square text-xs"></i>
                </button>
                <button class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center transition shadow-sm" 
                        data-action="delete" data-id="${item.id}" title="Hapus">
                    <i class="fa-regular fa-trash-can text-xs"></i>
                </button>
            </div>
        </div>
      `;
      rowsEl.appendChild(card);
    });
  };

  // --- API & Logic ---
  const fetchCabang = async () => {
    try {
      const res = await fetch("/api/cabang", { credentials: "same-origin" });
      if (!res.ok) {
        state.rows = [];
      } else {
        const data = await res.json();
        state.rows = Array.isArray(data) ? data : (data.data || []);
      }
      render();
    } catch (err) {
      console.error(err);
      state.rows = [];
      render();
    }
  };

  // --- Search Handler ---
  if (searchInput) {
      searchInput.addEventListener("input", (e) => {
          state.searchQuery = e.target.value;
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
    fields.active.checked = mode === 'create' ? true : (data?.is_active !== false);
    
    // Email field (optional fetch if API returns it, or blank for security)
    fields.email.value = data?.admin_email || ""; 
    fields.password.value = "";

    const titleEl = modal.querySelector('.modal-title');
    if(titleEl) titleEl.textContent = mode === 'create' ? 'Tambah Cabang Baru' : 'Edit Data Cabang';

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
    kode: fields.kode.value.trim(),
    nama: fields.nama.value.trim(),
    telepon: fields.telepon.value.trim(),
    alamat: fields.alamat.value.trim(),
    tanggal_jatuh_tempo: fields.tempo.value || 10,
    is_active: fields.active.checked,
    admin_email: fields.email.value.trim(),
    admin_password: fields.password.value,
  });

  // --- API Actions ---
  const saveCabang = async (payload, id) => {
    const url = id ? `/api/cabang/${id}` : "/api/cabang";
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

  const deleteCabang = async (id) => {
    const res = await fetch(`/api/cabang/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Gagal menghapus data.");
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

  // Handle Card Actions
  if (rowsEl) {
    rowsEl.addEventListener("click", async (event) => {
      const target = event.target.closest('button[data-action]');
      if (!target) return;
      
      const action = target.getAttribute("data-action");
      const id = target.getAttribute("data-id");
      if (!action || !id) return;

      const cabang = state.rows.find((row) => String(row.id) === String(id));
      if (!cabang) return;

      if (action === "edit") {
        openModal("edit", cabang);
      }

      if (action === "toggle") {
        try {
          await saveCabang({ is_active: !cabang.is_active }, id);
          if (window.notifySuccess) window.notifySuccess("Status diperbarui", cabang.nama);
          fetchCabang();
        } catch (err) {
          if (window.notifyError) window.notifyError("Gagal", err.message);
        }
      }

      if (action === "delete") {
        if (!confirm(`Hapus cabang "${cabang.nama}"? Data tidak bisa dikembalikan.`)) return;
        try {
          await deleteCabang(id);
          if (window.notifySuccess) window.notifySuccess("Terhapus", "Cabang berhasil dihapus");
          fetchCabang();
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
        if (!payload.kode || !payload.nama) {
          alert("Kode dan Nama wajib diisi");
          return;
        }

        await saveCabang(payload, fields.id.value || null);
        
        if (window.notifySuccess) {
          window.notifySuccess(
            state.mode === "edit" ? "Berhasil Diperbarui" : "Berhasil Ditambahkan",
            payload.nama
          );
        }
        
        close();
        fetchCabang();
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
  fetchCabang();
})();