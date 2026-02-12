(() => {
  // --- DOM ELEMENTS ---
  const form = document.getElementById("pengeluaranForm");
  const resetBtn = document.getElementById("resetPengeluaran");
  
  const rowsEl = document.getElementById("pengeluaranRows");
  const emptyEl = document.getElementById("pengeluaranEmpty");
  const summaryEl = document.getElementById("pengeluaranSummary");
  
  const monthInput = document.getElementById("pengeluaranMonth");
  const searchInput = document.getElementById("pengeluaranSearch");

  let cachedRows = [];
  let currentPage = 1;
  const pageSize = 10;

  const fields = {
    tanggal: document.getElementById("pengeluaranTanggal"),
    kategori: document.getElementById("pengeluaranKategori"),
    nominal: document.getElementById("pengeluaranNominal"),
    deskripsi: document.getElementById("pengeluaranDeskripsi"),
  };

  // --- HELPERS ---
  const fetchJson = async (url, options = {}) => {
    const requester = window.api?.request || fetch;
    const res = await requester(url, { credentials: "same-origin", ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Request gagal.");
    }
    return data && data.success ? data.data : data;
  };

  const formatRupiah = (value) => new Intl.NumberFormat("id-ID").format(Number(value || 0));

  const formatDate = (dateStr) => {
      const options = { day: 'numeric', month: 'short', year: 'numeric' };
      return new Date(dateStr).toLocaleDateString('id-ID', options);
  };

  const stringToColor = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hue = Math.abs(hash % 360);
      return {
          bg: `hsl(${hue}, 85%, 94%)`,
          text: `hsl(${hue}, 70%, 40%)`
      };
  };

  // --- RENDER FUNCTIONS ---

  const renderSummary = (rows) => {
    if (!summaryEl) return;
    const totalNominal = rows.reduce((acc, row) => acc + Number(row.nominal || 0), 0);
    const totalCount = rows.length;

    summaryEl.innerHTML = `
      <div class="relative overflow-hidden rounded-2xl bg-gradient-expense p-6 text-white shadow-lg">
         <div class="relative z-10">
            <p class="text-red-100 text-sm font-medium mb-1">Total Pengeluaran (Bulan Ini)</p>
            <h2 class="text-3xl font-bold tracking-tight">Rp ${formatRupiah(totalNominal)}</h2>
         </div>
         <div class="absolute right-0 top-0 h-full w-24 bg-white/10 skew-x-12"></div>
         <div class="absolute right-4 bottom-4 opacity-20 text-6xl">
            <i class="fa-solid fa-coins"></i>
         </div>
      </div>

      <div class="relative overflow-hidden rounded-2xl bg-gradient-transaction p-6 text-white shadow-lg">
         <div class="relative z-10">
            <p class="text-blue-100 text-sm font-medium mb-1">Jumlah Transaksi</p>
            <h2 class="text-3xl font-bold tracking-tight">${totalCount} <span class="text-lg font-normal text-blue-100">Item</span></h2>
         </div>
         <div class="absolute right-0 top-0 h-full w-24 bg-white/10 skew-x-12"></div>
         <div class="absolute right-4 bottom-4 opacity-20 text-6xl">
            <i class="fa-solid fa-receipt"></i>
         </div>
      </div>
    `;
  };

  const renderRows = (rows) => {
    rowsEl.innerHTML = "";
    
    if (!rows.length) {
      emptyEl.classList.remove("hidden");
      const pager = document.getElementById("pengeluaranPager");
      if (pager) pager.classList.add("hidden");
      return;
    }
    emptyEl.classList.add("hidden");

    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize);

    const pager = document.getElementById("pengeluaranPager");
    if (pager) {
      if (rows.length <= pageSize) {
        pager.classList.add("hidden");
      } else {
        pager.classList.remove("hidden");
        pager.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500 font-medium">Halaman ${currentPage} dari ${totalPages}</span>
            <div class="flex gap-2">
              <button class="w-8 h-8 flex items-center justify-center rounded-lg border ${
                currentPage === 1
                  ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                  : "bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
              } transition" type="button" data-page="prev" ${currentPage === 1 ? "disabled" : ""}>
                <i class="fa-solid fa-chevron-left text-xs"></i>
              </button>
              <button class="w-8 h-8 flex items-center justify-center rounded-lg border ${
                currentPage === totalPages
                  ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                  : "bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
              } transition" type="button" data-page="next" ${currentPage === totalPages ? "disabled" : ""}>
                <i class="fa-solid fa-chevron-right text-xs"></i>
              </button>
            </div>
          </div>
        `;
        pager.querySelectorAll("button").forEach((btn) => {
          btn.addEventListener("click", () => {
            if (btn.disabled) return;
            currentPage = btn.dataset.page === "prev" ? currentPage - 1 : currentPage + 1;
            renderRows(rows);
          });
        });
      }
    }

    pageRows.forEach(row => {
        const tr = document.createElement("tr");
        tr.className = "border-b border-gray-50 hover:bg-gray-50 transition group";
        
        const colors = stringToColor(row.kategori || "?");
        const initial = (row.kategori || "?").charAt(0).toUpperCase();

        tr.innerHTML = `
            <td class="p-4 align-top w-32">
                <span class="text-gray-800 font-medium">${formatDate(row.tanggal)}</span>
            </td>
            <td class="p-4 align-top">
                <div class="flex gap-3">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center font-bold shrink-0" 
                         style="background-color: ${colors.bg}; color: ${colors.text};">
                        ${initial}
                    </div>
                    <div>
                        <div class="font-bold text-gray-800">${row.kategori}</div>
                        <div class="text-xs text-gray-500 mt-0.5 line-clamp-1">${row.deskripsi || "-"}</div>
                    </div>
                </div>
            </td>
            <td class="p-4 align-top text-right">
                <span class="font-bold text-red-500">- Rp ${formatRupiah(row.nominal)}</span>
            </td>
            <td class="p-4 align-top text-center w-20">
                <button class="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition shadow-sm" 
                        data-action="delete" data-id="${row.id}" title="Hapus Data">
                    <i class="fa-regular fa-trash-can text-sm"></i>
                </button>
            </td>
        `;
        rowsEl.appendChild(tr);
    });
  };

  // --- FILTER & LOAD LOGIC ---

  const applyFilters = () => {
    const keyword = searchInput?.value?.toLowerCase().trim() || "";
    
    const filtered = keyword
      ? cachedRows.filter((row) =>
          (row.kategori && row.kategori.toLowerCase().includes(keyword)) ||
          (row.deskripsi && row.deskripsi.toLowerCase().includes(keyword))
        )
      : cachedRows;
      
    renderRows(filtered);
    // Summary tetap menghitung total berdasarkan filter pencarian agar dinamis
    renderSummary(filtered); 
  };

  const loadRows = async () => {
    const params = new URLSearchParams();
    if (monthInput?.value) {
      const [year, month] = monthInput.value.split("-");
      if (year && month) {
        params.set("year", year);
        params.set("month", month);
      }
    }
    
    try {
        currentPage = 1;
        const query = params.toString();
        const rows = await fetchJson(`/api/pengeluaran${query ? `?${query}` : ""}`);
        cachedRows = rows || [];
        applyFilters();
    } catch (err) {
        console.error("Gagal memuat data:", err);
        cachedRows = [];
        applyFilters();
    }
  };

  // --- EVENT LISTENERS ---

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = {
        tanggal: fields.tanggal.value,
        kategori: fields.kategori.value.trim(),
        nominal: Number(fields.nominal.value || 0),
        deskripsi: fields.deskripsi.value.trim(),
      };
      
      try {
          await fetchJson("/api/pengeluaran", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          
          if(window.toast.success) window.toast.success("Berhasil", "Pengeluaran tercatat.");
          form.reset();
          
          // Set tanggal kembali ke hari ini
          fields.tanggal.valueAsDate = new Date();
          
          await loadRows();
      } catch (err) {
          if(window.toast.error) window.toast.error("Gagal", err.message);
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
        form?.reset();
        fields.tanggal.valueAsDate = new Date();
    });
  }

  // Filter Month Change
  if (monthInput) {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (!monthInput.value) monthInput.value = defaultMonth;
    
    monthInput.addEventListener("change", () => loadRows());
  }

  // Search Input
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentPage = 1;
      applyFilters();
    });
  }

  // Delete Action
  if (rowsEl) {
    rowsEl.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      
      if (button.dataset.action === "delete") {
          if (!confirm("Hapus data pengeluaran ini?")) return;
          try {
              await fetchJson(`/api/pengeluaran/${button.dataset.id}`, { method: "DELETE" });
              if(window.toast.success) window.toast.success("Terhapus", "Data pengeluaran dihapus.");
              await loadRows();
          } catch (err) {
              if(window.toast.error) window.toast.error("Gagal Hapus", err.message);
          }
      }
    });
  }

  // Set default date form to today
  if(fields.tanggal && !fields.tanggal.value) {
      fields.tanggal.valueAsDate = new Date();
  }

  // Init
  loadRows().catch(() => {});
})();
