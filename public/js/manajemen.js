(() => {
  // --- DOM ELEMENTS ---
  const form = document.getElementById("manajemenForm");
  const inputNama = document.getElementById("manajemenNama");
  const inputGaji = document.getElementById("manajemenGaji");
  
  const rowsEl = document.getElementById("manajemenRows");
  const emptyEl = document.getElementById("manajemenEmpty");
  const jabatanCount = document.getElementById("jabatanCount");
  
  const assignForm = document.getElementById("assignManajemenForm");
  const assignEdukator = document.getElementById("assignEdukator");
  const assignManajemen = document.getElementById("assignManajemen");
  
  const assignRowsEl = document.getElementById("manajemenAssignRows");
  const assignEmptyEl = document.getElementById("manajemenAssignEmpty");
  const filterCabang = document.getElementById("filterCabang");
  const pageInfo = document.getElementById("manajemenPageInfo");
  const pagePrev = document.getElementById("manajemenPrev");
  const pageNext = document.getElementById("manajemenNext");

  const jabatanModal = document.getElementById("jabatanModal");
  const assignModal = document.getElementById("assignModal");
  const openJabatanModal = document.getElementById("openJabatanModal");
  const openAssignModal = document.getElementById("openAssignModal");
  const closeJabatanModal = document.getElementById("closeJabatanModal");
  const closeAssignModal = document.getElementById("closeAssignModal");
  const cancelJabatanModal = document.getElementById("cancelJabatanModal");
  const cancelAssignModal = document.getElementById("cancelAssignModal");

  const role = document.body?.dataset?.role || "";

  // --- HELPERS ---
  const fetchJson = async (url, options = {}) => {
    const requester = window.api?.request || fetch;
    const res = await requester(url, { credentials: "same-origin", ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data || {};
      throw new Error(err.message || "Request gagal.");
    }
    return data && data.success ? data.data : data;
  };

  const formatRupiah = (value) => new Intl.NumberFormat("id-ID").format(Number(value || 0));

  const stringToHue = (text) => {
    let hash = 0;
    const value = text || "";
    for (let i = 0; i < value.length; i += 1) {
      hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
  };

  const getAvatarColors = (name) => {
    const hue = stringToHue(name);
    return {
        bg: `hsl(${hue}, 85%, 90%)`,
        text: `hsl(${hue}, 70%, 40%)`
    };
  };

  const getInitials = (name) => (name || "?").substring(0, 2).toUpperCase();

  const state = {
    edukatorRows: [],
    filteredRows: [],
    page: 1,
    pageSize: 10,
  };

  const openModal = (modal) => {
    if (!modal) return;
    modal.classList.remove("hidden");
    setTimeout(() => modal.classList.add("show"), 10);
  };

  const closeModal = (modal) => {
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => modal.classList.add("hidden"), 150);
  };

  // --- RENDER FUNCTIONS ---

  // 1. Render List Jabatan (Sidebar Kiri)
  const renderRows = (rows) => {
    if(jabatanCount) jabatanCount.textContent = rows.length;
    
    if (!rows.length) {
      rowsEl.innerHTML = "";
      emptyEl.classList.remove("hidden");
      return;
    }
    emptyEl.classList.add("hidden");
    
    rowsEl.innerHTML = rows.map(row => `
      <div class="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:-translate-x-1 transition-all duration-200 group relative overflow-hidden">
         <div class="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl opacity-0 group-hover:opacity-100 transition"></div>
         <div>
            <h4 class="font-bold text-gray-800 text-sm mb-0.5">${row.nama}</h4>
            <div class="flex items-center gap-2 text-xs text-gray-500">
                <span class="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium">Rp ${formatRupiah(row.gaji_tambahan)}</span>
            </div>
         </div>
         <button class="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition shadow-sm" 
                 data-action="delete" data-id="${row.id}" title="Hapus Jabatan">
            <i class="fa-regular fa-trash-can text-xs"></i>
         </button>
      </div>
    `).join("");
  };

  // 2. Render Assign Table (Main Content) - UPDATED with Edit/Delete Actions
  const renderAssignTable = (rows) => {
    // Sort: Edukator yang punya jabatan ditaruh paling atas
    const sortedRows = [...rows].sort((a, b) => {
      const rankA = a.manajemen_id ? 1 : 0;
      const rankB = b.manajemen_id ? 1 : 0;
      if (rankB !== rankA) return rankB - rankA;
      return String(a.nama || "").localeCompare(String(b.nama || ""));
    });

    if (!sortedRows.length) {
      assignRowsEl.innerHTML = "";
      assignEmptyEl.classList.remove("hidden");
      return;
    }
    assignEmptyEl.classList.add("hidden");

    assignRowsEl.innerHTML = sortedRows.map(row => {
        const colors = getAvatarColors(row.nama);
        const hasRole = !!row.manajemen_id;
        
        const roleName = row.manajemen_nama || "Belum Ditugaskan";
        const roleClass = hasRole 
            ? "text-indigo-700 font-bold bg-indigo-50 border-indigo-100" 
            : "text-gray-400 font-medium bg-gray-50 border-gray-200 italic";

        // Kolom Aksi (Edit & Delete)
        const actionButtons = `
            <div class="flex items-center justify-end gap-2">
                <button class="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50 transition flex items-center justify-center" 
                        data-action="edit-assign" 
                        data-edukator-id="${row.id}" 
                        data-jabatan-id="${row.manajemen_id || ''}"
                        title="Edit Penugasan">
                    <i class="fa-regular fa-pen-to-square"></i>
                </button>
                ${hasRole ? `
                <button class="w-8 h-8 rounded-lg text-red-600 hover:bg-red-50 transition flex items-center justify-center" 
                        data-action="delete-assign" 
                        data-edukator-id="${row.id}"
                        title="Copot Jabatan">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
                ` : ''}
            </div>
        `;

        return `
        <tr class="hover:bg-gray-50/80 transition group border-b border-gray-50 last:border-none">
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shadow-sm" 
                         style="background-color: ${colors.bg}; color: ${colors.text};">
                        ${getInitials(row.nama)}
                    </div>
                    <div>
                        <p class="font-bold text-gray-800 text-sm">${row.nama}</p>
                        <p class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Edukator</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
               <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${roleClass}">
                 ${hasRole ? '<i class="fa-solid fa-certificate text-[10px]"></i>' : ''} ${roleName}
               </span>
            </td>
            <td class="px-6 py-4">${row.pendidikan_terakhir || "-"}</td>
            <td class="px-6 py-4">${row.cabang_nama || "-"}</td>
            <td class="px-6 py-4 text-right">
                ${actionButtons}
            </td>
        </tr>
        `;
    }).join("");
  };

  const renderPagination = () => {
    if (!pageInfo || !pagePrev || !pageNext) return;
    const total = state.filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    pageInfo.textContent = `Halaman ${state.page} / ${totalPages}`;
    pagePrev.disabled = state.page <= 1;
    pageNext.disabled = state.page >= totalPages;
  };

  const applyFilters = () => {
    const cabangId = filterCabang?.value || "";
    let rows = [...state.edukatorRows];
    if (cabangId) {
      rows = rows.filter((row) => String(row.cabang_utama_id) === String(cabangId));
    }
    state.filteredRows = rows;
    const start = (state.page - 1) * state.pageSize;
    const pageRows = rows.slice(start, start + state.pageSize);
    renderAssignTable(pageRows);
    renderPagination();
  };

  // --- DATA LOADING ---
  
  const loadRows = async () => {
    try {
        const rows = await fetchJson("/api/manajemen");
        renderRows(rows);
        
        // Update Select Option untuk Jabatan di Form Assign
        if (assignManajemen) {
          assignManajemen.innerHTML = `<option value="">Tanpa jabatan (Lepas)</option>`;
          rows.forEach((row) => {
            const option = document.createElement("option");
            option.value = row.id;
            option.textContent = `${row.nama} (+${formatRupiah(row.gaji_tambahan)})`; 
            assignManajemen.appendChild(option);
          });
        }
    } catch (err) {
        console.error("Gagal memuat data jabatan", err);
    }
  };

  const loadEdukator = async () => {
    try {
        const rows = await fetchJson("/api/edukator");
        state.edukatorRows = rows || [];
        // Update Select Option untuk Edukator di Form Assign
        if (assignEdukator) {
            // Simpan value saat ini jika ada
            const currentVal = assignEdukator.value;
            
            assignEdukator.innerHTML = `<option value="">Pilih edukator...</option>`;
            rows.forEach((row) => {
                if(row.is_active) { 
                    const option = document.createElement("option");
                    option.value = row.id;
                    option.textContent = row.nama;
                    assignEdukator.appendChild(option);
                }
            });

            if(currentVal) assignEdukator.value = currentVal;
        }
        
        applyFilters();
    } catch (err) {
        console.error("Gagal memuat data edukator", err);
    }
  };

  const loadCabangOptions = async () => {
    if (role !== "super_admin") {
      if (filterCabang) filterCabang.classList.add("hidden");
      return;
    }
    if (!filterCabang) return;
    try {
      const res = await fetchJson("/api/cabang");
      const rows = res?.data || res || [];
      if (!Array.isArray(rows)) return;
      filterCabang.innerHTML = `<option value="">Semua Cabang</option>` +
        rows.map((row) => `<option value="${row.id}">${row.nama}</option>`).join("");
    } catch (err) {
      console.error("Gagal memuat cabang", err);
    }
  };

  // --- EVENT LISTENERS ---

  // 1. Submit Tambah Jabatan
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const nama = inputNama.value.trim();
      const gaji = Number(inputGaji?.value || 0);
      
      if (!nama) {
          if(window.notifyWarning) window.notifyWarning("Validasi", "Nama jabatan wajib diisi.");
          return;
      }
      
      try {
          const createRes = await fetchJson("/api/manajemen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nama }),
          });
          
          if (createRes?.id && gaji > 0) {
            await fetchJson("/api/penggajian/manajemen", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: createRes.id,
                gaji_tambahan: gaji,
              }),
            });
          }
          
          if(window.toast.success) window.toast.success("Berhasil", "Jabatan baru ditambahkan.");
          
          inputNama.value = "";
          if (inputGaji) inputGaji.value = "";
          await loadRows(); 
          closeModal(jabatanModal);
          
      } catch(err) {
          if(window.toast.error) window.toast.error("Gagal", err.message);
      }
    });
  }

  // 2. Hapus Jabatan (Sidebar)
  if (rowsEl) {
    rowsEl.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      
      if (button.dataset.action === "delete") {
        const id = button.dataset.id;
        if (!confirm("Hapus jabatan ini? Edukator terkait akan kehilangan jabatan.")) return;
        
        try {
            await fetchJson(`/api/manajemen/${id}`, { method: "DELETE" });
            if(window.toast.success) window.toast.success("Terhapus", "Jabatan dihapus.");
            await loadRows();
            await loadEdukator(); // Refresh tabel assign karena status jabatan user berubah
        } catch(err) {
            if(window.toast.error) window.toast.error("Gagal Hapus", err.message);
        }
      }
    });
  }

  // 3. Action Table Struktur (Edit / Hapus Penugasan) - Event Delegation
  if (assignRowsEl) {
      assignRowsEl.addEventListener("click", async (event) => {
          const button = event.target.closest("button[data-action]");
          if (!button) return;

          const action = button.dataset.action;
          const edukatorId = button.dataset.edukatorId;

          // Action: Edit (Isi Form di Atas)
          if (action === "edit-assign") {
              const jabatanId = button.dataset.jabatanId;
              
              // Scroll ke form (UX)
              if (assignForm && !assignModal) {
                assignForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } else {
                openModal(assignModal);
              }
              
              // Set value dropdown
              if(assignEdukator) assignEdukator.value = edukatorId;
              if(assignManajemen) assignManajemen.value = jabatanId || ""; // Value "" = Tanpa Jabatan
              
              // Visual feedback
              assignForm.classList.add("ring-2", "ring-indigo-200");
              setTimeout(() => assignForm.classList.remove("ring-2", "ring-indigo-200"), 1000);
          }

          // Action: Hapus Penugasan (Unassign)
          if (action === "delete-assign") {
              if(!confirm("Copot jabatan dari edukator ini?")) return;

              try {
                  await fetchJson("/api/penggajian/assign-manajemen", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      edukator_id: edukatorId,
                      manajemen_id: null, // Send NULL to unassign
                    }),
                  });
                  
                  if(window.toast.success) window.toast.success("Berhasil", "Jabatan dicopot.");
                  await loadEdukator();
                  
              } catch(err) {
                  if(window.toast.error) window.toast.error("Gagal", err.message);
              }
          }
      });
  }

  // 4. Submit Assign Jabatan (Form)
  if (assignForm) {
    assignForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!assignEdukator.value) {
          if(window.notifyWarning) window.notifyWarning("Pilih Edukator", "Silakan pilih edukator terlebih dahulu.");
          return;
      }
      
      try {
          await fetchJson("/api/penggajian/assign-manajemen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              edukator_id: assignEdukator.value,
              manajemen_id: assignManajemen.value || null,
            }),
          });
          
          if(window.toast.success) window.toast.success("Update Berhasil", "Struktur organisasi diperbarui.");
          
          // Reset form (opsional)
          assignEdukator.value = "";
          assignManajemen.value = "";
          
          await loadEdukator(); 
          closeModal(assignModal);
          
      } catch(err) {
          if(window.toast.error) window.toast.error("Gagal Update", err.message);
      }
    });
  }

  if (openJabatanModal) openJabatanModal.addEventListener("click", () => openModal(jabatanModal));
  if (openAssignModal) openAssignModal.addEventListener("click", () => openModal(assignModal));
  if (closeJabatanModal) closeJabatanModal.addEventListener("click", () => closeModal(jabatanModal));
  if (closeAssignModal) closeAssignModal.addEventListener("click", () => closeModal(assignModal));
  if (cancelJabatanModal) cancelJabatanModal.addEventListener("click", () => closeModal(jabatanModal));
  if (cancelAssignModal) cancelAssignModal.addEventListener("click", () => closeModal(assignModal));

  if (jabatanModal) {
    jabatanModal.addEventListener("click", (event) => {
      if (event.target === jabatanModal) closeModal(jabatanModal);
    });
  }
  if (assignModal) {
    assignModal.addEventListener("click", (event) => {
      if (event.target === assignModal) closeModal(assignModal);
    });
  }

  if (filterCabang) {
    filterCabang.addEventListener("change", () => {
      state.page = 1;
      applyFilters();
    });
  }
  if (pagePrev) {
    pagePrev.addEventListener("click", () => {
      if (state.page > 1) {
        state.page -= 1;
        applyFilters();
      }
    });
  }
  if (pageNext) {
    pageNext.addEventListener("click", () => {
      state.page += 1;
      applyFilters();
    });
  }

  // Init
  loadRows().catch(() => {});
  loadCabangOptions().catch(() => {});
  loadEdukator().catch(() => {});
})();
