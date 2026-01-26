(() => {
  // --- DOM ELEMENTS ---
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  
  // Setting Elements
  const settingForm = document.getElementById("salarySettingForm");
  const resetButton = document.getElementById("resetSalaryForm");
  const settingRows = document.getElementById("salarySettingRows");
  const settingEmpty = document.getElementById("salarySettingEmpty");
  
  const fields = {
    salaryPaud: document.getElementById("salaryPaud"),
    salarySd: document.getElementById("salarySd"),
    salarySmp: document.getElementById("salarySmp"),
    salarySma: document.getElementById("salarySma"),
    salaryAlumni: document.getElementById("salaryAlumni"),
  };

  // Slip Elements
  const slipRows = document.getElementById("slipRows");
  const slipEmpty = document.getElementById("slipEmpty");
  const slipMonth = document.getElementById("slipMonth");
  const slipSearch = document.getElementById("slipSearch");
  const slipButton = document.getElementById("generateSlip");
  const slipSummary = document.getElementById("slipSummary");
  const slipPagination = document.getElementById("slipPagination");

  // State
  let slipCache = [];
  let slipPage = 1;
  const slipPageSize = 10;

  // --- HELPERS ---
  const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, { credentials: "same-origin", ...options });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Request gagal.");
    }
    return res.json();
  };

  const formatRupiah = (value) => {
    const number = Number(value || 0);
    return new Intl.NumberFormat("id-ID").format(number);
  };

  // --- TAB LOGIC (Perbaikan Utama) ---
  const setActiveTab = (targetId) => {
    // 1. Update Tombol
    tabButtons.forEach(btn => {
        if(btn.dataset.target === targetId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 2. Update Konten (Explicit Hide/Show)
    tabContents.forEach(content => {
        if(content.id === targetId) {
            content.classList.remove('hidden');
            content.classList.add('active');
        } else {
            content.classList.add('hidden');
            content.classList.remove('active');
        }
    });
    
    // 3. Load Data Khusus Tab
    if (targetId === "slip-gaji" && slipCache.length === 0) {
      loadSlip();
    }
  };

  // --- RENDER FUNCTIONS ---

  const renderSettingTable = (rows) => {
    if (!settingRows || !settingEmpty) return;
    if (!rows.length) {
      settingRows.innerHTML = "";
      settingEmpty.classList.remove("hidden");
      return;
    }
    settingEmpty.classList.add("hidden");
    
    settingRows.innerHTML = rows.map(row => `
        <tr class="hover:bg-gray-50 transition border-b border-gray-50 last:border-none">
            <td class="p-3 font-medium text-gray-700">${row.jenjang.replace("PAUD_TK", "PAUD/TK")}</td>
            <td class="p-3 font-bold text-indigo-600">Rp ${formatRupiah(row.nominal)}</td>
            <td class="p-3 text-xs text-gray-400">
                ${row.updated_at ? new Date(row.updated_at).toLocaleDateString("id-ID") : "-"}
            </td>
        </tr>
    `).join("");
  };

  const renderSlipSummary = (rows) => {
    if (!slipSummary) return;
    const totalGaji = rows.reduce((acc, row) => acc + Number(row.total_gaji || 0), 0);
    const totalEdukator = rows.length;

    slipSummary.innerHTML = `
      <div class="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
         <div class="relative z-10">
            <p class="text-emerald-100 text-xs font-bold uppercase mb-1">Total Payout Bulan Ini</p>
            <h2 class="text-3xl font-bold">Rp ${formatRupiah(totalGaji)}</h2>
         </div>
         <div class="absolute right-4 bottom-4 opacity-20 text-6xl"><i class="fa-solid fa-money-bill-wave"></i></div>
      </div>
      
      <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
         <div>
            <p class="text-gray-500 text-xs font-bold uppercase mb-1">Total Penerima</p>
            <h2 class="text-3xl font-bold text-gray-800">${totalEdukator} <span class="text-sm font-normal text-gray-400">Orang</span></h2>
         </div>
         <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-xl">
            <i class="fa-solid fa-users"></i>
         </div>
      </div>
    `;
  };

  const renderSlipTable = (rows) => {
    if (!slipRows || !slipEmpty) return;
    
    // Pagination Logic
    const totalPages = Math.max(1, Math.ceil(rows.length / slipPageSize));
    const current = Math.min(Math.max(slipPage, 1), totalPages);
    const start = (current - 1) * slipPageSize;
    const paged = rows.slice(start, start + slipPageSize);

    // Update Pagination UI
    if (slipPagination) {
        if (!rows.length) {
            slipPagination.innerHTML = "";
        } else {
            slipPagination.innerHTML = `
              <button class="px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1" 
                      data-action="prev" ${current === 1 ? "disabled" : ""}>
                  <i class="fa-solid fa-chevron-left text-xs"></i> Prev
              </button>
              <span class="text-sm text-gray-500 font-medium">Halaman ${current} dari ${totalPages}</span>
              <button class="px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1" 
                      data-action="next" ${current === totalPages ? "disabled" : ""}>
                  Next <i class="fa-solid fa-chevron-right text-xs"></i>
              </button>
            `;
        }
    }

    if (!paged.length) {
      slipRows.innerHTML = "";
      slipEmpty.classList.remove("hidden");
      return;
    }
    
    slipEmpty.classList.add("hidden");
    
    slipRows.innerHTML = paged.map(row => `
        <tr class="hover:bg-gray-50 transition group">
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        ${(row.edukator_nama || "?").substring(0,2).toUpperCase()}
                    </div>
                    <span class="font-bold text-gray-700">${row.edukator_nama}</span>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono border border-gray-200">
                    ${String(row.bulan).padStart(2, "0")}/${row.tahun}
                </span>
            </td>
            <td class="px-6 py-4 text-right text-gray-600">Rp ${formatRupiah(row.gaji_privat)}</td>
            <td class="px-6 py-4 text-right text-gray-600">Rp ${formatRupiah(row.gaji_kelas)}</td>
            <td class="px-6 py-4 text-right text-gray-600">Rp ${formatRupiah(row.gaji_manajemen)}</td>
            <td class="px-6 py-4 text-right font-bold text-emerald-600">Rp ${formatRupiah(row.total_gaji)}</td>
            <td class="px-6 py-4 text-center">
                <button class="text-gray-400 hover:text-indigo-600 transition p-2 rounded-lg hover:bg-indigo-50" 
                        data-action="print" 
                        data-id="${row.edukator_id}" 
                        data-bulan="${row.bulan}" 
                        data-tahun="${row.tahun}"
                        title="Cetak Slip">
                    <i class="fa-solid fa-print"></i>
                </button>
            </td>
        </tr>
    `).join("");
    
    renderSlipSummary(rows);
  };

  // --- LOGIC ---

  const loadSetting = async () => {
    try {
        const rows = await fetchJson("/api/penggajian/setting");
        const map = rows.reduce((acc, row) => {
          acc[row.jenjang] = row.nominal;
          return acc;
        }, {});
        
        fields.salaryPaud.value = map.PAUD_TK || 0;
        fields.salarySd.value = map.SD || 0;
        fields.salarySmp.value = map.SMP || 0;
        fields.salarySma.value = map.SMA || 0;
        fields.salaryAlumni.value = map.ALUMNI || 0;
        
        renderSettingTable(rows);
    } catch (err) {
        console.error(err);
    }
  };

  const saveSetting = async (event) => {
    event.preventDefault();
    const payload = {
      paud_tk: Number(fields.salaryPaud.value || 0),
      sd: Number(fields.salarySd.value || 0),
      smp: Number(fields.salarySmp.value || 0),
      sma: Number(fields.salarySma.value || 0),
      alumni: Number(fields.salaryAlumni.value || 0),
    };
    
    try {
        const rows = await fetchJson("/api/penggajian/setting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        renderSettingTable(rows);
        if (window.notifySuccess) window.notifySuccess("Tersimpan", "Tarif jenjang berhasil diperbarui.");
    } catch (err) {
        if (window.notifyError) window.notifyError("Gagal", err.message);
    }
  };

  const loadSlip = async () => {
    const params = new URLSearchParams();
    if (slipMonth && slipMonth.value) {
      const [year, month] = slipMonth.value.split("-");
      params.set("year", year);
      params.set("month", month);
    }
    
    try {
        const query = params.toString();
        const rows = await fetchJson(`/api/penggajian/slip${query ? `?${query}` : ""}`);
        slipCache = rows || [];
        slipPage = 1;
        
        const keyword = slipSearch?.value?.toLowerCase() || "";
        const filtered = keyword
          ? slipCache.filter((row) => String(row.edukator_nama || "").toLowerCase().includes(keyword))
          : slipCache;
          
        renderSlipTable(filtered);
    } catch (err) {
        console.error(err);
    }
  };

  // --- EVENTS ---

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.target));
  });

  if (settingForm) settingForm.addEventListener("submit", saveSetting);
  if (resetButton) resetButton.addEventListener("click", () => settingForm?.reset());

  if (slipButton) {
    slipButton.addEventListener("click", (event) => {
      event.preventDefault();
      loadSlip();
    });
  }

  if (slipMonth) {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (!slipMonth.value) slipMonth.value = defaultMonth;
    slipMonth.addEventListener("change", () => loadSlip());
  }

  if (slipSearch) {
    slipSearch.addEventListener("input", () => {
      const keyword = slipSearch.value.toLowerCase();
      const filtered = slipCache.filter((row) =>
        String(row.edukator_nama || "").toLowerCase().includes(keyword)
      );
      slipPage = 1;
      renderSlipTable(filtered);
    });
  }

  if (slipPagination) {
    slipPagination.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      
      const keyword = slipSearch?.value?.toLowerCase() || "";
      const filtered = keyword
        ? slipCache.filter((row) => String(row.edukator_nama || "").toLowerCase().includes(keyword))
        : slipCache;
        
      const totalPages = Math.max(1, Math.ceil(filtered.length / slipPageSize));
      
      if (button.dataset.action === "prev") slipPage = Math.max(1, slipPage - 1);
      if (button.dataset.action === "next") slipPage = Math.min(totalPages, slipPage + 1);
      
      renderSlipTable(filtered);
    });
  }

  // Print Action
  if (slipRows) {
    slipRows.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action='print']");
      if (!button) return;
      
      const target = slipCache.find(
        (row) =>
          String(row.edukator_id) === String(button.dataset.id) &&
          String(row.bulan) === String(button.dataset.bulan) &&
          String(row.tahun) === String(button.dataset.tahun)
      );
      
      if (!target) return;
      
      const printWindow = window.open("", "_blank", "width=800,height=900");
      if (!printWindow) return;
      
      printWindow.document.write(`
        <html lang="id">
          <head>
            <title>Slip Gaji - ${target.edukator_nama}</title>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
              .header p { margin: 5px 0 0; color: #666; font-size: 14px; }
              
              .info { display: flex; justify-content: space-between; margin-bottom: 30px; }
              .info div { font-size: 14px; line-height: 1.6; }
              
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th, td { padding: 12px 15px; border-bottom: 1px solid #ddd; text-align: left; }
              th { background-color: #f9fafb; font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; }
              td { font-size: 14px; }
              .total-row td { font-weight: bold; font-size: 16px; border-top: 2px solid #333; border-bottom: none; background-color: #f9fafb; }
              
              .footer { text-align: right; margin-top: 50px; font-size: 12px; }
              .footer p { margin-bottom: 60px; }
            </style>
          </head>
          <body>
            <div class="header">
                <h1>SLIP GAJI EDUKATOR</h1>
                <p>ILHAMI EDUCATION CENTER</p>
            </div>
            
            <div class="info">
                <div>
                    <strong>Nama:</strong> ${target.edukator_nama}<br>
                    <strong>ID Edukator:</strong> ${target.edukator_id}
                </div>
                <div style="text-align: right;">
                    <strong>Periode:</strong> ${String(target.bulan).padStart(2, "0")}/${target.tahun}<br>
                    <strong>Tanggal Cetak:</strong> ${new Date().toLocaleDateString('id-ID')}
                </div>
            </div>
            
            <table>
              <thead>
                <tr>
                    <th>Komponen Pendapatan</th>
                    <th style="text-align: right;">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Gaji Privat</td><td style="text-align: right;">${formatRupiah(target.gaji_privat)}</td></tr>
                <tr><td>Gaji Kelas</td><td style="text-align: right;">${formatRupiah(target.gaji_kelas)}</td></tr>
                <tr><td>Tunjangan Manajemen</td><td style="text-align: right;">${formatRupiah(target.gaji_manajemen)}</td></tr>
                <tr class="total-row">
                    <td>TOTAL DITERIMA</td>
                    <td style="text-align: right;">${formatRupiah(target.total_gaji)}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="footer">
                <p>Disetujui Oleh,</p>
                <strong>Admin Keuangan</strong>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    });
  }

  // Init
  loadSetting().catch(() => {});
})();