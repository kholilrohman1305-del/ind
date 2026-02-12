(() => {
  const requester = window.api?.request || fetch;
  const unwrapData = (payload) => {
    if (payload && typeof payload === "object" && "data" in payload) {
      return payload.data;
    }
    return payload;
  };
  const { ENROLLMENT_STATUS, PENDAFTARAN_STATUS, TIPE_LES } = window.APP_CONSTANTS;

  // --- DOM Elements ---
  // Note: ID rowsActiveEl sekarang adalah <tbody> table, bukan div grid lagi
  const rowsActiveEl = document.getElementById("siswaRowsActive");
  const rowsInactiveEl = document.getElementById("siswaRowsInactive");
  const rowsPendingEl = document.getElementById("siswaRowsPending");
  const searchInput = document.getElementById("searchSiswa");

  // Empty States
  const emptyActiveEl = document.getElementById("siswaEmptyActive");
  const emptyInactiveEl = document.getElementById("siswaEmptyInactive");
  const emptyPendingEl = document.getElementById("siswaEmptyPending");

  // Badges (Counts)
  const badgeActive = document.getElementById("badgeActive");
  const badgeInactive = document.getElementById("badgeInactive");
  const badgePending = document.getElementById("badgePending");

  // Pagers
  const pagerActive = document.getElementById("siswaPagerActive");
  const pagerInactive = document.getElementById("siswaPagerInactive");
  const pagerPending = document.getElementById("siswaPagerPending");
  const pagerActiveInfo = document.getElementById("siswaPagerActiveInfo");
  const pagerInactiveInfo = document.getElementById("siswaPagerInactiveInfo");
  const pagerPendingInfo = document.getElementById("siswaPagerPendingInfo");
  const filterTipeLes = document.getElementById("filterTipeLes");
  const filterJenjang = document.getElementById("filterJenjang");
  const countPrivat = document.getElementById("countPrivat");
  const countKelas = document.getElementById("countKelas");
  const countJenjangTK = document.getElementById("countJenjangTK");
  const countJenjangSD = document.getElementById("countJenjangSD");
  const countJenjangSMP = document.getElementById("countJenjangSMP");
  const countJenjangSMA = document.getElementById("countJenjangSMA");
  const countJenjangAlumni = document.getElementById("countJenjangAlumni");
  
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
    "siswaId", "nama", "nik", "telepon", "alamat", "tanggal_lahir",
    "sekolah_asal", "jenjang", "kelas", "email", "password", "is_active", "program_id",
    "edukator_id" // Field baru (virtual/injected)
  ].reduce((acc, id) => {
    acc[id] = document.getElementById(id);
    return acc;
  }, {});

  // Mapel Checkbox List
  const mapelCheckboxList = document.getElementById("mapelCheckboxList");

  // --- State Management ---
  const state = {
    rows: [],
    mode: "create",
    programs: [],
    edukators: [],
    mapels: [], // Mapel list for checkbox selection
    pageActive: 1,
    pageInactive: 1,
    pagePending: 1,
    searchQuery: "", // New state for search
    filterTipeLes: "",
    filterJenjang: "",
    recommendedScores: {},
    riskScores: {}, // Store risk data: { siswa_id: { score, details } }
  };

  const PAGE_SIZE = 10; // 10 rows per page is standard for tables

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

  const avatarGradient = (name) => {
    const hue = stringToHue(name || "SISWA");
    return `linear-gradient(135deg, hsl(${hue}, 80%, 70%), hsl(${(hue + 50) % 360}, 85%, 60%))`;
  };

  // --- Rendering Logic (List View Table) ---

  const renderSection = (data, container, emptyEl, pagerEl, pagerInfoEl, pageKey) => {
    if (!container) return;
    container.innerHTML = "";
    
    // Check if table parent needs to be shown/hidden
    const tableContainer = container.closest('table')?.parentNode;

    const total = data.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    
    state[pageKey] = Math.max(1, Math.min(state[pageKey], totalPages)); 
    const currentPage = state[pageKey];
    
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageRows = data.slice(startIndex, startIndex + PAGE_SIZE);

    // Handle Empty State
    if (!pageRows.length) {
      if (emptyEl) emptyEl.classList.remove("hidden");
      if (tableContainer) tableContainer.classList.add("hidden"); // Hide the table overflow div
      if (pagerEl) pagerEl.classList.add("hidden");
      return;
    }

    // Show Data
    if (emptyEl) emptyEl.classList.add("hidden");
    if (tableContainer) tableContainer.classList.remove("hidden");
    
    // Handle Pager visibility
    if (pagerEl) {
       pagerEl.classList.remove("hidden"); // Always show pager area to keep layout stable
       const prevBtn = pagerEl.querySelector('[data-page="prev"]');
       const nextBtn = pagerEl.querySelector('[data-page="next"]');
       
       // Update buttons state
       if (prevBtn) {
         prevBtn.disabled = currentPage <= 1;
         prevBtn.classList.toggle('opacity-50', currentPage <= 1);
         prevBtn.classList.toggle('cursor-not-allowed', currentPage <= 1);
       }
       if (nextBtn) {
         nextBtn.disabled = currentPage >= totalPages;
         nextBtn.classList.toggle('opacity-50', currentPage >= totalPages);
         nextBtn.classList.toggle('cursor-not-allowed', currentPage >= totalPages);
       }
    }

    if (pagerInfoEl) {
      pagerInfoEl.textContent = `Halaman ${currentPage} dari ${totalPages} (${total} Data)`;
    }

    // Render Table Rows (TR)
    pageRows.forEach((item) => {
      const tr = document.createElement("tr");
      tr.className = "group hover:bg-indigo-50/30 transition-colors border-b border-gray-100 last:border-0";
      
      const programLabel = item.program_list || "Belum ada";
      const kelasLabel = item.kelas || "-";
      const sekolahLabel = item.sekolah_asal || "-";
      const nikLabel = item.nik || "-";
      const cabangLabel = item.cabang_nama || "-";
      const mapelLabel = item.mapel_list || "Belum ada";
      
      // Risk Badge Logic
      let riskBadge = "";
      const riskData = state.riskScores[item.id];
      if (riskData && riskData.risk_score > 0) {
          let colorClass = "bg-blue-50 text-blue-600 border-blue-100"; // Low Risk (< 25%)
          let iconClass = "fa-circle-info";

          if (riskData.risk_score >= 75) {
             colorClass = "bg-rose-100 text-rose-700 border-rose-200"; // High Risk
             iconClass = "fa-triangle-exclamation";
          } else if (riskData.risk_score >= 50) {
             colorClass = "bg-amber-100 text-amber-700 border-amber-200"; // Medium Risk
             iconClass = "fa-circle-exclamation";
          }
          
          riskBadge = `
            <button class="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${colorClass} hover:opacity-80 transition cursor-pointer" title="Klik untuk detail risiko" data-action="risk-detail" data-id="${item.id}">
               <i class="fa-solid ${iconClass}"></i> Risiko ${riskData.risk_score}%
            </button>`;
      }

      // Progress calculation
      const totalPertemuan = Number(item.total_pertemuan || 0);
      const pertemuanSelesai = Number(item.pertemuan_selesai || 0);
      const totalJadwal = Number(item.total_jadwal || 0);
      const progressPersen = totalPertemuan > 0 ? Math.round((pertemuanSelesai / totalPertemuan) * 100) : 0;
      const isProgramSelesai = totalPertemuan > 0 && pertemuanSelesai >= totalPertemuan;
      const isPendingJadwal = item.status_enrollment === ENROLLMENT_STATUS.MENUNGGU_JADWAL || (totalPertemuan > 0 && totalJadwal === 0);

      // Tagihan calculation
      const sisaTagihan = Number(item.sisa_tagihan || 0);
      const tagihanBelumLunas = Number(item.tagihan_belum_lunas || 0);

      // Status logic: selesai, pending, aktif
      let statusBadge = "";
      if (isProgramSelesai) {
        statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-blue-50 text-blue-600 border-blue-100">
          <i class="fa-solid fa-check-double text-[10px]"></i> Selesai
        </span>`;
      } else if (isPendingJadwal) {
        statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-600 border-amber-100">
          <i class="fa-solid fa-clock text-[10px]"></i> Pending
        </span>`;
      } else {
        statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-600 border-emerald-100">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif
        </span>`;
      }

      // Template Table Row Modern
      tr.innerHTML = `
        <td class="p-4 align-middle">
          <div class="flex items-center gap-4">
             <div class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white"
                  style="background:${avatarGradient(item.nama)}">
               ${initials(item.nama)}
             </div>
             <div>
               <div class="font-bold text-gray-800 text-sm hover:text-indigo-600 transition cursor-default" title="${item.nama}">
                 ${item.nama}
               </div>
               <div class="text-xs text-gray-400 flex items-center gap-1">
                 <i class="fa-regular fa-id-card"></i> ${nikLabel}
               </div>
               ${riskBadge}
             </div>
          </div>
        </td>
        <td class="p-4 align-middle">
           <span class="text-xs text-gray-600">${cabangLabel}</span>
        </td>
        <td class="p-4 align-middle">
           <div class="flex flex-col gap-1">
             <span class="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded w-fit">
               ${kelasLabel}
             </span>
             <span class="text-[11px] text-gray-400 truncate max-w-[150px]" title="${sekolahLabel}">
               ${sekolahLabel}
             </span>
           </div>
        </td>
        <td class="p-4 align-middle">
          <div class="flex flex-wrap gap-1 max-w-[200px]">
            ${String(mapelLabel).split(', ').map(m => `<span class="text-xs bg-slate-50 text-slate-700 px-2 py-0.5 rounded border border-slate-100">${m}</span>`).join('')}
          </div>
        </td>
        <td class="p-4 align-middle">
           <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
             <i class="fa-solid fa-book-open text-[10px]"></i> ${programLabel}
           </span>
        </td>
        <td class="p-4 align-middle">
           <div class="flex flex-col gap-1">
             <div class="flex items-center gap-2">
               <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[80px]">
                 <div class="h-full ${progressPersen >= 100 ? 'bg-blue-500' : 'bg-indigo-500'} rounded-full transition-all" style="width: ${progressPersen}%"></div>
               </div>
               <span class="text-xs font-bold ${progressPersen >= 100 ? 'text-blue-600' : 'text-gray-600'}">${progressPersen}%</span>
             </div>
             <span class="text-[10px] text-gray-400">${pertemuanSelesai}/${totalPertemuan} pertemuan</span>
           </div>
        </td>
        <td class="p-4 align-middle">
           ${sisaTagihan > 0 ? `
             <div class="flex flex-col gap-0.5">
               <span class="text-xs font-bold text-rose-600">Rp ${new Intl.NumberFormat('id-ID').format(sisaTagihan)}</span>
               <span class="text-[10px] text-gray-400">${tagihanBelumLunas} tagihan</span>
             </div>
           ` : `
             <span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-600">
               <i class="fa-solid fa-check text-[10px]"></i> Lunas
             </span>
           `}
        </td>
        <td class="p-4 align-middle">
           ${statusBadge}
        </td>
        <td class="p-4 align-middle text-right">
           <div class="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
              <button class="w-8 h-8 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 transition tooltip-btn"
                   data-action="edit" data-id="${item.id}" title="Edit Data">
                <i class="fa-regular fa-pen-to-square"></i>
              </button>

              <button class="w-8 h-8 flex items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 transition tooltip-btn"
                   data-action="renew" data-id="${item.id}" title="Perpanjang Program">
                 <i class="fa-solid fa-rotate"></i>
              </button>

              <button class="w-8 h-8 flex items-center justify-center rounded-lg text-amber-500 hover:bg-amber-50 transition tooltip-btn"
                   data-action="toggle" data-id="${item.id}" title="${item.is_active ? 'Nonaktifkan' : 'Aktifkan'}">
                 <i class="fa-solid fa-power-off"></i>
              </button>

              <button class="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition tooltip-btn"
                    data-action="delete" data-id="${item.id}" title="Hapus Siswa">
                <i class="fa-regular fa-trash-can"></i>
              </button>
           </div>
        </td>
      `;
      container.appendChild(tr);
    });
  };

  const ensureTableHeader = () => {
    [rowsActiveEl, rowsInactiveEl].forEach(el => {
        const table = el ? el.closest("table") : null;
        if (!table) return;
        const theadRow = table.querySelector("thead tr");
        if (!theadRow) return;
        
        // Cek apakah header "Asal Cabang" sudah ada
        const headers = Array.from(theadRow.querySelectorAll("th"));
        const hasCabang = headers.some(th => th.textContent.trim() === "Asal Cabang");

        if (!hasCabang) {
            const th = document.createElement("th");
            th.className = "p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider";
            th.textContent = "Asal Cabang";
            // Insert setelah kolom pertama (Profil)
            theadRow.insertBefore(th, headers[1] || null);
        }
    });
  };

  const normalizeTipeLes = (item) => {
    return (item.tipe_les || item.program_tipe_les || "").toLowerCase();
  };

  const filterRows = (rows) => {
    const query = state.searchQuery.toLowerCase();
    return rows.filter((item) => {
      const matchSearch = !query || (item.nama?.toLowerCase().includes(query) || item.nik?.includes(query) || item.kelas?.toLowerCase().includes(query));
      const matchTipe = !state.filterTipeLes || normalizeTipeLes(item) === state.filterTipeLes;
      const matchJenjang = !state.filterJenjang || String(item.jenjang || "").toUpperCase() === state.filterJenjang;
      return matchSearch && matchTipe && matchJenjang;
    });
  };

  const updateSummaryCards = (rows) => {
    const privatCount = rows.filter((r) => normalizeTipeLes(r) === TIPE_LES.PRIVAT).length;
    const kelasCount = rows.filter((r) => normalizeTipeLes(r) === TIPE_LES.KELAS).length;
    const countByJenjang = rows.reduce((acc, r) => {
      const key = String(r.jenjang || "").toUpperCase();
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    if (countPrivat) countPrivat.textContent = privatCount;
    if (countKelas) countKelas.textContent = kelasCount;
    if (countJenjangTK) countJenjangTK.textContent = countByJenjang.PAUD_TK || 0;
    if (countJenjangSD) countJenjangSD.textContent = countByJenjang.SD || 0;
    if (countJenjangSMP) countJenjangSMP.textContent = countByJenjang.SMP || 0;
    if (countJenjangSMA) countJenjangSMA.textContent = countByJenjang.SMA || 0;
    if (countJenjangAlumni) countJenjangAlumni.textContent = countByJenjang.ALUMNI || 0;
  };

  const render = (data) => {
    // 1. Filter based on Search + Filter
    const filteredData = filterRows(data);

    // 2. Split Pending / Active / Inactive
    const pending = filteredData.filter((item) => item.status_pendaftaran === PENDAFTARAN_STATUS.PENDING);
    const active = filteredData.filter((item) => item.status_pendaftaran !== PENDAFTARAN_STATUS.PENDING && item.is_active);
    const inactive = filteredData.filter((item) => item.status_pendaftaran !== PENDAFTARAN_STATUS.PENDING && !item.is_active);

    // 3. Render Table Rows
    renderPendingSection(pending);
    renderSection(active, rowsActiveEl, emptyActiveEl, pagerActive, pagerActiveInfo, "pageActive");
    renderInactiveSection(inactive);
    updateSummaryCards(filteredData);

    // 4. Update Badges
    if (badgePending) {
        badgePending.textContent = pending.length;
        badgePending.classList.toggle('hidden', pending.length === 0);
    }
    if (badgeActive) {
        badgeActive.textContent = active.length;
        badgeActive.classList.toggle('hidden', active.length === 0);
    }
    if (badgeInactive) {
        badgeInactive.textContent = inactive.length;
        badgeInactive.classList.toggle('hidden', inactive.length === 0);
    }
  };

  // --- Render Pending Section (Siswa Baru) ---
  const renderPendingSection = (data) => {
    if (!rowsPendingEl) return;
    rowsPendingEl.innerHTML = "";

    const tableContainer = rowsPendingEl.closest('table')?.parentNode;
    const total = data.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    state.pagePending = Math.max(1, Math.min(state.pagePending, totalPages));
    const currentPage = state.pagePending;
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageRows = data.slice(startIndex, startIndex + PAGE_SIZE);

    // Handle Empty State
    if (!pageRows.length) {
      if (emptyPendingEl) emptyPendingEl.classList.remove("hidden");
      if (tableContainer) tableContainer.classList.add("hidden");
      if (pagerPending) pagerPending.classList.add("hidden");
      return;
    }

    // Show Data
    if (emptyPendingEl) emptyPendingEl.classList.add("hidden");
    if (tableContainer) tableContainer.classList.remove("hidden");

    // Handle Pager
    if (pagerPending) {
      pagerPending.classList.remove("hidden");
      const prevBtn = pagerPending.querySelector('[data-page="prev"]');
      const nextBtn = pagerPending.querySelector('[data-page="next"]');
      if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
        prevBtn.classList.toggle('opacity-50', currentPage <= 1);
      }
      if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.classList.toggle('opacity-50', currentPage >= totalPages);
      }
    }
    if (pagerPendingInfo) {
      pagerPendingInfo.textContent = `Halaman ${currentPage} dari ${totalPages} (${total} Data)`;
    }

    // Render Table Rows
    pageRows.forEach((item) => {
      const tr = document.createElement("tr");
      tr.className = "group hover:bg-blue-50/30 transition-colors border-b border-gray-100 last:border-0";

      // Program & Mapel
      const programLabel = item.selected_program_nama || item.program_nama || "Belum dipilih";
      const mapelList = item.selected_mapel_nama || item.mapel_list || "Belum dipilih";

      // Parse preferred days
      let daysDisplay = "-";
      try {
        const days = JSON.parse(item.preferred_days || "[]");
        daysDisplay = days.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(", ");
      } catch (e) {
        daysDisplay = "-";
      }

      // Format jam
      const jamDisplay = item.preferred_jam_mulai && item.preferred_jam_selesai
        ? `${String(item.preferred_jam_mulai).slice(0, 5)} - ${String(item.preferred_jam_selesai).slice(0, 5)}`
        : "-";

      // Format tanggal mulai
      const tanggalMulai = item.tanggal_mulai_belajar
        ? new Date(item.tanggal_mulai_belajar).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        : "-";

      // Format tanggal daftar
      const tanggalDaftar = item.created_at
        ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        : "-";

      tr.innerHTML = `
        <td class="p-4 align-middle">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white"
                 style="background:${avatarGradient(item.nama)}">
              ${initials(item.nama)}
            </div>
            <div>
              <div class="font-bold text-gray-800 text-sm">${item.nama}</div>
              <div class="text-xs text-gray-400">${item.telepon || '-'}</div>
              <div class="text-xs text-gray-400">${item.jenjang || '-'}</div>
            </div>
          </div>
        </td>
        <td class="p-4 align-middle">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <i class="fa-solid fa-book-open text-[10px]"></i> ${programLabel}
          </span>
        </td>
        <td class="p-4 align-middle">
          <div class="flex flex-wrap gap-1 max-w-[200px]">
            ${String(mapelList).split(', ').map(m => `<span class="text-xs bg-slate-50 text-slate-700 px-2 py-0.5 rounded border border-slate-100">${m}</span>`).join('')}
          </div>
        </td>
        <td class="p-4 align-middle">
          <div class="text-sm space-y-1">
            <div class="flex items-center gap-1 text-gray-600">
              <i class="fa-solid fa-calendar-days text-gray-400 w-4"></i>
              <span class="text-xs">${daysDisplay}</span>
            </div>
            <div class="flex items-center gap-1 text-gray-600">
              <i class="fa-solid fa-clock text-gray-400 w-4"></i>
              <span class="text-xs">${jamDisplay}</span>
            </div>
            <div class="flex items-center gap-1 text-gray-500">
              <i class="fa-solid fa-play text-gray-400 w-4"></i>
              <span class="text-xs">Mulai: ${tanggalMulai}</span>
            </div>
          </div>
        </td>
        <td class="p-4 align-middle">
          <span class="text-xs text-gray-500">${tanggalDaftar}</span>
        </td>
        <td class="p-4 align-middle text-right">
          <div class="flex items-center justify-end gap-2">
            <button class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition shadow-sm"
                    data-action="activate" data-id="${item.id}" title="Aktivasi Siswa">
              <i class="fa-solid fa-check mr-1"></i> Aktivasi
            </button>
            <button class="w-8 h-8 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 transition"
                    data-action="edit" data-id="${item.id}" title="Edit Data">
              <i class="fa-regular fa-pen-to-square"></i>
            </button>
            <button class="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition"
                    data-action="delete" data-id="${item.id}" title="Hapus">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;
      rowsPendingEl.appendChild(tr);
    });
  };

  // --- Render Inactive Section (Nonaktif / Alumni) ---
  const renderInactiveSection = (data) => {
    if (!rowsInactiveEl) return;
    rowsInactiveEl.innerHTML = "";

    const tableContainer = rowsInactiveEl.closest('table')?.parentNode;
    const total = data.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    state.pageInactive = Math.max(1, Math.min(state.pageInactive, totalPages));
    const currentPage = state.pageInactive;
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageRows = data.slice(startIndex, startIndex + PAGE_SIZE);

    if (!pageRows.length) {
      if (emptyInactiveEl) emptyInactiveEl.classList.remove("hidden");
      if (tableContainer) tableContainer.classList.add("hidden");
      if (pagerInactive) pagerInactive.classList.add("hidden");
      return;
    }

    if (emptyInactiveEl) emptyInactiveEl.classList.add("hidden");
    if (tableContainer) tableContainer.classList.remove("hidden");

    if (pagerInactive) {
      pagerInactive.classList.remove("hidden");
      const prevBtn = pagerInactive.querySelector('[data-page="prev"]');
      const nextBtn = pagerInactive.querySelector('[data-page="next"]');
      if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
        prevBtn.classList.toggle('opacity-50', currentPage <= 1);
      }
      if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.classList.toggle('opacity-50', currentPage >= totalPages);
      }
    }
    if (pagerInactiveInfo) {
      pagerInactiveInfo.textContent = `Halaman ${currentPage} dari ${totalPages} (${total} Data)`;
    }

    pageRows.forEach((item) => {
      const tr = document.createElement("tr");
      tr.className = "group hover:bg-amber-50/30 transition-colors border-b border-gray-100 last:border-0";

      const kelasLabel = item.kelas || "-";
      const sekolahLabel = item.sekolah_asal || "-";
      const nikLabel = item.nik || "-";
      const cabangLabel = item.cabang_nama || "-";
      const programLabel = item.program_list || item.program_nama || "Belum ada";
      const mapelLabel = item.mapel_list || "Belum ada";

      const progressLabel = item.progress_label || "-";
      const tagihanLabel = item.tagihan_label || "-";

      tr.innerHTML = `
        <td class="p-4 align-middle">
          <div class="flex items-center gap-4">
             <div class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white" 
                  style="background:${avatarGradient(item.nama)}">
               ${initials(item.nama)}
             </div>
             <div>
               <div class="font-bold text-gray-800 text-sm hover:text-amber-600 transition cursor-default" title="${item.nama}">
                 ${item.nama}
               </div>
               <div class="text-xs text-gray-400 flex items-center gap-1">
                 <i class="fa-regular fa-id-card"></i> ${nikLabel}
               </div>
             </div>
          </div>
        </td>
        <td class="p-4 align-middle">
           <div class="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200 w-fit">
             <i class="fa-solid fa-building text-gray-400"></i>
             <span class="font-semibold">${cabangLabel}</span>
           </div>
        </td>
        <td class="p-4 align-middle">
           <div class="flex flex-col gap-1">
             <span class="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded w-fit">
               ${kelasLabel}
             </span>
             <span class="text-[11px] text-gray-400 truncate max-w-[150px]" title="${sekolahLabel}">
               ${sekolahLabel}
             </span>
           </div>
        </td>
        <td class="p-4 align-middle">
          <div class="flex flex-wrap gap-1 max-w-[200px]">
            ${String(mapelLabel).split(', ').map(m => `<span class="text-xs bg-slate-50 text-slate-700 px-2 py-0.5 rounded border border-slate-100">${m}</span>`).join('')}
          </div>
        </td>
        <td class="p-4 align-middle">
           <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
             <i class="fa-solid fa-book-open text-[10px]"></i> ${programLabel}
           </span>
        </td>
        <td class="p-4 align-middle">
           <span class="text-xs text-gray-500">${progressLabel}</span>
        </td>
        <td class="p-4 align-middle">
           <span class="text-xs text-gray-500">${tagihanLabel}</span>
        </td>
        <td class="p-4 align-middle">
           <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${item.is_active 
             ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
             : 'bg-amber-50 text-amber-600 border-amber-100'}">
             <span class="w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
             ${item.is_active ? 'Aktif' : 'Nonaktif'}
           </span>
        </td>
        <td class="p-4 align-middle text-right">
           <div class="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
              <button class="w-8 h-8 flex items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 transition tooltip-btn" 
                   data-action="edit" data-id="${item.id}" title="Edit Data">
                <i class="fa-regular fa-pen-to-square"></i>
              </button>
              
              <button class="w-8 h-8 flex items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 transition tooltip-btn" 
                   data-action="renew" data-id="${item.id}" title="Perpanjang Program">
                 <i class="fa-solid fa-rotate"></i>
              </button>
              
              <button class="w-8 h-8 flex items-center justify-center rounded-lg text-amber-500 hover:bg-amber-50 transition tooltip-btn" 
                   data-action="toggle" data-id="${item.id}" title="${item.is_active ? 'Nonaktifkan' : 'Aktifkan'}">
                 <i class="fa-solid fa-power-off"></i>
              </button>

              <button class="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition tooltip-btn" 
                    data-action="delete" data-id="${item.id}" title="Hapus Siswa">
                <i class="fa-regular fa-trash-can"></i>
              </button>
           </div>
        </td>
      `;
      rowsInactiveEl.appendChild(tr);
    });
  };

  // --- Data & API Logic (Standard) ---

  const renderPrograms = () => {
    const select = fields.program_id;
    if (!select) return;
    select.innerHTML = "";
    
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Pilih program bimbingan...";
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
      const res = await requester("/api/program", { credentials: "same-origin" });
      if (!res.ok) { state.programs = []; renderPrograms(); return; }
      const payload = await res.json();
      const data = unwrapData(payload);
      state.programs = Array.isArray(data) ? data : [];
      renderPrograms();
    } catch (err) { state.programs = []; renderPrograms(); }
  };

  const fetchEdukators = async () => {
    try {
      const res = await requester("/api/edukator", { credentials: "same-origin" });
      if (!res.ok) { state.edukators = []; return; }
      const payload = await res.json();
      const data = unwrapData(payload);
      state.edukators = Array.isArray(data) ? data : [];

      // Note: Dropdown akan di-render ulang saat user berinteraksi dengan input search
    } catch (err) { state.edukators = []; }
  };

  const fetchMapels = async () => {
    try {
      const res = await requester("/api/mapel", { credentials: "same-origin" });
      if (!res.ok) { state.mapels = []; return; }
      const payload = await res.json();
      const data = unwrapData(payload);
      state.mapels = Array.isArray(data) ? data : [];
    } catch (err) { state.mapels = []; }
  };

  const renderMapelCheckboxes = (selectedIds = []) => {
    if (!mapelCheckboxList) return;
    mapelCheckboxList.innerHTML = "";

    if (!state.mapels.length) {
      mapelCheckboxList.innerHTML = '<span class="text-xs text-gray-400">Tidak ada mapel tersedia</span>';
      return;
    }

    state.mapels.forEach((item) => {
      const isChecked = selectedIds.includes(item.id);
      const label = document.createElement("label");
      label.className = "flex items-center gap-2 p-1.5 rounded hover:bg-violet-50 cursor-pointer transition";
      label.innerHTML = `
        <input type="checkbox" name="mapel_ids" value="${item.id}" ${isChecked ? 'checked' : ''}
               class="w-4 h-4 text-violet-600 rounded focus:ring-violet-500 border-gray-300" />
        <span class="text-sm text-gray-700">${item.nama}</span>
      `;
      mapelCheckboxList.appendChild(label);
    });
  };

  const getSelectedMapelIds = () => {
    if (!mapelCheckboxList) return [];
    const checkboxes = mapelCheckboxList.querySelectorAll('input[name="mapel_ids"]:checked');
    return Array.from(checkboxes).map(cb => Number(cb.value));
  };

  const fetchRisks = async () => {
    try {
        const res = await requester("/api/churn/risks", { credentials: "same-origin" });
        if (res.ok) {
            const json = await res.json();
            state.riskScores = {};
            (json.data || []).forEach(r => state.riskScores[r.id] = r);
            render(state.rows); // Re-render to show badges
        }
    } catch (e) { console.error("Risk fetch failed", e); }
  };

  const fetchSiswa = async () => {
    try {
      const res = await requester("/api/siswa", { credentials: "same-origin" });
      if (!res.ok) { render([]); return; }
      const payload = await res.json();
      const data = unwrapData(payload);
      state.rows = Array.isArray(data) ? data : [];
      // Reset pages on new fetch
      state.pageActive = 1;
      state.pageInactive = 1;
      ensureTableHeader();
      render(state.rows);
      fetchRisks(); // Fetch risks after students loaded
    } catch (err) { render([]); }
  };

  // --- Modal & Form Logic (Same as before) ---
  // ... (Bagian ini tidak berubah banyak, hanya pemanggilan fungsi)

  const setModalVisible = (targetModal, isVisible) => {
    if (!targetModal) return;
    const card = targetModal.querySelector(".modal-card");
    if (isVisible) {
      targetModal.classList.remove("hidden", "opacity-0", "pointer-events-none");
      if (card) { card.classList.remove("scale-95"); card.classList.add("scale-100"); }
      return;
    }
    targetModal.classList.add("hidden", "opacity-0", "pointer-events-none");
    if (card) { card.classList.add("scale-95"); card.classList.remove("scale-100"); }
  };

  const openModal = async (mode, data) => {
    if (!modal || !form) return;
    state.mode = mode;
    form.reset();
    if (formError) formError.classList.add('hidden');

    if (!state.programs.length) {
      await fetchPrograms();
    } else {
      renderPrograms();
    }

    if (!state.mapels.length) {
      await fetchMapels();
    }

    fields.siswaId.value = data?.id || "";
    fields.nama.value = data?.nama || "";
    fields.nik.value = data?.nik || "";
    fields.telepon.value = data?.telepon || "";
    fields.alamat.value = data?.alamat || "";
    fields.tanggal_lahir.value = data?.tanggal_lahir ? data.tanggal_lahir.split("T")[0] : "";
    fields.sekolah_asal.value = data?.sekolah_asal || "";
    fields.jenjang.value = data?.jenjang || "";
    fields.kelas.value = data?.kelas || "";
    fields.program_id.value = data?.program_id || "";
    fields.email.value = data?.email || "";
    fields.password.value = "";
    if (fields.edukator_id) fields.edukator_id.value = ""; // Reset edukator
    fields.is_active.checked = data ? (data.is_active ? true : false) : true;
    fields.password.required = mode === "create";

    // Reset UI Rekomendasi
    state.recommendedScores = {};
    const searchInput = document.getElementById("edukator_search");
    if (searchInput) searchInput.value = "";
    const resultContainer = document.getElementById("rekomendasiResult");
    if (resultContainer) resultContainer.classList.add("hidden");

    // Render mapel checkboxes - get selected mapel_ids from siswa's mapel_list
    const selectedMapelIds = [];
    if (mode === "edit" && data?.mapel_list) {
      // Find mapel IDs by matching names
      const mapelNames = data.mapel_list.split(", ").map(n => n.trim());
      state.mapels.forEach(m => {
        if (mapelNames.includes(m.nama)) selectedMapelIds.push(m.id);
      });
    } else if (mode === "edit" && data?.program_id) {
      // Fallback: pilih mapel berdasarkan program jika mapel_list kosong
      const program = state.programs.find(p => String(p.id) === String(data.program_id));
      if (program?.mapel_id) selectedMapelIds.push(Number(program.mapel_id));
    }
    renderMapelCheckboxes(selectedMapelIds);

    if (modalTitle) modalTitle.textContent = mode === "edit" ? "Edit Data Siswa" : "Tambah Siswa Baru";
    setModalVisible(modal, true);
  };

  const close = () => setModalVisible(modal, false);

  const openRenewModal = (data) => {
    if (!renewModal || !renewForm) return;
    if (renewError) renewError.classList.add('hidden');
    renewFields.siswaId.value = data?.id || "";
    renewFields.programId.value = data?.program_id || "";
    renewFields.startDate.value = new Date().toISOString().slice(0, 10);
    setModalVisible(renewModal, true);
  };

  const closeRenew = () => setModalVisible(renewModal, false);

  const createPayload = () => {
    const payload = {
      nama: fields.nama.value.trim(),
      nik: fields.nik.value.trim(),
      telepon: fields.telepon.value.trim(),
      alamat: fields.alamat.value.trim(),
      tanggal_lahir: fields.tanggal_lahir.value || null,
      sekolah_asal: fields.sekolah_asal.value.trim(),
      jenjang: fields.jenjang.value || null,
      kelas: fields.kelas.value.trim(),
      program_id: fields.program_id.value || null,
      edukator_id: fields.edukator_id ? fields.edukator_id.value : null,
      mapel_ids: getSelectedMapelIds(), // Mapel selection
      is_active: fields.is_active.checked,
    };
    if (fields.email.value.trim()) payload.email = fields.email.value.trim();
    if (fields.password.value) payload.password = fields.password.value;
    return payload;
  };

  const saveSiswa = async (payload, id) => {
    const url = id ? `/api/siswa/${id}` : "/api/siswa";
    const method = id ? "PUT" : "POST";
    const res = await requester(url, {
      method, headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Gagal menyimpan data.");
  };

  const deleteSiswa = async (id) => {
    const res = await requester(`/api/siswa/${id}`, { method: "DELETE", credentials: "same-origin" });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Gagal menghapus data.");
  };

  // --- REKOMENDASI EDUKATOR UI ---
  const renderEducatorSelectionUI = () => {
    if (document.getElementById("edukatorSelectionWrapper")) return;

    const programSelect = document.getElementById("program_id");
    if (!programSelect || !programSelect.parentNode) return;

    const wrapper = document.createElement("div");
    wrapper.id = "edukatorSelectionWrapper";
    wrapper.className = "col-span-2 mt-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100";
    
    // Populate awal dengan semua edukator
    // Kita ganti select standar dengan custom searchable dropdown logic
    // Tapi untuk menjaga kompatibilitas form, kita tetap butuh hidden input atau select yang disembunyikan
    // Di sini kita gunakan select asli tapi disembunyikan, dan buat UI custom di atasnya

    wrapper.innerHTML = `
      <label class="block text-xs font-bold text-indigo-700 mb-2">Pilih Edukator (Opsional)</label>
      <div class="flex gap-2 relative">
        <div class="flex-1 relative">
            <input type="text" id="edukator_search" placeholder="Cari atau Pilih Edukator..." 
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" autocomplete="off">
            <input type="hidden" id="edukator_id" name="edukator_id">
            
            <div id="edukator_dropdown" class="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto hidden">
                <!-- Options will be injected here -->
            </div>
        </div>
        
        <button type="button" id="btnRekomendasi" class="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition shadow-sm flex items-center gap-1 flex-shrink-0">
          <i class="fa-solid fa-wand-magic-sparkles"></i> Rekomendasi
        </button>
      </div>
      <div id="rekomendasiResult" class="mt-2 hidden space-y-1 max-h-40 overflow-y-auto custom-scrollbar"></div>
    `;

    // Insert after program select's parent container (assuming grid layout)
    programSelect.parentNode.parentNode.insertBefore(wrapper, programSelect.parentNode.nextSibling);
    
    // Update fields reference
    fields.edukator_id = document.getElementById("edukator_id");
    const searchInput = document.getElementById("edukator_search");
    const dropdown = document.getElementById("edukator_dropdown");

    // Helper untuk render opsi dropdown
    const renderOptions = (filterText = "") => {
        const query = filterText.toLowerCase();
        let filtered = state.edukators.filter(e => 
            e.is_active && e.nama.toLowerCase().includes(query)
        );

        // Sort: Recommended first
        filtered.sort((a, b) => {
            const scoreA = state.recommendedScores?.[a.id] || 0;
            const scoreB = state.recommendedScores?.[b.id] || 0;
            if (scoreB !== scoreA) return scoreB - scoreA;
            return a.nama.localeCompare(b.nama);
        });

        if (filtered.length === 0) {
            dropdown.innerHTML = `<div class="p-2 text-xs text-gray-500 italic">Tidak ditemukan</div>`;
        } else {
            dropdown.innerHTML = `<div class="p-2 text-xs text-gray-500 hover:bg-gray-50 cursor-pointer border-b border-gray-50" data-val="">-- Kosongkan (Otomatis) --</div>` + 
            filtered.map(e => `
                <div class="p-2 text-sm text-gray-700 hover:bg-indigo-50 cursor-pointer transition-colors flex items-center justify-between" data-val="${e.id}" data-label="${e.nama}">
                    <span class="truncate mr-2">${e.nama}</span>
                    ${state.recommendedScores?.[e.id] ? `<span class="ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 whitespace-nowrap"><i class="fa-solid fa-star mr-1 text-emerald-500"></i> ${state.recommendedScores[e.id]}%</span>` : ''}
                </div>
            `).join("");
        }

        // Add click listeners to options
        dropdown.querySelectorAll("div[data-val]").forEach(el => {
            el.addEventListener("click", () => {
                fields.edukator_id.value = el.dataset.val;
                searchInput.value = el.dataset.label || ""; // Kosongkan text jika pilih "Kosongkan"
                dropdown.classList.add("hidden");
            });
        });
    };

    // Event Listeners untuk Custom Dropdown
    searchInput.addEventListener("focus", () => {
        renderOptions(searchInput.value);
        dropdown.classList.remove("hidden");
    });

    searchInput.addEventListener("input", (e) => {
        renderOptions(e.target.value);
        dropdown.classList.remove("hidden");
        // Jika user mengetik, reset ID dulu sampai mereka memilih
        if (fields.edukator_id.value) fields.edukator_id.value = ""; 
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.classList.add("hidden");
            // Validasi: Jika text di input tidak cocok dengan ID yang tersimpan, reset input
            const currentId = fields.edukator_id.value;
            if (currentId) {
                const selected = state.edukators.find(e => String(e.id) === String(currentId));
                if (selected) searchInput.value = selected.nama;
            } else {
                searchInput.value = ""; // Reset jika tidak ada ID valid yang dipilih
            }
        }
    });

    // Event Listener
    document.getElementById("btnRekomendasi").addEventListener("click", async () => {
        const programId = fields.program_id.value;
        if (!programId) {
            alert("Pilih program terlebih dahulu.");
            return;
        }

        const program = state.programs.find(p => String(p.id) === String(programId));
        if (!program) return;

        const btn = document.getElementById("btnRekomendasi");
        const resultContainer = document.getElementById("rekomendasiResult");
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
        resultContainer.innerHTML = '';
        resultContainer.classList.remove("hidden");

        try {
            // Asumsi mapel_id ada di program atau ambil mapel pertama dari program
            // Jika program punya banyak mapel, idealnya ada dropdown mapel dulu. 
            // Di sini kita ambil mapel_id dari program (jika single) atau null.
            const mapelId = program.mapel_id || (program.mapel_ids ? program.mapel_ids[0] : null);
            
            if (!mapelId) throw new Error("Program ini tidak memiliki mapel spesifik.");

            const res = await requester(`/api/rekomendasi/edukator?cabang_id=${program.cabang_id}&mapel_id=${mapelId}&jenjang=${program.jenjang || ''}`);
            const json = await res.json();
            
            if (json.success && json.data.length > 0) {
                // Store scores
                state.recommendedScores = {};
                json.data.forEach(d => {
                    state.recommendedScores[d.id] = d.total_score;
                });
                renderOptions(searchInput.value);

                // Show preview list
                resultContainer.innerHTML = json.data.slice(0, 3).map(e => `
                    <div class="text-xs flex justify-between items-center p-2 bg-white rounded border border-indigo-100 cursor-pointer hover:bg-indigo-50" 
                         data-id="${e.id}" data-nama="${e.nama}">
                        <span class="font-semibold text-gray-700">${e.nama}</span>
                        <span class="text-emerald-600 font-bold">${e.total_score}% Cocok</span>
                    </div>
                `).join("");

                // Add click handler for recommendation items
                resultContainer.querySelectorAll("div[data-id]").forEach(el => {
                    el.addEventListener("click", () => {
                        fields.edukator_id.value = el.dataset.id;
                        searchInput.value = el.dataset.nama;
                        resultContainer.classList.add("hidden"); // Hide recommendations after selection
                    });
                });
            } else {
                resultContainer.innerHTML = `<div class="text-xs text-gray-500 italic p-2">Tidak ada rekomendasi ditemukan.</div>`;
            }
        } catch (err) {
            alert("Gagal memuat rekomendasi: " + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Rekomendasi';
        }
    });
  };

  // --- Event Listeners ---

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        state.searchQuery = e.target.value;
        // Reset pages to 1 when searching
        state.pagePending = 1;
        state.pageActive = 1;
        state.pageInactive = 1;
        render(state.rows);
    });
  }
  if (filterTipeLes) {
    filterTipeLes.addEventListener("change", (e) => {
      state.filterTipeLes = e.target.value;
      state.pagePending = 1;
      state.pageActive = 1;
      state.pageInactive = 1;
      render(state.rows);
    });
  }
  if (filterJenjang) {
    filterJenjang.addEventListener("change", (e) => {
      state.filterJenjang = e.target.value;
      state.pagePending = 1;
      state.pageActive = 1;
      state.pageInactive = 1;
      render(state.rows);
    });
  }

  if (addButton) addButton.addEventListener("click", () => openModal("create"));
  if (closeModal) closeModal.addEventListener("click", close);
  if (cancelModal) cancelModal.addEventListener("click", close);
  if (closeRenewModal) closeRenewModal.addEventListener("click", closeRenew);
  if (cancelRenewModal) cancelRenewModal.addEventListener("click", closeRenew);

  const handleRowClick = async (event) => {
    const button = event.target.closest("button[data-action]"); 
    if (!button) return;
    
    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");
    if (!action || !id) return;

    if (action === "risk-detail") {
        openRiskDetail(id);
        return;
    }

    const siswa = state.rows.find((row) => String(row.id) === String(id));
    if (!siswa) return;

    if (action === "edit") openModal("edit", siswa);
    if (action === "renew") openRenewModal(siswa);
    if (action === "activate") {
      if (!confirm(`Aktivasi siswa "${siswa.nama}"?\n\nIni akan:\n- Membuat tagihan otomatis\n- Membuat jadwal otomatis berdasarkan preferensi\n- Mengaktifkan akun login siswa`)) return;
      try {
        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        const res = await requester(`/api/siswa/${id}/aktivasi`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin"
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Gagal aktivasi.");
        if (window.toast.success) {
          window.toast.success("Aktivasi Berhasil", `${siswa.nama} - ${data.jadwal_created || 0} jadwal dibuat`);
        }
        fetchSiswa();
      } catch (err) {
        if (window.toast.error) window.toast.error("Gagal aktivasi", err.message);
        button.disabled = false;
        button.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Aktivasi';
      }
      return;
    }
    if (action === "toggle") {
      try {
        await saveSiswa({ is_active: !siswa.is_active }, id);
        if (window.toast.success) window.toast.success("Status diperbarui", `${siswa.nama} sekarang ${!siswa.is_active ? 'Aktif' : 'Nonaktif'}`);
        fetchSiswa();
      } catch (err) {
        if (window.toast.error) window.toast.error("Gagal update status", err.message);
      }
    }
    if (action === "delete") {
      if (!confirm(`Hapus data siswa: ${siswa.nama}?`)) return;
      try {
        await deleteSiswa(id);
        if (window.toast.success) window.toast.success("Siswa dihapus", siswa.nama);
        fetchSiswa();
      } catch (err) {
        if (window.toast.error) window.toast.error("Gagal menghapus", err.message);
      }
    }
  };

  if (rowsActiveEl) rowsActiveEl.addEventListener("click", handleRowClick);
  if (rowsInactiveEl) rowsInactiveEl.addEventListener("click", handleRowClick);
  if (rowsPendingEl) rowsPendingEl.addEventListener("click", handleRowClick);

  const handlePaging = (event, type) => {
      const button = event.target.closest("button[data-page]");
      if (!button || button.disabled) return;
      const action = button.getAttribute("data-page");
      const isNext = action === "next";

      // Determine which page key to use
      let key;
      if (type === 'pending') key = 'pagePending';
      else if (type === 'active') key = 'pageActive';
      else key = 'pageInactive';

      const filtered = filterRows(state.rows);

      // Determine filter function based on type
      let filterFn;
      if (type === 'pending') {
        filterFn = (item) => item.status_pendaftaran === PENDAFTARAN_STATUS.PENDING;
      } else if (type === 'active') {
        filterFn = (item) => item.status_pendaftaran !== PENDAFTARAN_STATUS.PENDING && item.is_active;
      } else {
        filterFn = (item) => item.status_pendaftaran !== PENDAFTARAN_STATUS.PENDING && !item.is_active;
      }

      const currentList = filtered.filter(filterFn);

      if (!isNext && state[key] > 1) {
          state[key] -= 1;
          render(state.rows);
      } else if (isNext) {
          const totalPages = Math.max(1, Math.ceil(currentList.length / PAGE_SIZE));
          if (state[key] < totalPages) {
              state[key] += 1;
              render(state.rows);
          }
      }
  };

  if (pagerPending) pagerPending.addEventListener("click", (e) => handlePaging(e, 'pending'));
  if (pagerActive) pagerActive.addEventListener("click", (e) => handlePaging(e, 'active'));
  if (pagerInactive) pagerInactive.addEventListener("click", (e) => handlePaging(e, 'inactive'));

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const payload = createPayload();
        if (!payload.nama) throw new Error("Nama siswa wajib diisi.");
        if (!payload.jenjang) throw new Error("Silakan pilih jenjang pendidikan.");
        if (state.mode === "create") {
          if (!payload.email || !payload.password) throw new Error("Email dan password akun wajib diisi.");
          if (!payload.program_id) throw new Error("Silakan pilih program bimbingan.");
        }
        await saveSiswa(payload, fields.siswaId.value || null);
        if (window.toast.success) window.toast.success(state.mode === "edit" ? "Data Diperbarui" : "Siswa Ditambahkan", payload.nama);
        close();
        fetchSiswa();
      } catch (err) {
        if (formError) { formError.textContent = err.message; formError.classList.remove('hidden'); }
        if (window.toast.error) window.toast.error("Gagal menyimpan", err.message);
      }
    });
  }

  if (renewForm) {
    renewForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (renewError) renewError.classList.add('hidden');
      try {
        const siswaId = renewFields.siswaId.value;
        const programId = renewFields.programId.value;
        const startDate = renewFields.startDate.value;
        if (!siswaId || !programId || !startDate) throw new Error("Data tidak lengkap.");
        
        const res = await requester(`/api/siswa/${siswaId}/renew`, {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
          body: JSON.stringify({ program_id: programId, start_date: startDate }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Gagal renew.");
        if (window.toast.success) window.toast.success("Berhasil", "Program berhasil diperpanjang.");
        closeRenew();
        fetchSiswa();
      } catch (err) {
        if (renewError) { renewError.textContent = err.message; renewError.classList.remove('hidden'); }
        if (window.toast.error) window.toast.error("Gagal renew", err.message);
      }
    });
  }

  // Init
  fetchSiswa();
  fetchPrograms();
  fetchEdukators();
  fetchMapels();
  // Delay UI injection slightly to ensure DOM is ready
  setTimeout(renderEducatorSelectionUI, 500);
})();

