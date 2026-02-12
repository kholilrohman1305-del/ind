(() => {
  // DOM Elements
  const btnAdd = document.getElementById("btnAddPromo");
  const modal = document.getElementById("promoModal");
  const closeModal = document.getElementById("closeModal");
  const modalTitle = document.getElementById("modalTitle");

  const form = document.getElementById("promoForm");
  const resetBtn = document.getElementById("promoReset");
  const searchInput = document.getElementById("promoSearch");

  const promoIdInput = document.getElementById("promoId");
  const programSelect = document.getElementById("promoProgram");
  const namaInput = document.getElementById("promoNama");
  const tipeSelect = document.getElementById("promoTipe");
  const nilaiInput = document.getElementById("promoNilai");
  const mulaiInput = document.getElementById("promoMulai");
  const selesaiInput = document.getElementById("promoSelesai");
  const activeInput = document.getElementById("promoActive");
  const nilaiSymbol = document.getElementById("nilaiSymbol");

  const rowsEl = document.getElementById("promoRows");
  const emptyEl = document.getElementById("promoEmpty");

  let cachedRows = [];

  // --- Helpers ---

  const fetchJson = async (url, options = {}) => {
    const requester = window.api?.request || fetch;
    const res = await requester(url, { credentials: "same-origin", ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Permintaan gagal.");
    return data.success ? data.data : data;
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return "#" + "00000".substring(0, 6 - c.length) + c;
  };

  // --- Modal Logic ---

  const toggleModal = (show) => {
      const card = modal.querySelector(".modal-card");
      if (show) {
          modal.classList.remove("hidden", "opacity-0", "pointer-events-none");
          if (card) { card.classList.remove("scale-95"); card.classList.add("scale-100"); }
          // Reset symbol if creating new
          if (!promoIdInput.value) updateSymbol();
      } else {
          modal.classList.add("hidden", "opacity-0", "pointer-events-none");
          if (card) { card.classList.add("scale-95"); card.classList.remove("scale-100"); }
      }
  };

  const openNewModal = () => {
      resetForm();
      modalTitle.textContent = "Buat Promo Baru";
      toggleModal(true);
      setTimeout(() => namaInput.focus(), 100);
  };

  // --- UI Updates ---

  const updateSymbol = () => {
      const type = tipeSelect.value;
      if (type === 'percent') {
          nilaiSymbol.textContent = '%';
          nilaiSymbol.className = "absolute left-3 top-2.5 text-pink-500 font-bold";
          nilaiInput.placeholder = "0 - 100";
          nilaiInput.classList.add("pl-8");
      } else {
          nilaiSymbol.textContent = 'Rp';
          nilaiSymbol.className = "absolute left-3 top-2.5 text-gray-400 font-bold";
          nilaiInput.placeholder = "0";
          nilaiInput.classList.add("pl-10");
      }
  };

  const renderRows = (rows) => {
    rowsEl.innerHTML = "";
    if (!rows.length) {
      emptyEl.classList.remove("hidden");
      return;
    }
    emptyEl.classList.add("hidden");

    rows.forEach((row) => {
      const tr = document.createElement("tr");
      
      // Avatar Logic
      const initials = row.nama.substring(0, 2).toUpperCase();
      // Generate pastel color based on name
      const hue = row.nama.length * 25 % 360; 
      const avatarStyle = `background: hsl(${hue}, 70%, 90%); color: hsl(${hue}, 70%, 40%); border: 1px solid hsl(${hue}, 70%, 80%);`;
      
      // Discount Badge
      let diskonBadge = "";
      if (row.tipe_diskon === "percent") {
          diskonBadge = `<span class="inline-flex items-center px-2.5 py-1 rounded-md bg-pink-50 text-pink-700 font-bold border border-pink-100 text-xs"><i class="fa-solid fa-percent mr-1 text-[10px]"></i> ${row.nilai}% OFF</span>`;
      } else {
          diskonBadge = `<span class="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 text-xs">Potongan Rp ${Number(row.nilai).toLocaleString('id-ID')}</span>`;
      }

      // Status
      const statusHtml = row.is_active 
        ? `<div class="flex items-center justify-center gap-1.5"><span class="relative flex h-2.5 w-2.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span><span class="font-bold text-emerald-600 text-xs uppercase tracking-wide">Aktif</span></div>`
        : `<div class="flex items-center justify-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-slate-300"></span><span class="font-bold text-slate-400 text-xs uppercase tracking-wide">Nonaktif</span></div>`;

      tr.innerHTML = `
        <td>
           <div class="flex items-center gap-4">
               <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0" style="${avatarStyle}">
                  ${initials}
               </div>
               <div>
                  <div class="font-bold text-gray-800 text-sm">${row.nama}</div>
                  <div class="text-[11px] text-gray-400 font-mono mt-0.5">ID: #${row.id}</div>
               </div>
           </div>
        </td>
        <td>
           <span class="text-sm font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100">
             ${row.program_nama || "Semua Program"}
           </span>
        </td>
        <td class="text-xs text-gray-500">
           <div class="font-medium text-gray-700 mb-0.5">${formatDate(row.tanggal_mulai)}</div>
           <div class="text-[10px] text-gray-400">s/d ${formatDate(row.tanggal_selesai)}</div>
        </td>
        <td>
            ${diskonBadge}
        </td>
        <td class="text-center">
            ${statusHtml}
        </td>
        <td class="text-right">
          <div class="flex items-center justify-end gap-2">
            <button class="w-8 h-8 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-gray-400 transition flex items-center justify-center group relative tooltip-container" data-action="edit" data-id="${row.id}" title="Edit Detail">
                <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="w-8 h-8 rounded-lg hover:bg-rose-50 hover:text-rose-500 text-gray-400 transition flex items-center justify-center group relative tooltip-container" data-action="delete" data-id="${row.id}" title="Hapus Promo">
                <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;
      rowsEl.appendChild(tr);
    });
  };

  const applyFilter = () => {
    const keyword = (searchInput?.value || "").toLowerCase().trim();
    if (!keyword) {
      renderRows(cachedRows);
      return;
    }
    const filtered = cachedRows.filter(
      (row) =>
        (row.nama && row.nama.toLowerCase().includes(keyword)) ||
        (row.program_nama && row.program_nama.toLowerCase().includes(keyword))
    );
    renderRows(filtered);
  };

  // --- Data Loading ---

  const loadPrograms = async () => {
    try {
        const rows = await fetchJson("/api/program");
        const options = rows
        .filter((row) => row.is_active !== 0)
        .map((row) => `<option value="${row.id}">${row.nama}</option>`);
        
        programSelect.innerHTML = options.length
        ? `<option value="">-- Pilih Program Spesifik --</option>` + options.join("")
        : '<option value="">Belum ada program</option>';
    } catch(e) {
        programSelect.innerHTML = '<option value="">Gagal memuat</option>';
    }
  };

  const loadPromo = async () => {
    try {
        const rows = await fetchJson("/api/promo");
        cachedRows = rows || [];
        applyFilter();
    } catch (e) {
        if(window.toast.error) window.toast.error("Data Gagal Dimuat", e.message);
    }
  };

  const resetForm = () => {
    promoIdInput.value = "";
    namaInput.value = "";
    nilaiInput.value = "";
    activeInput.checked = true;
    tipeSelect.value = "percent";
    
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 30); // Default 1 month
    mulaiInput.value = today.toISOString().slice(0, 10);
    selesaiInput.value = tomorrow.toISOString().slice(0, 10);
    
    if (programSelect.options.length) {
      programSelect.selectedIndex = 0;
    }
    updateSymbol();
  };

  // --- Event Listeners ---
  
  // Toggle UI based on type
  tipeSelect.addEventListener("change", updateSymbol);

  // Open Modal
  btnAdd.addEventListener("click", openNewModal);
  closeModal.addEventListener("click", () => toggleModal(false));

  // Form Submit
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = {
        program_id: programSelect.value ? Number(programSelect.value) : null,
        nama: namaInput.value.trim(),
        tipe_diskon: tipeSelect.value,
        nilai: Number(nilaiInput.value || 0),
        tanggal_mulai: mulaiInput.value,
        tanggal_selesai: selesaiInput.value,
        is_active: activeInput.checked ? 1 : 0,
      };
      
      try {
        if (!payload.nama) throw new Error("Nama promo wajib diisi.");
        if (payload.nilai <= 0) throw new Error("Nilai promo tidak valid.");

        // Visual loading state could be added here
        
        if (promoIdInput.value) {
          await fetchJson(`/api/promo/${promoIdInput.value}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (window.toast.success) window.toast.success("Sukses", "Data promo berhasil diperbarui.");
        } else {
          await fetchJson("/api/promo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (window.toast.success) window.toast.success("Sukses", "Promo baru berhasil dibuat.");
        }
        toggleModal(false);
        resetForm();
        await loadPromo();
      } catch (err) {
        if (window.toast.error) window.toast.error("Gagal Menyimpan", err.message);
      }
    });
  }

  if (resetBtn) resetBtn.addEventListener("click", resetForm);
  if (searchInput) searchInput.addEventListener("input", applyFilter);

  // Table Actions
  if (rowsEl) {
    rowsEl.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      
      const row = cachedRows.find((item) => String(item.id) === button.dataset.id);
      if (!row) return;
      
      if (button.dataset.action === "edit") {
        promoIdInput.value = row.id;
        programSelect.value = row.program_id || "";
        namaInput.value = row.nama || "";
        tipeSelect.value = row.tipe_diskon || "percent";
        nilaiInput.value = row.nilai || 0;
        mulaiInput.value = row.tanggal_mulai?.slice(0, 10) || "";
        selesaiInput.value = row.tanggal_selesai?.slice(0, 10) || "";
        activeInput.checked = Boolean(row.is_active);
        
        // Update UI logic
        updateSymbol();
        modalTitle.textContent = "Edit Promo";
        toggleModal(true);
        return;
      }
      
      if (button.dataset.action === "delete") {
        if (!confirm(`Yakin ingin menghapus promo "${row.nama}"?`)) return;
        try {
          await fetchJson(`/api/promo/${row.id}`, { method: "DELETE" });
          if (window.toast.success) window.toast.success("Terhapus", "Promo telah dihapus dari sistem.");
          await loadPromo();
        } catch (err) {
          if (window.toast.error) window.toast.error("Gagal Menghapus", err.message);
        }
      }
    });
  }

  // Init
  Promise.all([loadPrograms(), loadPromo()])
    .then(() => resetForm())
    .catch((err) => console.error(err));
})();
