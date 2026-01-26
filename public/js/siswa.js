(() => {
  // --- DOM Elements ---
  const rowsActiveEl = document.getElementById("siswaRowsActive");
  const rowsInactiveEl = document.getElementById("siswaRowsInactive");
  
  // Empty States
  const emptyActiveEl = document.getElementById("siswaEmptyActive");
  const emptyInactiveEl = document.getElementById("siswaEmptyInactive");
  
  // Counters
  const countActiveEl = document.getElementById("siswaCountActive");
  const countInactiveEl = document.getElementById("siswaCountInactive");
  
  // Badges di Tab (Optional, jika ada di HTML baru)
  const badgeActive = document.getElementById("badgeActive");
  const badgeInactive = document.getElementById("badgeInactive");

  // Pagers
  const pagerActive = document.getElementById("siswaPagerActive");
  const pagerInactive = document.getElementById("siswaPagerInactive");
  const pagerActiveInfo = document.getElementById("siswaPagerActiveInfo");
  const pagerInactiveInfo = document.getElementById("siswaPagerInactiveInfo");
  
  // Buttons & Modals
  const addButton = document.getElementById("addSiswa");
  const modal = document.getElementById("siswaModal");
  const closeModal = document.getElementById("closeModal");
  const cancelModal = document.getElementById("cancelModal");
  const modalTitle = document.getElementById("modalTitle");
  const form = document.getElementById("siswaForm");
  const formError = document.getElementById("formError");
  
  // Renew Modal
  const renewModal = document.getElementById("renewModal");
  const renewForm = document.getElementById("renewForm");
  const closeRenewModal = document.getElementById("closeRenewModal");
  const cancelRenewModal = document.getElementById("cancelRenewModal");
  const renewError = document.getElementById("renewError");
  
  const renewFields = {
    siswaId: document.getElementById("renewSiswaId"),
    programId: document.getElementById("renewProgram"),
    startDate: document.getElementById("renewStartDate"),
  };

  // Field Mapping
  const fields = [
    "siswaId",
    "nama",
    "nik",
    "telepon",
    "alamat",
    "tanggal_lahir",
    "sekolah_asal",
    "kelas",
    "email",
    "password",
    "is_active",
    "program_id",
  ].reduce((acc, id) => {
    acc[id] = document.getElementById(id);
    return acc;
  }, {});

  // --- State Management ---
  const state = {
    rows: [],
    mode: "create",
    programs: [],
    pageActive: 1,
    pageInactive: 1,
  };

  const PAGE_SIZE = 12; // Disesuaikan agar grid terlihat rapi (3x4 atau 4x3)

  // --- Helper Functions ---

  const initials = (name) => {
    if (!name) return "S";
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

  // Avatar lebih vibrant
  const avatarGradient = (name) => {
    const hue = stringToHue(name || "SISWA");
    return `linear-gradient(135deg, hsl(${hue}, 85%, 65%), hsl(${(hue + 40) % 360}, 90%, 55%))`;
  };

  // --- Rendering Logic (Tampilan Modern) ---

  const renderSection = (data, container, emptyEl, pagerEl, pagerInfoEl, pageKey) => {
    if (!container) return;
    container.innerHTML = "";
    
    const total = data.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    
    // Adjust current page if out of bounds
    state[pageKey] = Math.min(state[pageKey], totalPages); 
    const currentPage = state[pageKey];
    
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageRows = data.slice(startIndex, startIndex + PAGE_SIZE);

    // Handle Empty State
    if (!pageRows.length) {
      if (emptyEl) emptyEl.classList.remove("hidden");
      if (container) container.classList.add("hidden"); // Hide grid container
      if (pagerEl) pagerEl.classList.add("hidden");
      return;
    }

    // Show Data
    if (emptyEl) emptyEl.classList.add("hidden");
    if (container) container.classList.remove("hidden");
    
    // Handle Pager
    if (pagerEl) {
       pagerEl.classList.toggle("hidden", totalPages <= 1);
       const prevBtn = pagerEl.querySelector('[data-page="prev"]');
       const nextBtn = pagerEl.querySelector('[data-page="next"]');
       if (prevBtn) prevBtn.disabled = currentPage <= 1;
       if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
       // Style disabled buttons opacity
       if (prevBtn) prevBtn.style.opacity = currentPage <= 1 ? "0.5" : "1";
       if (nextBtn) nextBtn.style.opacity = currentPage >= totalPages ? "0.5" : "1";
    }

    if (pagerInfoEl) {
      pagerInfoEl.textContent = `Halaman ${currentPage} dari ${totalPages}`;
    }

    // Render Cards
    pageRows.forEach((item) => {
      const card = document.createElement("div");
      // Style Container Card
      card.className = "bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group flex flex-col justify-between h-full";

      const programLabel = item.program_list || "Belum ada program";
      const kelasLabel = item.kelas ? item.kelas : "-";
      const nikLabel = item.nik ? item.nik : "No NIK";

      // HTML Template Card Modern
      card.innerHTML = `
        <div>
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm ring-2 ring-white" 
                   style="background:${avatarGradient(item.nama)}">
                ${initials(item.nama)}
              </div>
              <div class="overflow-hidden">
                <h3 class="font-bold text-gray-800 text-sm md:text-base leading-tight truncate w-32 md:w-40" title="${item.nama}">
                    ${item.nama || "-"}
                </h3>
                <p class="text-xs text-gray-400 mt-1 truncate">${nikLabel}</p>
              </div>
            </div>
            <span class="${item.is_active ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'} border text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              ${item.is_active ? 'Aktif' : 'Off'}
            </span>
          </div>

          <div class="bg-gray-50 rounded-lg p-3 mb-4 space-y-2 border border-gray-100">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-400 text-xs font-semibold uppercase"><i class="fa-solid fa-graduation-cap mr-1"></i> Kelas</span>
              <span class="font-semibold text-gray-700">${kelasLabel}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-400 text-xs font-semibold uppercase"><i class="fa-solid fa-book-open mr-1"></i> Program</span>
              <span class="font-medium text-indigo-600 truncate max-w-[100px] text-right" title="${programLabel}">${programLabel}</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100 mt-auto">
          <button class="flex items-center justify-center p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition tooltip-container" 
                  data-action="edit" data-id="${item.id}" title="Edit Data">
            <i class="fa-regular fa-pen-to-square text-lg"></i>
          </button>
          
          <button class="flex items-center justify-center p-2 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition" 
                  data-action="renew" data-id="${item.id}" title="Perpanjang">
             <i class="fa-solid fa-clock-rotate-left text-lg"></i>
          </button>
          
          <button class="flex items-center justify-center p-2 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition" 
                  data-action="toggle" data-id="${item.id}" title="${item.is_active ? 'Nonaktifkan' : 'Aktifkan'}">
             <i class="fa-solid ${item.is_active ? 'fa-toggle-on' : 'fa-toggle-off'} text-lg"></i>
          </button>

           <button class="flex items-center justify-center p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition" 
                   data-action="delete" data-id="${item.id}" title="Hapus">
             <i class="fa-regular fa-trash-can text-lg"></i>
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  };

  const render = (data) => {
    const active = data.filter((item) => item.is_active);
    const inactive = data.filter((item) => !item.is_active);
    
    renderSection(
      active,
      rowsActiveEl,
      emptyActiveEl,
      pagerActive,
      pagerActiveInfo,
      "pageActive"
    );
    
    renderSection(
      inactive,
      rowsInactiveEl,
      emptyInactiveEl,
      pagerInactive,
      pagerInactiveInfo,
      "pageInactive"
    );
    
    // Update main counters
    if (countActiveEl) countActiveEl.textContent = `${active.length} siswa`;
    if (countInactiveEl) countInactiveEl.textContent = `${inactive.length} siswa`;
    
    // Update Tab Badges (jika elemen ada)
    if (badgeActive) {
        badgeActive.textContent = active.length;
        badgeActive.classList.toggle('hidden', active.length === 0);
    }
    if (badgeInactive) {
        badgeInactive.textContent = inactive.length;
        badgeInactive.classList.toggle('hidden', inactive.length === 0);
    }
  };

  // --- Data & API Logic (Tidak Diubah) ---

  const renderPrograms = () => {
    const select = fields.program_id;
    if (!select) return;
    select.innerHTML = "";
    
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Pilih program...";
    select.appendChild(placeholder);

    state.programs.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.nama;
      select.appendChild(option);
    });

    if (renewFields.programId) {
      renewFields.programId.innerHTML = select.innerHTML;
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await fetch("/api/program", { credentials: "same-origin" });
      if (!res.ok) {
        state.programs = [];
        renderPrograms();
        return;
      }
      const data = await res.json();
      state.programs = Array.isArray(data) ? data : [];
      renderPrograms();
    } catch (err) {
      state.programs = [];
      renderPrograms();
    }
  };

  const fetchSiswa = async () => {
    try {
      const res = await fetch("/api/siswa", { credentials: "same-origin" });
      if (!res.ok) {
        render([]);
        return;
      }
      const data = await res.json();
      state.rows = Array.isArray(data) ? data : [];
      state.pageActive = 1;
      state.pageInactive = 1;
      render(state.rows);
    } catch (err) {
      render([]);
    }
  };

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
    
    if (formError) {
        formError.textContent = "";
        formError.classList.add('hidden');
    }

    fields.siswaId.value = data?.id || "";
    fields.nama.value = data?.nama || "";
    fields.nik.value = data?.nik || "";
    fields.telepon.value = data?.telepon || "";
    fields.alamat.value = data?.alamat || "";
    fields.tanggal_lahir.value = data?.tanggal_lahir ? data.tanggal_lahir.split("T")[0] : "";
    fields.sekolah_asal.value = data?.sekolah_asal || "";
    fields.kelas.value = data?.kelas || "";
    fields.program_id.value = data?.program_id || "";
    fields.email.value = data?.email || "";
    fields.password.value = "";
    fields.is_active.checked = data ? (data.is_active ? true : false) : true;
    fields.password.required = mode === "create";

    if (modalTitle) {
      modalTitle.textContent = mode === "edit" ? "Edit Data Siswa" : "Tambah Siswa Baru";
    }

    setModalVisible(modal, true);
  };

  const close = () => {
    setModalVisible(modal, false);
  };

  const openRenewModal = (data) => {
    if (!renewModal || !renewForm) return;
    if (renewError) {
        renewError.textContent = "";
        renewError.classList.add('hidden');
    }
    renewFields.siswaId.value = data?.id || "";
    renewFields.programId.value = data?.program_id || "";
    const today = new Date();
    renewFields.startDate.value = today.toISOString().slice(0, 10);
    setModalVisible(renewModal, true);
  };

  const closeRenew = () => {
    setModalVisible(renewModal, false);
  };

  // --- CRUD Operations ---

  const createPayload = () => {
    const payload = {
      nama: fields.nama.value.trim(),
      nik: fields.nik.value.trim(),
      telepon: fields.telepon.value.trim(),
      alamat: fields.alamat.value.trim(),
      tanggal_lahir: fields.tanggal_lahir.value || null,
      sekolah_asal: fields.sekolah_asal.value.trim(),
      kelas: fields.kelas.value.trim(),
      program_id: fields.program_id.value || null,
      is_active: fields.is_active.checked,
    };

    if (fields.email.value.trim()) {
      payload.email = fields.email.value.trim();
    }

    if (fields.password.value) {
      payload.password = fields.password.value;
    }

    return payload;
  };

  const saveSiswa = async (payload, id) => {
    const url = id ? `/api/siswa/${id}` : "/api/siswa";
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

  const deleteSiswa = async (id) => {
    const res = await fetch(`/api/siswa/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Gagal menghapus data.");
    }
  };

  // --- Event Listeners ---

  if (addButton) {
    addButton.addEventListener("click", () => openModal("create"));
  }

  if (closeModal) closeModal.addEventListener("click", close);
  if (cancelModal) cancelModal.addEventListener("click", close);
  if (closeRenewModal) closeRenewModal.addEventListener("click", closeRenew);
  if (cancelRenewModal) cancelRenewModal.addEventListener("click", closeRenew);

  // Handle Action Buttons (Delegation)
  const handleRowClick = async (event) => {
    const target = event.target;
    // Mencari button terdekat karena di dalam button ada icon <i>
    const button = target.closest("button[data-action]"); 
    if (!button) return;
    
    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");
    if (!action || !id) return;

    const siswa = state.rows.find((row) => String(row.id) === String(id));
    if (!siswa) return;

    if (action === "edit") {
      openModal("edit", siswa);
    }

    if (action === "renew") {
      openRenewModal(siswa);
    }

    if (action === "toggle") {
      try {
        await saveSiswa({ is_active: !siswa.is_active }, id);
        if (window.notifySuccess) {
          window.notifySuccess("Status diperbarui", `${siswa.nama} sekarang ${!siswa.is_active ? 'Aktif' : 'Nonaktif'}`);
        }
        fetchSiswa();
      } catch (err) {
        if (window.notifyError) {
          window.notifyError("Gagal memperbarui siswa", err.message);
        }
      }
    }

    if (action === "delete") {
      if (!confirm(`Hapus data siswa: ${siswa.nama}?`)) return;
      try {
        await deleteSiswa(id);
        if (window.notifySuccess) {
          window.notifySuccess("Siswa dihapus", siswa.nama);
        }
        fetchSiswa();
      } catch (err) {
        if (window.notifyError) {
          window.notifyError("Gagal menghapus siswa", err.message);
        }
      }
    }
  };

  if (rowsActiveEl) {
    rowsActiveEl.addEventListener("click", handleRowClick);
  }

  if (rowsInactiveEl) {
    rowsInactiveEl.addEventListener("click", handleRowClick);
  }

  // Handle Paging Logic
  const handlePaging = (event, type) => {
      const target = event.target;
      const button = target.closest("button[data-page]");
      if (!button || button.disabled) return;
      
      const action = button.getAttribute("data-page");
      const isNext = action === "next";
      
      const key = type === 'active' ? 'pageActive' : 'pageInactive';
      const filterFn = type === 'active' ? (item) => item.is_active : (item) => !item.is_active;
      
      if (!isNext && state[key] > 1) {
          state[key] -= 1;
          render(state.rows);
      }
      
      if (isNext) {
          const totalPages = Math.max(1, Math.ceil(state.rows.filter(filterFn).length / PAGE_SIZE));
          if (state[key] < totalPages) {
              state[key] += 1;
              render(state.rows);
          }
      }
  };

  if (pagerActive) {
    pagerActive.addEventListener("click", (e) => handlePaging(e, 'active'));
  }

  if (pagerInactive) {
    pagerInactive.addEventListener("click", (e) => handlePaging(e, 'inactive'));
  }

  // Handle Forms
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const payload = createPayload();
        
        // Validation Visuals
        if (!payload.nama) {
           throw new Error("Nama siswa wajib diisi.");
        }
        if (state.mode === "create") {
          if (!payload.email || !payload.password) throw new Error("Email dan password akun wajib diisi.");
          if (!payload.program_id) throw new Error("Silakan pilih program bimbingan.");
        }
        
        await saveSiswa(payload, fields.siswaId.value || null);
        
        if (window.notifySuccess) {
          window.notifySuccess(
            state.mode === "edit" ? "Data Diperbarui" : "Siswa Ditambahkan",
            payload.nama
          );
        }
        close();
        fetchSiswa();
      } catch (err) {
        if (formError) {
            formError.textContent = err.message;
            formError.classList.remove('hidden');
        }
        if (window.notifyError) {
          window.notifyError("Gagal menyimpan", err.message);
        }
      }
    });
  }

  if (renewForm) {
    renewForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (renewError) {
          renewError.textContent = "";
          renewError.classList.add('hidden');
      }
      try {
        const siswaId = renewFields.siswaId.value;
        const programId = renewFields.programId.value;
        const startDate = renewFields.startDate.value;
        
        if (!siswaId) throw new Error("ID Siswa tidak valid.");
        if (!programId) throw new Error("Program wajib dipilih.");
        if (!startDate) throw new Error("Tanggal mulai wajib diisi.");

        const res = await fetch(`/api/siswa/${siswaId}/renew`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ program_id: programId, start_date: startDate }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Gagal memperpanjang program.");
        }
        if (window.notifySuccess) {
          window.notifySuccess("Berhasil", "Program berhasil diperpanjang.");
        }
        closeRenew();
        fetchSiswa();
      } catch (err) {
        if (renewError) {
            renewError.textContent = err.message;
            renewError.classList.remove('hidden');
        }
        if (window.notifyError) {
          window.notifyError("Gagal renew", err.message);
        }
      }
    });
  }

  // Init
  fetchSiswa();
  fetchPrograms();
})();
