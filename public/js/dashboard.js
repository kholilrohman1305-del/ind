(() => {
  // --- Helpers ---
  const formatNumber = (value) => new Intl.NumberFormat("id-ID").format(value || 0);
  const formatCurrency = (value) =>
    `Rp ${new Intl.NumberFormat("id-ID").format(value || 0)}`;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  // Fungsi Render List Generic (Diperbarui untuk Tailwind)
  const renderList = (rows, containerId, emptyId, formatter) => {
    const container = document.getElementById(containerId);
    const empty = document.getElementById(emptyId);
    
    if (!container) return;
    
    // Reset isi container
    container.innerHTML = "";

    // Handle Empty State
    if (!rows || !rows.length) {
      if (empty) {
          empty.style.display = "flex"; // Gunakan flex agar centering alignment CSS berfungsi
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
      // Kita langsung append string HTML agar styling Tailwind lebih fleksibel
      container.insertAdjacentHTML('beforeend', formatter(row));
    });
  };

  // --- Main Render Function ---
  const render = (data) => {
    // 1. Set Statistik Kartu Atas
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
        // Logika Judul (Siswa/Kelas) & Subjudul (Program/Mapel)
        const title = row.siswa_nama || row.program_nama || "Tanpa Nama";
        const subtitle = row.mapel_nama || row.tipe_les || "Umum";
        const time = row.jam_mulai ? row.jam_mulai.substring(0, 5) : "--:--";

        // HTML Template Modern (Tailwind)
        return `
          <div class="flex items-center gap-4 p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors duration-200 group">
            <div class="flex-shrink-0">
                <div class="flex flex-col items-center justify-center w-12 h-12 bg-violet-50 text-violet-600 rounded-xl border border-violet-100 shadow-sm group-hover:scale-105 transition-transform">
                    <span class="text-xs font-bold leading-none">${time}</span>
                </div>
            </div>

            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                    <h4 class="text-sm font-bold text-slate-800 truncate" title="${title}">
                        ${title}
                    </h4>
                </div>
                <div class="flex items-center gap-2 text-xs text-slate-500">
                    <span class="truncate">${subtitle}</span>
                    ${row.pengajar_nama ? `<span class="w-1 h-1 bg-slate-300 rounded-full"></span><span class="truncate">${row.pengajar_nama}</span>` : ''}
                </div>
            </div>

            <div class="flex-shrink-0">
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                    Belum
                </span>
            </div>
          </div>
        `;
      }
    );

    // 3. Set Program Terbanyak
    const top = data.program_terbanyak;
    const programEl = document.getElementById("programTerbanyak");
    if (programEl) {
        // Kita hanya mengubah text content, styling container (gradient) sudah ada di HTML
        programEl.textContent = top
            ? `${top.nama}` 
            : "-";
        
        // Opsional: Update footer card jika ingin menampilkan jumlah detail
        // Anda bisa menambahkan ID ke elemen footer di HTML jika ingin dinamis juga
        // const footerEl = document.querySelector(".highlight-foot");
        // if(footerEl && top) footerEl.textContent = `${formatNumber(top.total_siswa)} Siswa aktif`;
    }

    // 4. Render List: Sisa Pertemuan < 3
    renderList(
      data.siswa_pertemuan_rendah || [],
      "sisaPertemuanList",
      "sisaPertemuanEmpty",
      (row) => `
        <div class="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 hover:bg-rose-50/30 transition-colors">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">
                    ${(row.siswa_nama || "S")[0]}
                </div>
                <div>
                    <div class="text-xs font-bold text-slate-700">${row.siswa_nama || "-"}</div>
                    <div class="text-[10px] text-slate-400">${row.program_nama || "-"}</div>
                </div>
            </div>

            <div class="flex-shrink-0">
                <span class="px-2 py-1 bg-rose-100 text-rose-600 text-xs font-bold rounded-lg border border-rose-200">
                    Sisa: ${row.sisa_pertemuan}
                </span>
            </div>
        </div>
      `
    );
  };

  // --- Data Fetching ---
  const init = async () => {
    try {
      const res = await fetch("/api/dashboard/summary", { credentials: "same-origin" });
      const data = await res.json();
      if (data && data.success) {
        render(data.data);
      }
    } catch (err) {
      console.error("Gagal memuat dashboard:", err);
      // Opsional: Tampilkan state error di UI jika fetch gagal total
    }
  };

  init();
})();