(() => {
  // --- HELPERS ---
  const requester = window.api?.request || fetch;
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
        const name = row.siswa_nama || row.kelas_nama || row.program_nama || "?";
        const colors = stringToColor(name);
        const initials = name.substring(0, 2).toUpperCase();
        const timeStart = row.jam_mulai ? row.jam_mulai.slice(0,5) : "-";
        const timeEnd = row.jam_selesai ? row.jam_selesai.slice(0,5) : "";
        const programName = row.program_nama || "-";
        const educatorName = row.edukator_nama || row.pengajar_nama || "-";
        
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
                        ${programName}
                    </span>
                    <span class="text-[10px] text-slate-400 capitalize">${row.tipe_les || "Umum"}</span>
                </div>
                <div class="text-[10px] text-slate-400 mt-1 truncate">Edukator: ${educatorName}</div>
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

  // --- CHATBOT UI ---
  const renderChatbotUI = () => {
    const mainContent = document.querySelector('main');
    if (!mainContent || document.getElementById('chatbotInput')) return;

    const container = document.createElement('div');
    container.className = "mb-6 relative z-20"; // High z-index
    container.innerHTML = `
        <div class="relative group">
            <input type="text" id="chatbotInput" placeholder="✨ Tanya data... (Contoh: Berapa omzet bulan ini?)" 
                class="w-full pl-12 pr-12 py-3.5 rounded-2xl border-none shadow-sm focus:shadow-md focus:ring-2 focus:ring-indigo-500/50 text-sm bg-white/90 backdrop-blur-sm transition-all">
            <div class="absolute left-4 top-3.5 text-indigo-500 animate-pulse">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
            </div>
            <button id="chatbotBtn" class="absolute right-2 top-2 p-1.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                <i class="fa-solid fa-arrow-right"></i>
            </button>
        </div>
        <div id="chatbotResult" class="hidden mt-2 p-4 bg-white rounded-2xl shadow-xl border border-indigo-50 animate-fade-in absolute w-full z-30">
            <!-- Result here -->
        </div>
    `;
    
    // Insert at the very top of main content
    mainContent.insertBefore(container, mainContent.firstChild);

    const input = document.getElementById('chatbotInput');
    const btn = document.getElementById('chatbotBtn');
    const resultBox = document.getElementById('chatbotResult');

    const handleQuery = async () => {
        const query = input.value.trim();
        if (!query) return;

        resultBox.classList.remove('hidden');
        resultBox.innerHTML = `<div class="flex items-center gap-2 text-gray-500 text-sm"><i class="fa-solid fa-circle-notch fa-spin text-indigo-500"></i> Sedang menganalisis data...</div>`;

        try {
            const res = await requester('/api/chatbot/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            const json = await res.json();
            
            if (json.success) {
                const data = json.data;
                let content = '';
                
                if (data.type === 'currency') {
                    content = `
                        <div class="flex items-center justify-between">
                            <div class="text-xs font-bold text-gray-400 uppercase tracking-wider">${data.label}</div>
                            <button onclick="this.parentElement.parentElement.classList.add('hidden')" class="text-gray-300 hover:text-gray-500"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 mt-1">${formatCurrency(data.value)}</div>
                    `;
                } else if (data.type === 'number') {
                    content = `
                        <div class="flex items-center justify-between">
                            <div class="text-xs font-bold text-gray-400 uppercase tracking-wider">${data.label}</div>
                            <button onclick="this.parentElement.parentElement.classList.add('hidden')" class="text-gray-300 hover:text-gray-500"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div class="text-3xl font-extrabold text-slate-800 mt-1">${formatNumber(data.value)}</div>
                    `;
                } else {
                    content = `
                        <div class="flex items-start gap-3">
                            <div class="text-2xl">🤖</div>
                            <div class="text-sm text-gray-600 leading-relaxed pt-1">${data.value}</div>
                            <button onclick="this.parentElement.parentElement.classList.add('hidden')" class="ml-auto text-gray-300 hover:text-gray-500"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    `;
                }
                
                resultBox.innerHTML = content;
            } else {
                resultBox.innerHTML = `<div class="text-rose-500 text-sm font-medium"><i class="fa-solid fa-circle-exclamation mr-1"></i> ${json.message}</div>`;
            }
        } catch (e) {
            resultBox.innerHTML = `<div class="text-rose-500 text-sm font-medium">Gagal memproses pertanyaan.</div>`;
        }
    };

    btn.addEventListener('click', handleQuery);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleQuery();
    });
    
    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            resultBox.classList.add('hidden');
        }
    });
  };

  const init = async () => {
    try {
      const [summaryRes, performanceRes] = await Promise.all([
        requester("/api/dashboard/summary", { credentials: "same-origin" }),
        requester("/api/dashboard/performance", { credentials: "same-origin" }),
      ]);
      const summaryData = await summaryRes.json();
      if (summaryData && summaryData.success) {
        render(summaryData.data);
      }
      const performanceData = await performanceRes.json();
      if (performanceData && performanceData.success) {
        renderPerformance(performanceData.data);
      }
      
      // Init Chatbot
      renderChatbotUI();
    } catch (err) {
      console.error("Dashboard Load Error:", err);
    }
  };

  init();
})();
