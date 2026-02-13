(() => {
  // --- HELPERS ---
  const requester = window.api?.request || fetch;
  const formatNumber = (value) => new Intl.NumberFormat("id-ID").format(value || 0);
  const formatCurrency = (value) => `Rp ${new Intl.NumberFormat("id-ID").format(value || 0)}`;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  // Modern Pastel Color Generator (Higher Saturation but soft bg)
  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return {
        bg: `hsl(${hue}, 85%, 96%)`, 
        text: `hsl(${hue}, 70%, 35%)`, 
        border: `hsl(${hue}, 80%, 90%)`,
        icon: `hsl(${hue}, 70%, 60%)`
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

    // 2. Render List Jadwal Hari Ini (Floating Cards Style)
    renderList(
      data.jadwal_list || [],
      "jadwalList",
      "jadwalEmpty",
      (row) => {
        const name = row.siswa_nama || row.kelas_nama || row.program_nama || "?";
        const programName = row.program_nama || "-";
        const educatorName = row.edukator_nama || row.pengajar_nama || "-";
        const timeStart = row.jam_mulai ? row.jam_mulai.slice(0,5) : "-";
        const timeEnd = row.jam_selesai ? row.jam_selesai.slice(0,5) : "";
        
        // Dynamic colors
        const colors = stringToColor(programName);
        
        return `
        <div class="group relative flex items-center gap-4 p-4 mb-3 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-300">
            <div class="flex flex-col items-center justify-center w-14 h-14 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                <span class="text-sm font-extrabold text-slate-700 group-hover:text-indigo-700">${timeStart}</span>
                <span class="text-[10px] text-slate-400 font-medium">${timeEnd}</span>
            </div>
            
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                    <h4 class="text-sm font-bold text-slate-800 truncate pr-2 group-hover:text-indigo-600 transition-colors" title="${name}">${name}</h4>
                    <span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide" 
                          style="background:${colors.bg}; color:${colors.text}; border:1px solid ${colors.border}">
                        ${row.tipe_les || "Umum"}
                    </span>
                </div>
                
                <div class="flex items-center gap-2 text-xs text-slate-500">
                     <span class="truncate max-w-[140px] font-medium" style="color:${colors.text}">
                        <i class="fa-solid fa-book-open mr-1 opacity-50"></i> ${programName}
                     </span>
                     <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                     <span class="truncate">
                        <i class="fa-solid fa-chalkboard-user mr-1 text-slate-400"></i> ${educatorName}
                     </span>
                </div>
            </div>
            
            <div class="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-l-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
        </div>
        `;
      }
    );

    // 3. Render Program Terbanyak (Highlight Card Content)
    const top = data.program_terbanyak;
    const programEl = document.getElementById("programTerbanyak");
    if (programEl && top) {
      programEl.innerHTML = `
        ${top.nama}
        <div class="mt-3 flex justify-center">
             <div class="bg-indigo-800/50 backdrop-blur-md px-5 py-2 rounded-full text-sm font-bold border border-indigo-400/30 text-indigo-100 flex items-center gap-2 shadow-inner">
                <i class="fa-solid fa-user-group text-xs"></i>
                ${formatNumber(top.total_siswa)} <span class="font-normal opacity-70">Siswa Aktif</span>
            </div>
        </div>
      `;
    } else if (programEl) {
        programEl.textContent = "-";
    }

    // 4. Render Siswa Pertemuan Rendah (Compact Table)
    renderList(
      data.siswa_pertemuan_rendah || [],
      "sisaPertemuanList",
      "sisaPertemuanEmpty",
      (row) => `
        <tr class="group hover:bg-rose-50/50 transition-colors border-b border-slate-50 last:border-0">
            <td class="px-3 py-3 align-middle w-full">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center text-xs font-bold shrink-0">
                        ${(row.siswa_nama || "?").substring(0,2).toUpperCase()}
                    </div>
                    <div class="min-w-0">
                        <div class="font-bold text-slate-700 text-xs truncate max-w-[140px]" title="${row.siswa_nama}">
                            ${row.siswa_nama || "-"}
                        </div>
                        <div class="text-[10px] text-slate-400 truncate max-w-[140px] mt-0.5">
                            <i class="fa-solid fa-tag text-[9px] mr-1 opacity-50"></i>${row.program_nama || "-"}
                        </div>
                    </div>
                </div>
            </td>
            <td class="px-3 py-3 text-right align-middle">
                <div class="inline-flex flex-col items-end">
                    <span class="inline-flex items-center justify-center min-w-[1.8rem] h-[1.8rem] rounded-lg text-xs font-bold bg-white border border-rose-200 text-rose-600 shadow-sm mb-1">
                        ${row.sisa_pertemuan}
                    </span>
                    <span class="text-[9px] text-rose-400 font-medium">Sisa Sesi</span>
                </div>
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
        
        // Trophy logic
        let rankBadge = `<div class="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold border border-slate-200">${index + 1}</div>`;
        if (index === 0) rankBadge = `<div class="w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-[10px] font-bold border border-yellow-200"><i class="fa-solid fa-trophy"></i></div>`;
        if (index === 1) rankBadge = `<div class="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold border border-slate-300">2</div>`;
        if (index === 2) rankBadge = `<div class="w-6 h-6 rounded-full bg-amber-700/10 text-amber-800 flex items-center justify-center text-[10px] font-bold border border-amber-800/20">3</div>`;

        container.insertAdjacentHTML(
          "beforeend",
          `
          <div class="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm transition-all duration-200">
            <div class="flex items-center gap-3 min-w-0">
              ${rankBadge}
              <div class="min-w-0">
                <div class="text-sm font-bold text-slate-700 truncate">${name}</div>
                <div class="text-[10px] text-slate-400 font-medium bg-white px-1.5 py-0.5 rounded border border-slate-100 inline-block mt-0.5">${row.cabang_kode || "Unknown"}</div>
              </div>
            </div>
            <div class="text-sm font-bold text-slate-800 whitespace-nowrap bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
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
      (row) => `<span class="text-emerald-600">${formatCurrency(row.pemasukan)}</span>`
    );

    renderRanking(
      data.top_kehadiran || [],
      "performanceKehadiran",
      "performanceKehadiranEmpty",
      (row) => `<span class="text-indigo-600">${formatNumber(row.kehadiran)} sesi</span>`
    );

    renderRanking(
      data.top_pertumbuhan || [],
      "performancePertumbuhan",
      "performancePertumbuhanEmpty",
      (row) => {
        const value = Number(row.pertumbuhan || 0);
        const colorClass = value > 0 ? "text-emerald-600" : (value < 0 ? "text-rose-500" : "text-slate-500");
        const icon = value > 0 ? "fa-arrow-up" : (value < 0 ? "fa-arrow-down" : "fa-minus");
        const sign = value > 0 ? "+" : "";
        return `<span class="${colorClass} flex items-center gap-1"><i class="fa-solid ${icon} text-[10px]"></i> ${sign}${value}</span>`;
      }
    );
  };

  // --- CHATBOT UI (Modernized) ---
  const renderChatbotUI = () => {
    const mainContent = document.querySelector('main');
    if (!mainContent || document.getElementById('chatbotInput')) return;

    const container = document.createElement('div');
    container.className = "mb-8 relative z-30 mx-8 mt-2"; 
    container.innerHTML = `
        <div class="relative group max-w-2xl mx-auto transform transition-all hover:scale-[1.01]">
            <div class="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
            <div class="relative bg-white rounded-2xl shadow-xl shadow-slate-200/50 flex items-center p-1.5 border border-white/50 backdrop-blur-sm">
                <div class="pl-4 pr-3 text-indigo-500 text-lg animate-pulse">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                </div>
                <input type="text" id="chatbotInput" placeholder="Ask AI: Berapa total omzet bulan ini?" 
                    class="flex-1 bg-transparent border-none focus:ring-0 text-slate-700 placeholder-slate-400 text-sm font-medium h-10">
                <button id="chatbotBtn" class="bg-slate-900 text-white w-10 h-10 rounded-xl hover:bg-indigo-600 transition-colors shadow-lg flex items-center justify-center">
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
            
            <div id="chatbotResult" class="hidden mt-3 p-5 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 absolute w-full z-40 origin-top animate-fade-in-down">
                </div>
        </div>
    `;
    
    // Insert after header
    const header = document.querySelector('header');
    header.parentNode.insertBefore(container, header.nextSibling);

    const input = document.getElementById('chatbotInput');
    const btn = document.getElementById('chatbotBtn');
    const resultBox = document.getElementById('chatbotResult');

    const handleQuery = async () => {
        const query = input.value.trim();
        if (!query) return;

        resultBox.classList.remove('hidden');
        resultBox.innerHTML = `
            <div class="flex items-center gap-3 text-slate-500 text-sm py-2">
                <div class="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span class="font-medium animate-pulse">AI sedang menganalisis data...</span>
            </div>`;

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
                        <div class="flex items-start justify-between">
                            <div>
                                <div class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">${data.label}</div>
                                <div class="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-fuchsia-600 tracking-tight">${formatCurrency(data.value)}</div>
                            </div>
                            <button onclick="this.closest('#chatbotResult').classList.add('hidden')" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    `;
                } else if (data.type === 'number') {
                    content = `
                        <div class="flex items-start justify-between">
                            <div>
                                <div class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">${data.label}</div>
                                <div class="text-4xl font-extrabold text-slate-800 tracking-tight">${formatNumber(data.value)}</div>
                            </div>
                            <button onclick="this.closest('#chatbotResult').classList.add('hidden')" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    `;
                } else {
                    content = `
                        <div class="flex items-start gap-4">
                            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg shadow-lg shadow-indigo-200 shrink-0">
                                <i class="fa-solid fa-robot"></i>
                            </div>
                            <div class="flex-1">
                                <div class="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl rounded-tl-none border border-slate-100">${data.value}</div>
                            </div>
                            <button onclick="this.closest('#chatbotResult').classList.add('hidden')" class="text-slate-300 hover:text-slate-500"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    `;
                }
                
                resultBox.innerHTML = content;
            } else {
                resultBox.innerHTML = `
                    <div class="flex items-center gap-3 bg-rose-50 p-3 rounded-xl border border-rose-100 text-rose-600 text-sm font-semibold">
                        <i class="fa-solid fa-triangle-exclamation"></i> ${json.message}
                        <button onclick="this.closest('#chatbotResult').classList.add('hidden')" class="ml-auto text-rose-400 hover:text-rose-700"><i class="fa-solid fa-xmark"></i></button>
                    </div>`;
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
      // Set Realtime Clock
      setInterval(() => {
        const now = new Date();
        const el = document.getElementById('currentTime');
        if(el) el.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' });
      }, 1000);

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