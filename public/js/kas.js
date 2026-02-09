(() => {
  const monthInput = document.getElementById("kasMonth");
  const searchInput = document.getElementById("kasSearch");
  
  // Modal Elements
  const saldoModal = document.getElementById("saldoModal");
  const btnOpenSaldo = document.getElementById("btnOpenSaldo");
  const btnCloseSaldo = document.getElementById("btnCloseSaldo");
  
  // Form Elements inside Modal
  const saldoForm = document.getElementById("kasSaldoForm");
  const saldoPeriodInput = document.getElementById("kasSaldoPeriode");
  const saldoNominalInput = document.getElementById("kasSaldoNominal");
  const saldoResetBtn = document.getElementById("kasSaldoReset");

  // Summary Cards
  const saldoAwalEl = document.getElementById("kasSaldoAwal");
  const pemasukanEl = document.getElementById("kasPemasukan");
  const pengeluaranEl = document.getElementById("kasPengeluaran");
  const saldoAkhirEl = document.getElementById("kasSaldoAkhir");

  // Table & Pager
  const rowsEl = document.getElementById("kasRows");
  const emptyEl = document.getElementById("kasEmpty");
  const pagerEl = document.getElementById("kasPager");
  const pagerInfoEl = document.getElementById("kasPagerInfo");

  // State
  let cachedRows = []; // Stores all data fetched
  let filteredRows = []; // Stores data after search filter
  let currentPage = 1;
  const PAGE_SIZE = 10; // Jumlah baris per halaman

  // --- Helpers ---
  const fetchJson = async (url, options = {}) => {
    const requester = window.api?.request || fetch;
    const res = await requester(url, { credentials: "same-origin", ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Permintaan gagal.");
    return data.success ? data.data : data;
  };

  const formatRupiah = (value) => `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getPeriod = () => {
    const [year, month] = (monthInput.value || "").split("-");
    const now = new Date();
    return {
      year: Number(year || now.getFullYear()),
      month: Number(month || now.getMonth() + 1),
    };
  };

  // --- Modal Logic ---
  const setModalVisible = (show) => {
      if (!saldoModal) return;
      const card = saldoModal.querySelector(".modal-card");
      if (show) {
          saldoModal.classList.remove("hidden", "opacity-0", "pointer-events-none");
          if (card) { card.classList.remove("scale-95"); card.classList.add("scale-100"); }
          // Sync input
          if(saldoPeriodInput && monthInput) saldoPeriodInput.value = monthInput.value;
          // Auto focus
          if(saldoNominalInput) setTimeout(() => saldoNominalInput.focus(), 100);
      } else {
          saldoModal.classList.add("hidden", "opacity-0", "pointer-events-none");
          if (card) { card.classList.add("scale-95"); card.classList.remove("scale-100"); }
      }
  };

  // --- Rendering ---

  const renderSummary = (summary) => {
    if (!summary) return;
    if (saldoAwalEl) saldoAwalEl.textContent = formatRupiah(summary.saldo_awal);
    if (pemasukanEl) pemasukanEl.textContent = formatRupiah(summary.pemasukan);
    if (pengeluaranEl) pengeluaranEl.textContent = formatRupiah(summary.pengeluaran);
    if (saldoAkhirEl) saldoAkhirEl.textContent = formatRupiah(summary.saldo_akhir);
    
    // Auto-fill form input only if empty or reset
    if (saldoNominalInput && !saldoNominalInput.value && summary.saldo_awal > 0) {
        saldoNominalInput.value = summary.saldo_awal;
    }
  };

  const getCategoryBadge = (kategori, type) => {
     const icon = type === 'pemasukan' ? 'fa-arrow-down' : 'fa-arrow-up';
     const color = type === 'pemasukan' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100';
     return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${color} uppercase tracking-wider">
        <i class="fa-solid ${icon} text-[10px]"></i> ${kategori || 'UMUM'}
     </span>`;
  };

  const renderTable = () => {
    rowsEl.innerHTML = "";
    const total = filteredRows.length;
    
    // Calculate Pagination
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageData = filteredRows.slice(start, end);

    // Empty State
    if (!total) {
      emptyEl.classList.remove("hidden");
      pagerEl.classList.add("hidden");
      return;
    }
    emptyEl.classList.add("hidden");
    pagerEl.classList.remove("hidden");

    // Render Rows
    pageData.forEach((row) => {
      const isPemasukan = row.tipe === "pemasukan";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="font-medium text-gray-600">
            ${formatDate(row.tanggal)}
        </td>
        <td>
            ${getCategoryBadge(row.kategori, row.tipe)}
        </td>
        <td>
            <div class="text-gray-800 font-medium">${row.deskripsi || "Tanpa Keterangan"}</div>
        </td>
        <td class="text-right">
             <span class="font-bold font-mono text-sm ${isPemasukan ? "text-emerald-600" : "text-rose-600"}">
                ${isPemasukan ? "+" : "-"} ${formatRupiah(row.nominal)}
             </span>
        </td>
      `;
      rowsEl.appendChild(tr);
    });

    // Update Pager Controls
    if (pagerInfoEl) {
        pagerInfoEl.textContent = `Halaman ${currentPage} dari ${totalPages}`;
    }
    
    const btnPrev = pagerEl.querySelector('[data-page="prev"]');
    const btnNext = pagerEl.querySelector('[data-page="next"]');
    
    if (btnPrev) {
        btnPrev.disabled = currentPage <= 1;
        btnPrev.classList.toggle('opacity-50', currentPage <= 1);
    }
    if (btnNext) {
        btnNext.disabled = currentPage >= totalPages;
        btnNext.classList.toggle('opacity-50', currentPage >= totalPages);
    }
  };

  // --- Main Logic ---

  const applyFilter = () => {
    const keyword = (searchInput?.value || "").toLowerCase().trim();
    if (!keyword) {
      filteredRows = [...cachedRows];
    } else {
      filteredRows = cachedRows.filter(
        (row) =>
          (row.kategori && row.kategori.toLowerCase().includes(keyword)) ||
          (row.deskripsi && row.deskripsi.toLowerCase().includes(keyword)) ||
          (row.nominal && row.nominal.toString().includes(keyword))
      );
    }
    // Reset to page 1 on new search
    currentPage = 1;
    renderTable();
  };

  const loadKas = async () => {
    try {
        const { year, month } = getPeriod();
        // Load Summary & Entries
        const [summary, entries] = await Promise.all([
            fetchJson(`/api/kas?year=${year}&month=${month}`),
            fetchJson(`/api/kas/entries?year=${year}&month=${month}`)
        ]);
        
        renderSummary(summary);
        cachedRows = entries || [];
        applyFilter(); // This calls renderTable
    } catch (err) {
        if (window.notifyError) window.notifyError("Gagal memuat data", err.message);
    }
  };

  // --- Event Listeners ---

  // 1. Period Filter
  if (monthInput) {
    const now = new Date();
    if (!monthInput.value) {
        const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        monthInput.value = defaultMonth;
    }
    monthInput.addEventListener("change", () => {
      currentPage = 1; // Reset paging on period change
      loadKas();
    });
  }

  // 2. Modal Logic
  if (btnOpenSaldo) btnOpenSaldo.addEventListener("click", () => setModalVisible(true));
  if (btnCloseSaldo) btnCloseSaldo.addEventListener("click", () => setModalVisible(false));
  
  if (saldoForm) {
    saldoForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const [year, month] = (monthInput.value || "").split("-");
      try {
        await fetchJson("/api/kas/saldo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            year,
            month,
            nominal: Number(saldoNominalInput.value || 0),
          }),
        });
        if (window.notifySuccess) window.notifySuccess("Saldo Tersimpan", "Data saldo awal diperbarui.");
        setModalVisible(false);
        await loadKas();
      } catch (err) {
        if (window.notifyError) window.notifyError("Gagal menyimpan saldo", err.message);
      }
    });
  }

  if (saldoResetBtn) {
    saldoResetBtn.addEventListener("click", () => {
      saldoNominalInput.value = "";
      saldoNominalInput.focus();
    });
  }

  // 3. Search Logic
  if (searchInput) {
    searchInput.addEventListener("input", applyFilter);
  }

  // 4. Pagination Logic
  if (pagerEl) {
      pagerEl.addEventListener("click", (e) => {
          const btn = e.target.closest("button");
          if (!btn || btn.disabled) return;
          
          const action = btn.dataset.page;
          const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
          
          if (action === "prev" && currentPage > 1) {
              currentPage--;
              renderTable();
          } else if (action === "next" && currentPage < totalPages) {
              currentPage++;
              renderTable();
          }
      });
  }

  // Init
  loadKas();
})();
