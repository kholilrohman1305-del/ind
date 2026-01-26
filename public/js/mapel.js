(() => {
  // --- DOM Elements ---
  const rowsEl = document.getElementById("mapelRows");
  const emptyEl = document.getElementById("mapelEmpty");
  const searchInput = document.getElementById("searchMapel"); // Input Search Baru
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
    searchQuery: "",
    mode: "create",
  };

  // --- Helpers: Color & Avatar Generator ---
  const stringToHue = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 360);
  };

  const getColorFromName = (name) => {
    const hue = stringToHue(name || "Mapel");
    // Generate warna pastel yang enak dilihat
    return {
        bg: `hsl(${hue}, 85%, 96%)`,     // Background sangat muda
        border: `hsl(${hue}, 70%, 90%)`, // Border sedikit lebih tua
        icon: `hsl(${hue}, 70%, 50%)`,   // Warna icon vibrant
        text: `hsl(${hue}, 60%, 40%)`    // Warna teks gelap readable
    };
  };

  // --- Filter Logic ---
  const applyFilter = () => {
    const query = state.searchQuery.toLowerCase();
    return state.rows.filter(item => {
        const nama = (item.nama || "").toLowerCase();
        const deskripsi = (item.deskripsi || "").toLowerCase();
        return nama.includes(query) || deskripsi.includes(query);
    });
  };

  // --- Render Function ---
  const render = () => {
    if (!rowsEl) return;
    rowsEl.innerHTML = "";

    const filteredData = applyFilter();

    // Handle Empty State
    if (!filteredData.length) {
      if (emptyEl) emptyEl.classList.remove("hidden");
      return;
    }
    if (emptyEl) emptyEl.classList.add("hidden");

    // Render Cards
    filteredData.forEach((item) => {
      const colors = getColorFromName(item.nama);
      const initial = (item.nama || "?").substring(0, 2).toUpperCase();
      
      const card = document.createElement("div");
      card.className = "mapel-card group flex flex-col h-full";
      
      // Status Dot
      const statusHtml = item.is_active
        ? `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Aktif</span>`
        : `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 text-slate-500 text-[10px] font-bold border border-slate-100"><span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Nonaktif</span>`;

      card.innerHTML = `
        <div class="p-5 flex-1">
            <div class="flex justify-between items-start mb-4">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shadow-sm transition-transform group-hover:scale-110 duration-300"
                     style="background-color: ${colors.bg}; color: ${colors.icon}; border: 1px solid ${colors.border};">
                    ${initial}
                </div>
                ${statusHtml}
            </div>
            
            <h3 class="text-lg font-bold text-slate-800 mb-1 line-clamp-1" title="${item.nama}">${item.nama}</h3>
            <p class="text-sm text-slate-500 line-clamp-2 leading-relaxed h-10">${item.deskripsi || "Tidak ada deskripsi tambahan."}</p>
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
  const fetchMapel = async () => {
    try {
      const res = await fetch("/api/mapel", { credentials: "same-origin" });
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
          render(); // Re-render based on search
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
    }, 150); // Delay for animation
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

  const deleteMapel = async (id) => {
    const res = await fetch(`/api/mapel/${id}`, {
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

  // Handle Card Actions (Event Delegation)
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