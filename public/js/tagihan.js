(() => {
  const { ROLES, TAGIHAN_STATUS } = window.APP_CONSTANTS;

  const state = {
    role: null,
    data: [],
    enrollments: [],
    search: "",
    status: "aktif",
    month: "", // Empty = show all, not filtered by month
    page: 1,
    pageSize: 10,
  };

  const fetchJson = async (url, options = {}) => {
    const requester = window.api?.request || fetch;
    const res = await requester(url, { credentials: "same-origin", ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Permintaan gagal.");
    return data && data.success ? data.data : data;
  };

  const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value || 0);

  const formatDate = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
  };

  // --- Modal Helpers ---
  const toggleModal = (modalId, show) => {
      const modal = document.getElementById(modalId);
      if(!modal) return;
      const card = modal.querySelector('.modal-card');
      if(show){
          modal.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
          if(card) { card.classList.remove('scale-95'); card.classList.add('scale-100'); }
      } else {
          modal.classList.add('hidden', 'opacity-0', 'pointer-events-none');
          if(card) { card.classList.add('scale-95'); card.classList.remove('scale-100'); }
      }
  };

  const handleActionClick = async (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;

    const item = state.data.find((row) => String(row.id) === String(id));
    if (!item) return;

    if (btn.classList.contains("detail-btn")) {
      openDetail(item);
    } else if (btn.classList.contains("pay-btn")) {
      if (window.openPembayaranModal) window.openPembayaranModal(item);
    } else if (btn.classList.contains("delete-btn")) {
      if (!confirm("Hapus tagihan ini secara permanen?")) return;
      try {
        await fetchJson(`/api/tagihan/${id}`, { method: "DELETE" });
        if (window.notifySuccess) window.notifySuccess("Dihapus", "Tagihan berhasil dihapus.");
        await load();
      } catch (err) {
        if (window.notifyError) window.notifyError("Gagal menghapus", err.message);
      }
    }
  };

  // --- MODERN CARD VIEW FOR STUDENTS ---
  const renderSiswaCards = (rows, tbody, empty) => {
    const table = tbody.closest("table");
    const wrapper = document.getElementById("tagihanSection") || table.parentNode;
    
    // Hide Navigation Tabs if present
    const tabContainer = document.getElementById("tabTagihan")?.parentNode;
    if(tabContainer) tabContainer.style.display = 'none';

    let container = document.getElementById("tagihanCardContainer");

    if (!container) {
      container = document.createElement("div");
      container.id = "tagihanCardContainer";
      container.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2";
      
      // Make table wrapper invisible but keep layout
      if (wrapper.classList.contains("glass-panel")) {
           // Keep wrapper style, just replace content logic
      } else if (wrapper.classList.contains("bg-white")) {
          wrapper.classList.remove("bg-white", "shadow", "shadow-sm", "border", "border-gray-200", "rounded-xl", "p-6");
          wrapper.classList.add("bg-transparent");
      }
      
      // Hide original table content
      Array.from(wrapper.children).forEach(child => {
          child.classList.add("hidden");
      });

      wrapper.appendChild(container);
      container.addEventListener("click", handleActionClick);
    }

    container.classList.remove("hidden");

    // Remove old pager if any
    let cardPager = document.getElementById("tagihanCardPager");
    if (cardPager) cardPager.remove();

    if (rows.length === 0) {
      container.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-20 text-center">
           <div class="w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
               <i class="fa-solid fa-check-circle text-4xl text-emerald-500"></i>
           </div>
           <h3 class="text-slate-700 font-bold text-xl">Tidak ada tagihan aktif</h3>
           <p class="text-slate-400 text-sm mt-2 max-w-sm">Semua administrasi Anda telah lunas. Terima kasih telah melakukan pembayaran tepat waktu.</p>
        </div>
      `;
      return;
    }

    // Pagination for siswa card view
    const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * state.pageSize;
    const pageRows = rows.slice(start, start + state.pageSize);

    // Render pager below cards
    if (rows.length > state.pageSize) {
      cardPager = document.createElement("div");
      cardPager.id = "tagihanCardPager";
      cardPager.className = "flex items-center justify-between mt-4 px-2";
      cardPager.innerHTML = `
        <span class="text-xs text-slate-500 font-semibold">Halaman ${state.page} dari ${totalPages}</span>
        <div class="flex gap-2">
          <button class="w-9 h-9 flex items-center justify-center rounded-xl border ${
            state.page === 1
              ? "bg-gray-50 text-gray-300 cursor-not-allowed"
              : "bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm"
          } transition" type="button" data-page="prev" ${state.page === 1 ? "disabled" : ""}>
            <i class="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <button class="w-9 h-9 flex items-center justify-center rounded-xl border ${
            state.page === totalPages
              ? "bg-gray-50 text-gray-300 cursor-not-allowed"
              : "bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm"
          } transition" type="button" data-page="next" ${state.page === totalPages ? "disabled" : ""}>
            <i class="fa-solid fa-chevron-right text-xs"></i>
          </button>
        </div>
      `;
      cardPager.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.disabled) return;
          state.page = btn.dataset.page === "prev" ? state.page - 1 : state.page + 1;
          render();
        });
      });
      container.after(cardPager);
    }

    container.innerHTML = pageRows.map((item) => {
      const nominal = Number(item.nominal || 0);
      const totalBayar = Number(item.total_bayar || 0);
      const progress = nominal ? Math.min(Math.round((totalBayar / nominal) * 100), 100) : 0;
      const status = item.status_tagihan || "belum_bayar";
      
      let statusConfig = { class: "bg-slate-100 text-slate-600", icon: "fa-clock", color: "text-slate-400" };
      let borderClass = "border-l-4 border-slate-300";
      let progressBarColor = "bg-slate-300";

      if (status === TAGIHAN_STATUS.LUNAS) {
          statusConfig = { class: "bg-emerald-100 text-emerald-700", icon: "fa-check", color: "text-emerald-500" };
          borderClass = "border-l-4 border-emerald-500";
          progressBarColor = "bg-emerald-500";
      } else if (status === TAGIHAN_STATUS.CICILAN) {
          statusConfig = { class: "bg-amber-100 text-amber-700", icon: "fa-chart-pie", color: "text-amber-500" };
          borderClass = "border-l-4 border-amber-500";
          progressBarColor = "bg-amber-500";
      } else if (status === "belum_bayar") {
          statusConfig = { class: "bg-rose-100 text-rose-700", icon: "fa-exclamation", color: "text-rose-500" };
          borderClass = "border-l-4 border-rose-500";
          progressBarColor = "bg-rose-500";
      }

      return `
        <div class="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden border border-slate-100 ${borderClass}">
           
           <div class="absolute -right-6 -top-6 w-24 h-24 bg-gray-50 rounded-full opacity-50 group-hover:bg-indigo-50 transition-colors"></div>

           <div class="flex justify-between items-start mb-4 relative z-10">
               <div>
                   <span class="px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider ${statusConfig.class} mb-2 inline-block">
                     ${status.replace("_", " ")}
                   </span>
                   <h4 class="font-bold text-slate-800 text-lg leading-tight line-clamp-2" title="${item.program_nama}">${item.program_nama || "-"}</h4>
               </div>
               <div class="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center ${statusConfig.color} border border-slate-50">
                  <i class="fa-solid ${statusConfig.icon}"></i>
               </div>
           </div>
           
           <div class="space-y-3 relative z-10">
              <div class="flex justify-between items-center text-sm text-slate-500">
                  <span><i class="fa-regular fa-calendar mr-1"></i> Jatuh Tempo</span>
                  <span class="font-semibold text-slate-700">${formatDate(item.tanggal_jatuh_tempo)}</span>
              </div>
              
              <div class="pt-2">
                 <div class="flex justify-between text-xs font-bold mb-1.5 uppercase tracking-wide">
                    <span class="text-slate-400">Progres Bayar</span>
                    <span class="${statusConfig.color}">${progress}%</span>
                 </div>
                 <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full ${progressBarColor} transition-all duration-1000" style="width: ${progress}%"></div>
                 </div>
              </div>

              <div class="flex items-end justify-between pt-2 border-t border-slate-50 mt-2">
                 <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Tagihan</p>
                    <p class="text-xl font-extrabold text-slate-800 font-mono tracking-tight">${formatRupiah(nominal)}</p>
                 </div>
                 <button class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center justify-center detail-btn" data-id="${item.id}">
                   <i class="fa-solid fa-arrow-right"></i>
                 </button>
              </div>
           </div>
        </div>
      `;
    }).join("");
  };

  const render = () => {
    const body = document.getElementById("tagihanBody");
    const empty = document.getElementById("tagihanEmpty");
    const summary = document.getElementById("siswaTagihanSummary");
    const summaryTotal = document.getElementById("siswaTagihanTotal");
    const adminSummary = document.getElementById("adminTagihanSummary");
    const lunasCountEl = document.getElementById("tagihanLunasCount");
    const belumCountEl = document.getElementById("tagihanBelumLunasCount");
    if (!body) return;
    
    body.innerHTML = "";
    
    const filtered = state.data.filter((item) => {
      const keyword = `${item.siswa_nama} ${item.program_nama}`.toLowerCase();
      const matchSearch = keyword.includes(state.search.toLowerCase());
      const matchStatus =
        state.status === "aktif"
          ? item.status_tagihan !== TAGIHAN_STATUS.LUNAS
          : state.status
            ? item.status_tagihan === state.status
            : true;
      return matchSearch && matchStatus;
    });

    if (state.role === ROLES.SISWA) {
      if (summary) summary.classList.remove("hidden");
      if (summaryTotal) {
        const activeTotal = filtered
          .filter((item) => item.status_tagihan !== TAGIHAN_STATUS.LUNAS)
          .reduce((acc, item) => {
            const nominal = Number(item.nominal || 0);
            const totalBayar = Number(item.total_bayar || 0);
            const sisa = Math.max(nominal - totalBayar, 0);
            return acc + sisa;
          }, 0);
        summaryTotal.textContent = formatRupiah(activeTotal);
      }
      renderSiswaCards(filtered, body, empty);
      return;
    }

    if (adminSummary) adminSummary.classList.remove("hidden");
    if (lunasCountEl || belumCountEl) {
      const lunasCount = state.data.filter((item) => item.status_tagihan === TAGIHAN_STATUS.LUNAS).length;
      const belumCount = state.data.filter((item) => item.status_tagihan !== TAGIHAN_STATUS.LUNAS).length;
      if (lunasCountEl) lunasCountEl.textContent = lunasCount;
      if (belumCountEl) belumCountEl.textContent = belumCount;
    }

    const table = body.closest("table");
    if (table) table.classList.remove("hidden");
    const cardContainer = document.getElementById("tagihanCardContainer");
    if (cardContainer) cardContainer.classList.add("hidden");

    body.innerHTML = "";
    if (empty) {
        if (filtered.length === 0) {
            empty.classList.remove("hidden");
            table.parentElement.classList.add("hidden"); // Hide scroll wrapper
        } else {
            empty.classList.add("hidden");
            table.parentElement.classList.remove("hidden");
        }
    }

    const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * state.pageSize;
    const pageRows = filtered.slice(start, start + state.pageSize);

    const pagerEl = document.getElementById("tagihanPager");
    if (pagerEl) {
      if (filtered.length <= state.pageSize) {
        pagerEl.classList.add("hidden");
      } else {
        pagerEl.classList.remove("hidden");
        pagerEl.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-500 font-semibold">Halaman ${state.page} dari ${totalPages}</span>
            <div class="flex gap-2">
              <button class="w-8 h-8 flex items-center justify-center rounded-lg border ${
                state.page === 1
                  ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                  : "bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
              } transition" type="button" data-page="prev" ${state.page === 1 ? "disabled" : ""}>
                <i class="fa-solid fa-chevron-left text-xs"></i>
              </button>
              <button class="w-8 h-8 flex items-center justify-center rounded-lg border ${
                state.page === totalPages
                  ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                  : "bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
              } transition" type="button" data-page="next" ${state.page === totalPages ? "disabled" : ""}>
                <i class="fa-solid fa-chevron-right text-xs"></i>
              </button>
            </div>
          </div>
        `;
        pagerEl.querySelectorAll("button").forEach((btn) => {
          btn.addEventListener("click", () => {
            if (btn.disabled) return;
            state.page = btn.dataset.page === "prev" ? state.page - 1 : state.page + 1;
            render();
          });
        });
      }
    }

    pageRows.forEach((item) => {
      const totalBayar = Number(item.total_bayar || 0);
      const nominal = Number(item.nominal || 0);
      const sisa = Math.max(nominal - totalBayar, 0);
      const progress = nominal ? Math.min(Math.round((totalBayar / nominal) * 100), 100) : 0;
      
      const row = document.createElement("tr");
      
      // Status & Progress Color Logic
      let statusBadge = "";
      let progressBarColor = "bg-indigo-500";
      
      if(item.status_tagihan === TAGIHAN_STATUS.LUNAS) {
          statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm"><i class="fa-solid fa-check mr-1"></i> Lunas</span>`;
          progressBarColor = "bg-emerald-500";
      } else if(item.status_tagihan === TAGIHAN_STATUS.CICILAN) {
          statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold bg-amber-100 text-amber-700 border border-amber-200 shadow-sm"><i class="fa-solid fa-clock mr-1"></i> Cicilan</span>`;
          progressBarColor = "bg-amber-500";
      } else {
          statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold bg-rose-100 text-rose-700 border border-rose-200 shadow-sm"><i class="fa-solid fa-circle-exclamation mr-1"></i> Belum</span>`;
          progressBarColor = "bg-rose-500";
      }

      row.innerHTML = `
        <td>
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs shadow-sm border border-indigo-100">
                    ${item.siswa_nama.substring(0,2).toUpperCase()}
                </div>
                <div>
                    <div class="font-bold text-slate-800">${item.siswa_nama}</div>
                    <div class="text-xs text-slate-500 line-clamp-1">${item.program_nama}</div>
                </div>
            </div>
        </td>
        <td class="font-bold text-slate-700 font-mono text-sm">${formatRupiah(nominal)}</td>
        <td class="text-emerald-600 font-semibold font-mono text-sm">${formatRupiah(totalBayar)}</td>
        <td class="text-rose-500 font-semibold font-mono text-sm">${formatRupiah(sisa)}</td>
        <td>
            <div class="w-full">
                <div class="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                    <span>${progress}%</span>
                </div>
                <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full ${progressBarColor} rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,0,0,0.1)]" style="width: ${progress}%"></div>
                </div>
            </div>
        </td>
        <td class="text-xs font-semibold text-slate-500">
            <div class="flex items-center gap-1.5">
                <i class="fa-regular fa-calendar text-slate-400"></i> ${formatDate(item.tanggal_jatuh_tempo)}
            </div>
        </td>
        <td>
            ${statusBadge}
        </td>
        <td class="text-right">
          ${
            state.role === ROLES.ADMIN_CABANG
              ? `<div class="flex items-center justify-end gap-2">
                   <button class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition shadow-sm flex items-center justify-center detail-btn" title="Detail" data-id="${item.id}">
                      <i class="fa-solid fa-info"></i>
                   </button>
                   ${
                     item.status_tagihan !== TAGIHAN_STATUS.LUNAS
                       ? `<button class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition shadow-sm flex items-center justify-center pay-btn" title="Bayar" data-id="${item.id}">
                            <i class="fa-solid fa-wallet"></i>
                          </button>`
                       : ""
                   }
                   <button class="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition shadow-sm flex items-center justify-center delete-btn" title="Hapus" data-id="${item.id}">
                      <i class="fa-solid fa-trash-can"></i>
                   </button>
                 </div>`
              : `<button class="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold transition detail-btn" data-id="${item.id}">Detail</button>`
          }
        </td>
      `;
      body.appendChild(row);
    });
  };

  const load = async () => {
    const params = new URLSearchParams();
    if (state.month) {
      const [year, month] = state.month.split("-");
      if (year && month) {
        params.set("year", year);
        params.set("month", month);
      }
    }
    const query = params.toString();
    const data = await fetchJson(`/api/tagihan${query ? `?${query}` : ""}`);
    state.data = data || [];
    render();
  };

  const loadEnrollments = async () => {
    const data = await fetchJson("/api/tagihan/enrollments");
    state.enrollments = data || [];
    const select = document.getElementById("enrollmentSelect");
    if (!select) return;
    select.innerHTML = "<option value=\"\">-- Pilih Siswa & Program --</option>";
    state.enrollments.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.enrollment_id;
      option.textContent = `${item.siswa_nama} - ${item.program_nama}`;
      option.dataset.harga = item.harga;
      select.appendChild(option);
    });
  };

  const init = async () => {
    const session = await fetchJson("/api/auth/session");
    state.role = session.user?.role || null;
    const addBtn = document.getElementById("addTagihanBtn");
    const addPembayaranBtn = document.getElementById("addPembayaranBtn");
    const filterContainer = document.getElementById("filterContainer");
    const summary = document.getElementById("siswaTagihanSummary");
    const adminSummary = document.getElementById("adminTagihanSummary");
    
    // Hide add button if not admin
    if (addBtn && state.role !== ROLES.ADMIN_CABANG) {
      addBtn.style.display = "none";
    }
    if (addPembayaranBtn && state.role !== ROLES.ADMIN_CABANG) {
      addPembayaranBtn.style.display = "none";
    }
    if (filterContainer && state.role === ROLES.SISWA) {
      filterContainer.style.display = "none";
    }
    if (summary && state.role !== ROLES.SISWA) {
      summary.classList.add("hidden");
    }
    if (adminSummary && state.role === ROLES.SISWA) {
      adminSummary.classList.add("hidden");
    }

    const filterSelect = document.getElementById("tagihanFilter");
    const monthInput = document.getElementById("tagihanMonth");
    
    if (filterSelect) filterSelect.value = state.status;

    if (monthInput) {
      state.month = monthInput.value || "";
      monthInput.addEventListener("change", (event) => {
        state.month = event.target.value;
        state.page = 1;
        load();
      });
    }

    await load();
    if (state.role === ROLES.ADMIN_CABANG) {
      await loadEnrollments();
    }

    const searchInput = document.getElementById("tagihanSearch");
    if (searchInput) {
      searchInput.addEventListener("input", (event) => {
        state.search = event.target.value;
        state.page = 1;
        render();
      });
    }
    if (filterSelect) {
      filterSelect.addEventListener("change", (event) => {
        state.status = event.target.value;
        state.page = 1;
        render();
      });
    }

    // Modal Events
    const closeBtn = document.getElementById("closeTagihanModal");
    const cancelBtn = document.getElementById("cancelTagihanModal");
    
    if (addBtn) addBtn.addEventListener("click", () => toggleModal('tagihanModal', true));
    if (closeBtn) closeBtn.addEventListener("click", () => toggleModal('tagihanModal', false));
    if (cancelBtn) cancelBtn.addEventListener("click", () => toggleModal('tagihanModal', false));

    const enrollmentSelect = document.getElementById("enrollmentSelect");
    const nominalInput = document.getElementById("tagihanNominal");
    if (enrollmentSelect && nominalInput) {
      enrollmentSelect.addEventListener("change", (event) => {
        const selected = event.target.selectedOptions[0];
        if (selected && selected.dataset.harga) {
          nominalInput.value = selected.dataset.harga;
        }
      });
    }

    const saveBtn = document.getElementById("saveTagihanBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        const error = document.getElementById("tagihanError");
        const btnText = saveBtn.innerText;
        saveBtn.innerText = "Menyimpan...";
        saveBtn.disabled = true;

        if (error) { error.textContent = ""; error.classList.add('hidden'); }
        
        try {
          const enrollmentId = document.getElementById("enrollmentSelect").value;
          const jenisTagihan = document.getElementById("jenisTagihan").value;
          const nominal = document.getElementById("tagihanNominal").value;
          const tanggal = document.getElementById("tagihanTanggal").value;

          if(!enrollmentId || !nominal) throw new Error("Mohon lengkapi data wajib.");

          await fetchJson("/api/tagihan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              enrollment_id: enrollmentId,
              jenis_tagihan: jenisTagihan,
              nominal,
              tanggal_jatuh_tempo: tanggal,
            }),
          });
          
          if (window.notifySuccess) window.notifySuccess("Tagihan tersimpan", "Data tagihan berhasil dibuat.");
          
          toggleModal('tagihanModal', false);
          await load();
        } catch (err) {
          if (error) {
             error.querySelector('span').textContent = err.message;
             error.classList.remove('hidden');
          }
          if (window.notifyError) window.notifyError("Gagal menyimpan tagihan", err.message);
        } finally {
            saveBtn.innerText = btnText;
            saveBtn.disabled = false;
        }
      });
    }

    // Table Actions Delegation
    const body = document.getElementById("tagihanBody");
    if (body) {
      body.addEventListener("click", handleActionClick);
    }
  };

  const openDetail = (item) => {
    const subtitle = document.getElementById("tagihanDetailSubtitle");
    const program = document.getElementById("detailProgram");
    const nominal = document.getElementById("detailNominal");
    const paid = document.getElementById("detailPaid");
    const remaining = document.getElementById("detailRemaining");
    const status = document.getElementById("detailStatus");
    const progressBar = document.getElementById("detailProgressBar");
    const progressText = document.getElementById("detailProgressText");

    const totalBayar = Number(item.total_bayar || 0);
    const nominalValue = Number(item.nominal || 0);
    const sisa = Math.max(nominalValue - totalBayar, 0);
    const progress = nominalValue ? Math.min(Math.round((totalBayar / nominalValue) * 100), 100) : 0;

    if (subtitle) subtitle.textContent = `${item.siswa_nama} • ${item.program_nama}`;
    if (program) program.textContent = item.program_nama || "-";
    if (nominal) nominal.textContent = formatRupiah(nominalValue);
    if (paid) paid.textContent = formatRupiah(totalBayar);
    if (remaining) remaining.textContent = formatRupiah(sisa);
    if (status) {
        status.textContent = item.status_tagihan?.replace('_', ' ') || "-";
        status.className = "px-3 py-1 rounded-full text-xs font-bold uppercase shadow-sm ";
        if(item.status_tagihan === TAGIHAN_STATUS.LUNAS) status.classList.add("bg-emerald-100", "text-emerald-700", "border", "border-emerald-200");
        else if(item.status_tagihan === TAGIHAN_STATUS.CICILAN) status.classList.add("bg-amber-100", "text-amber-700", "border", "border-amber-200");
        else status.classList.add("bg-rose-100", "text-rose-700", "border", "border-rose-200");
    }
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
        // Dynamic Gradient based on progress
        if(progress === 100) progressBar.className = "h-full bg-emerald-500 rounded-full transition-all duration-1000";
        else progressBar.className = "h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000";
    }
    if (progressText) progressText.textContent = `${progress}%`;

    toggleModal('tagihanDetailModal', true);

    const closeBtn = document.getElementById("closeDetailModal");
    const closeBottom = document.getElementById("closeDetailModalBottom");
    if(closeBtn) closeBtn.onclick = () => toggleModal('tagihanDetailModal', false);
    if(closeBottom) closeBottom.onclick = () => toggleModal('tagihanDetailModal', false);
  };

  window.addEventListener("pembayaran:updated", () => {
    load();
  });

  init();
})();
