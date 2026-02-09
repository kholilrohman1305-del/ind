(() => {
  const container = document.getElementById("bundlingContainer");

  const renderChart = (rules) => {
    const ctx = document.getElementById("bundlingChart");
    if (!ctx) return;
    
    if (!rules || rules.length === 0) {
        return; // Biarkan kosong atau tampilkan placeholder
    }

    // Destroy existing chart if any
    const existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    // Sort by count for visualization
    const sortedRules = [...rules].sort((a, b) => b.count - a.count).slice(0, 5);

    const labels = sortedRules.map(r => {
        const a = r.antecedent.length > 15 ? r.antecedent.substring(0, 12) + '...' : r.antecedent;
        const b = r.consequent.length > 15 ? r.consequent.substring(0, 12) + '...' : r.consequent;
        return [`${a}`, `+ ${b}`];
    });
    const data = sortedRules.map(r => r.count);

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Jumlah Siswa',
          data: data,
          backgroundColor: 'rgba(168, 85, 247, 0.6)',
          borderColor: 'rgba(168, 85, 247, 1)',
          borderWidth: 1,
          borderRadius: 6,
          barThickness: 20
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: (items) => {
                        const idx = items[0].dataIndex;
                        return `${sortedRules[idx].antecedent} + ${sortedRules[idx].consequent}`;
                    }
                }
            }
        },
        scales: {
            y: { 
                beginAtZero: true, 
                ticks: { stepSize: 1, precision: 0 },
                grid: { borderDash: [2, 4] }
            },
            x: {
                grid: { display: false }
            }
        }
      }
    });
  };

  const renderRules = (rules) => {
    if (!container) return;
    container.innerHTML = "";

    if (rules.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 text-gray-400 bg-white/50 rounded-xl border border-dashed border-gray-200">
            <i class="fa-solid fa-basket-shopping text-3xl mb-3 opacity-20"></i>
            <p class="text-sm">Belum cukup data transaksi untuk menemukan pola.</p>
        </div>
      `;
      return;
    }

    rules.forEach(rule => {
      const card = document.createElement("div");
      card.className = "bg-white p-4 rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group";
      
      let strengthColor = "bg-blue-500";
      if (rule.lift > 2) { strengthColor = "bg-emerald-500"; }
      else if (rule.lift < 1.2) { strengthColor = "bg-gray-400"; }

      card.innerHTML = `
        <div class="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full -mr-8 -mt-8 z-0"></div>
        
        <div class="relative z-10">
            <div class="flex items-center gap-2 mb-3">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold text-white ${strengthColor}">
                    Lift: ${rule.lift}
                </span>
                <span class="text-[10px] text-gray-400 font-medium">${rule.count} Siswa</span>
            </div>

            <div class="flex items-center gap-3 mb-3">
                <div class="flex-1 p-2 bg-gray-50 rounded-lg text-center border border-gray-100">
                    <div class="text-[10px] text-gray-400 uppercase font-bold">Jika Ambil</div>
                    <div class="text-xs font-bold text-gray-800 truncate" title="${rule.antecedent}">${rule.antecedent}</div>
                </div>
                <i class="fa-solid fa-arrow-right text-purple-400"></i>
                <div class="flex-1 p-2 bg-purple-50 rounded-lg text-center border border-purple-100">
                    <div class="text-[10px] text-purple-400 uppercase font-bold">Maka Ambil</div>
                    <div class="text-xs font-bold text-purple-800 truncate" title="${rule.consequent}">${rule.consequent}</div>
                </div>
            </div>

            <p class="text-xs text-gray-600 leading-relaxed">${rule.desc}</p>
        </div>
      `;
      container.appendChild(card);
    });
  };

  const fetchAnalysis = async () => {
    try {
      const cabangSelect = document.getElementById("reportCabang");
      let query = "";
      if (cabangSelect && !cabangSelect.classList.contains("hidden") && cabangSelect.value) {
          query = `?cabang_id=${cabangSelect.value}`;
      }

      // Hapus filter tahun agar semua data historis terbaca (untuk memastikan grafik muncul)
      const res = await fetch(`/api/analysis/bundling${query}`);
      const json = await res.json();
      if (json.success) {
        renderRules(json.data);
        renderChart(json.data);
      }
    } catch (err) {
      console.error("Failed to load market basket analysis", err);
      if (container) container.innerHTML = `<div class="col-span-full text-center text-red-500 py-8">Gagal memuat data: ${err.message}</div>`;
    }
  };

  window.loadMarketBasket = fetchAnalysis;
  fetchAnalysis();
})();