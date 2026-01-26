(() => {
  // --- HELPERS ---
  const formatNumber = (value) => new Intl.NumberFormat("id-ID").format(value || 0);
  const formatCurrency = (value) => `Rp ${new Intl.NumberFormat("id-ID").format(value || 0)}`;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  // Generate pastel colors based on string (Consistent hashing)
  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return {
        bg: `hsl(${hue}, 90%, 96%)`, // Sangat soft background
        text: `hsl(${hue}, 60%, 40%)`, // Kontras text
        border: `hsl(${hue}, 80%, 90%)` // Border halus
    };
  };

  // --- RENDER LOGIC ---

  const renderList = (rows, containerId, emptyId, formatter) => {
    const container = document.getElementById(containerId);
    const empty = document.getElementById(emptyId);
    if (!container) return;
    
    container.innerHTML = "";
    
    if (!rows.length) {
      if (empty) empty.classList.remove("hidden");
      return;
    }
    if (empty) empty.classList.add("hidden");
    
    rows.forEach((row) => {
      container.insertAdjacentHTML('beforeend', formatter(row));
    });
  };

  const render = (data) => {
    // 1. Update 7 Kartu Statistik
    setText("statSiswaAktif", formatNumber(data.siswa_aktif));
    setText("statSiswaPrivat", formatNumber(data.siswa_privat));
    setText("statSiswaKelas", formatNumber(data.siswa_kelas));
    setText("statPendapatan", formatCurrency(data.pendapatan_bulan_ini));
    setText("statPengeluaran", formatCurrency(data.pengeluaran_bulan_ini));
    setText("statSiswaBaru", formatNumber(data.siswa_baru_bulan_ini));
    setText("statJadwalHariIni", formatNumber(data.jadwal_hari_ini));

    // 2. Render List Jadwal Hari Ini (Clean List Style)
    renderList(
      data.jadwal_list || [],
      "jadwalList",
      "jadwalEmpty",
      (row) => {
        const name = row.siswa_nama || row.program_nama || "?";
        const colors = stringToColor(name);
        const initials = name.substring(0, 2).toUpperCase();
        const timeStart = row.jam_mulai ? row.jam_mulai.slice(0,5) : "-";
        const timeEnd = row.jam_selesai ? row.jam_selesai.slice(0,5) : "";
        
        return `
        <div class="group flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-default">
            <div class="flex flex-col items-center justify-center w-12 h-12 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-600">
                <span class="text-xs font-bold">${timeStart}</span>
                <span class="text-[10px] text-slate-400">${timeEnd}</span>
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="text-sm font-bold text-slate-800 truncate">${name}</h4>
                <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium truncate max-w-[120px]">
                        ${row.program_nama || "-"}
                    </span>
                    <span class="text-[10px] text-slate-400 capitalize">${row.tipe_les || "Umum"}</span>
                </div>
            </div>
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
        </div>
        `;
      }
    );

    // 3. Render Program Terbanyak (Highlight Card)
    const top = data.program_terbanyak;
    const programEl = document.getElementById("programTerbanyak");
    if (programEl && top) {
      // Kita format HTML di dalam elemen ini agar lebih pop
      programEl.innerHTML = `
        ${top.nama}
        <div class="mt-2 inline-block bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-sm font-medium border border-white/10">
            ${formatNumber(top.total_siswa)} Siswa Aktif
        </div>
      `;
    } else if (programEl) {
        programEl.textContent = "-";
    }

    // 4. Render Siswa Pertemuan Rendah (Minimalist Table)
    renderList(
      data.siswa_pertemuan_rendah || [],
      "sisaPertemuanList",
      "sisaPertemuanEmpty",
      (row) => `
        <tr class="group hover:bg-red-50/30 transition-colors">
            <td class="px-5 py-3 align-middle">
                <div class="font-semibold text-slate-700 text-xs truncate max-w-[120px]" title="${row.siswa_nama}">
                    ${row.siswa_nama || "-"}
                </div>
                <div class="text-[10px] text-slate-400 truncate max-w-[120px]">${row.program_nama || "-"}</div>
            </td>
            <td class="px-5 py-3 text-right align-middle">
                <span class="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded-md text-xs font-bold bg-white border border-red-200 text-red-600 shadow-sm">
                    ${row.sisa_pertemuan}
                </span>
            </td>
        </tr>
      `
    );
  };

  const renderPerformance = (data) => {
    const renderRanking = (rows, containerId, emptyId, formatValue) => {
      const container = document.getElementById(containerId);
      const empty = document.getElementById(emptyId);
      if (!container) return;
      container.innerHTML = "";
      if (!rows.length) {
        if (empty) empty.classList.remove("hidden");
        return;
      }
      if (empty) empty.classList.add("hidden");
      rows.forEach((row, index) => {
        const name = row.cabang_nama || "-";
        const colors = stringToColor(name);
        container.insertAdjacentHTML(
          "beforeend",
          `
          <div class="flex items-center justify-between gap-4 p-3 rounded-2xl border border-slate-100 bg-white/80">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold"
                   style="background:${colors.bg}; color:${colors.text}; border:1px solid ${colors.border}">
                ${String(index + 1).padStart(2, "0")}
              </div>
              <div class="min-w-0">
                <div class="text-sm font-bold text-slate-800 truncate">${name}</div>
                <div class="text-xs text-slate-400">${row.cabang_kode || "-"}</div>
              </div>
            </div>
            <div class="text-sm font-bold text-slate-700 whitespace-nowrap">
              ${formatValue(row)}
            </div>
          </div>
        `
        );
      });
    };

    renderRanking(
      data.top_pemasukan || [],
      "performancePemasukan",
      "performancePemasukanEmpty",
      (row) => formatCurrency(row.pemasukan)
    );

    renderRanking(
      data.top_kehadiran || [],
      "performanceKehadiran",
      "performanceKehadiranEmpty",
      (row) => `${formatNumber(row.kehadiran)} sesi`
    );

    renderRanking(
      data.top_pertumbuhan || [],
      "performancePertumbuhan",
      "performancePertumbuhanEmpty",
      (row) => {
        const value = Number(row.pertumbuhan || 0);
        const sign = value > 0 ? "+" : "";
        return `${sign}${value} siswa`;
      }
    );
  };

  const init = async () => {
    try {
      const [summaryRes, performanceRes] = await Promise.all([
        fetch("/api/dashboard/summary", { credentials: "same-origin" }),
        fetch("/api/dashboard/performance", { credentials: "same-origin" }),
      ]);
      const summaryData = await summaryRes.json();
      if (summaryData && summaryData.success) {
        render(summaryData.data);
      }
      const performanceData = await performanceRes.json();
      if (performanceData && performanceData.success) {
        renderPerformance(performanceData.data);
      }
    } catch (err) {
      console.error("Dashboard Load Error:", err);
    }
  };

  init();
})();
