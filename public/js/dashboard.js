(() => {
  const { TIPE_LES } = window.APP_CONSTANTS || { TIPE_LES: { KELAS: 'KELAS', PRIVAT: 'PRIVAT' } }; // Fallback safe
  const requester = window.api?.request || fetch;

  // --- Helpers ---
  const formatNumber = (value) => new Intl.NumberFormat("id-ID").format(value || 0);
  const formatCurrency = (value) =>
    `Rp ${new Intl.NumberFormat("id-ID").format(value || 0)}`;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  // Fungsi Render List Generic
  const renderList = (rows, containerId, emptyId, formatter) => {
    const container = document.getElementById(containerId);
    const empty = document.getElementById(emptyId);
    
    if (!container) return;
    
    // Reset isi container
    container.innerHTML = "";

    // Handle Empty State
    if (!rows || !rows.length) {
      if (empty) {
          empty.style.display = "flex";
          empty.classList.remove("hidden");
      }
      return;
    }

    // Hide Empty State & Render Rows
    if (empty) {
        empty.style.display = "none";
        empty.classList.add("hidden");
    }

    rows.forEach((row) => {
      container.insertAdjacentHTML('beforeend', formatter(row));
    });
  };

  // --- Main Render Function ---
  const render = (data) => {
    // 1. Set Statistik
    setText("statSiswaAktif", formatNumber(data.siswa_aktif));
    setText("statSiswaPrivat", formatNumber(data.siswa_privat));
    setText("statSiswaKelas", formatNumber(data.siswa_kelas));
    setText("statPendapatan", formatCurrency(data.pendapatan_bulan_ini));
    setText("statPengeluaran", formatCurrency(data.pengeluaran_bulan_ini));
    setText("statSiswaBaru", formatNumber(data.siswa_baru_bulan_ini));
    setText("statJadwalHariIni", formatNumber(data.jadwal_hari_ini));

    // 2. Render List: Jadwal Hari Ini
    renderList(
      data.jadwal_list || [],
      "jadwalList",
      "jadwalEmpty",
      (row) => {
        const title = row.siswa_nama || row.kelas_nama || row.program_nama || "Tanpa Nama";
        const programName = row.program_nama || "-";
        const educatorName = row.edukator_nama || row.pengajar_nama || "-";
        const mapelName = row.mapel_nama || row.tipe_les || "Umum";
        const time = row.jam_mulai ? row.jam_mulai.substring(0, 5) : "--:--";

        // Modern Row Design
        return `
          <div class="group flex items-center gap-5 p-5 hover:bg-slate-50 transition-all duration-200 cursor-default">
            
            <div class="flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-700 group-hover:border-violet-200 group-hover:text-violet-600 transition-colors">
                <span class="text-sm font-bold font-mono">${time}</span>
            </div>

            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <h4 class="text-sm font-bold text-slate-800 truncate" title="${title}">
                        ${title}
                    </h4>
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">${mapelName}</span>
                </div>
                
                <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-slate-500">
                    <div class="flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        <span class="truncate">${programName}</span>
                    </div>
                    <div class="hidden sm:block w-1 h-1 bg-slate-300 rounded-full"></div>
                    <div class="flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        <span class="truncate">${educatorName}</span>
                    </div>
                </div>
            </div>

            <div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="p-2 text-slate-400 hover:text-violet-600 bg-transparent hover:bg-violet-50 rounded-lg transition-all">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
          </div>
        `;
      }
    );

    // 3. Program Terbanyak
    const top = data.program_terbanyak;
    const programEl = document.getElementById("programTerbanyak");
    if (programEl) {
        programEl.textContent = top ? `${top.nama}` : "-";
    }

    // 4. Render List: Sisa Pertemuan < 3
    renderList(
      data.siswa_pertemuan_rendah || [],
      "sisaPertemuanList",
      "sisaPertemuanEmpty",
      (row) => `
        <div class="flex items-center justify-between p-3 rounded-xl hover:bg-rose-50/50 border border-transparent hover:border-rose-100 transition-all group">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-extrabold shadow-sm group-hover:bg-white group-hover:text-rose-500 transition-colors">
                    ${(row.siswa_nama || "S")[0]}
                </div>
                <div>
                    <div class="text-xs font-bold text-slate-700 group-hover:text-slate-900">${row.siswa_nama || "-"}</div>
                    <div class="text-[10px] text-slate-400">${row.program_nama || "-"}</div>
                </div>
            </div>
            <span class="px-2.5 py-1 bg-white text-rose-600 text-[10px] font-bold rounded-lg border border-slate-100 shadow-sm group-hover:border-rose-200">
               ${row.sisa_pertemuan} Sesi
            </span>
        </div>
      `
    );

    // 5. Render Siswa Menunggu Jadwal
    const menungguCount = data.siswa_menunggu_jadwal || 0;
    const menungguCard = document.getElementById("statMenungguJadwalCard");
    const menungguPanel = document.getElementById("menungguJadwalPanel");

    if (menungguCount > 0) {
      setText("statMenungguJadwal", formatNumber(menungguCount));
      if (menungguCard) {
          menungguCard.classList.remove("hidden");
          menungguCard.classList.add("block");
      }
      if (menungguPanel) {
          menungguPanel.classList.remove("hidden");
          menungguPanel.classList.add("flex");
      }

      renderList(
        data.siswa_menunggu_jadwal_list || [],
        "menungguJadwalList",
        "menungguJadwalEmpty",
        (row) => {
          const isKelas = row.tipe_les === (window.APP_CONSTANTS?.TIPE_LES?.KELAS || 'KELAS');
          const badgeColor = isKelas ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700';

          return `
            <a href="/jadwal" class="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 hover:bg-orange-50 border border-transparent hover:border-orange-200 transition-all cursor-pointer group">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-extrabold shadow-sm group-hover:scale-105 transition-transform">
                        ${(row.siswa_nama || "S")[0]}
                    </div>
                    <div>
                        <div class="text-xs font-bold text-slate-700 group-hover:text-orange-900 transition-colors">${row.siswa_nama || "-"}</div>
                        <div class="flex items-center gap-1.5 mt-0.5">
                            <span class="text-[10px] text-slate-400">${row.program_nama || "-"}</span>
                            <span class="px-1.5 py-0.5 ${badgeColor} text-[9px] font-bold rounded">${isKelas ? 'Kelas' : 'Privat'}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center text-orange-400 group-hover:text-orange-600">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                </div>
            </a>
          `;
        }
      );
    } else {
      if (menungguCard) menungguCard.classList.add("hidden");
      if (menungguPanel) {
          menungguPanel.classList.add("hidden");
          menungguPanel.classList.remove("flex");
      }
    }
  };

  // --- Init ---
  const init = async () => {
    try {
      const res = await requester("/api/dashboard/summary", { credentials: "same-origin" });
      const data = await res.json();
      if (data && data.success) {
        render(data.data);
      }
    } catch (err) {
      console.error("Gagal memuat dashboard:", err);
    }
  };

  init();
})();