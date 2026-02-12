(() => {
  const modeSelect = document.getElementById("reportMode");
  const monthInput = document.getElementById("reportMonth");
  const cabangSelect = document.getElementById("reportCabang");
  const yearInput = document.getElementById("reportYear");
  const applyButton = document.getElementById("applyReport");
  const ctx = document.getElementById("keuanganChart");
  const ctxPie = document.getElementById("pengeluaranPieChart");
  
  // Stats Elements
  const presensiEl = document.getElementById("laporanPresensi");
  const siswaAktifEl = document.getElementById("laporanSiswaAktif");
  const siswaNonaktifEl = document.getElementById("laporanSiswaNonaktif");
  const programFavoritEl = document.getElementById("laporanProgramFavorit");
  const programFavoritTotalEl = document.getElementById("laporanProgramFavoritTotal");
  
  let chart = null;
  let pieChart = null;
  let lastChartData = null;

  // --- Configuration ---
  
  // Set default Font for Chart.js to match CSS
  Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
  Chart.defaults.color = "#64748B";

  const formatCurrency = (value) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value || 0);

  const setDefaultFilters = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    monthInput.value = `${now.getFullYear()}-${month}`;
    yearInput.value = String(now.getFullYear());
  };

  const toggleMode = () => {
    const mode = modeSelect.value;
    const simWrapper = document.getElementById("simulationWrapper");
    if (mode === "year") {
      monthInput.classList.add("hidden");
      yearInput.classList.remove("hidden");
      if (simWrapper) simWrapper.classList.add("hidden");
    } else if (mode === "forecast") {
      // Sembunyikan filter tanggal karena forecast otomatis dari hari ini
      monthInput.classList.add("hidden");
      yearInput.classList.add("hidden");
      if (simWrapper) simWrapper.classList.remove("hidden");
    } else {
      yearInput.classList.add("hidden");
      monthInput.classList.remove("hidden");
      if (simWrapper) simWrapper.classList.add("hidden");
    }
  };

  const fetchJson = async (url, options = {}) => {
    try {
        const requester = window.api?.request || fetch;
        const res = await requester(url, { credentials: "same-origin", ...options });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || "Permintaan gagal.");
        }
        return data && data.success ? data.data : data;
    } catch (err) {
        throw err;
    }
  };

  const buildUrl = () => {
    const mode = modeSelect.value;
    let cabangQuery = "";
    if (cabangSelect && !cabangSelect.classList.contains("hidden") && cabangSelect.value) {
        cabangQuery = `&cabang_id=${cabangSelect.value}`;
    }

    if (mode === "year") {
      const year = yearInput.value || new Date().getFullYear();
      return `/api/laporan/keuangan?mode=year&year=${year}${cabangQuery}`;
    }
    if (mode === "forecast") {
      return `/api/forecasting/financial${cabangQuery ? '?' + cabangQuery.substring(1) : ''}`;
    }
    const [year, month] = (monthInput.value || "").split("-");
    const finalYear = year || new Date().getFullYear();
    const finalMonth = month || new Date().getMonth() + 1;
    return `/api/laporan/keuangan?mode=month&year=${finalYear}&month=${finalMonth}${cabangQuery}`;
  };

  const buildLanjutanUrl = () => {
    const mode = modeSelect.value;
    const now = new Date();
    let cabangQuery = "";
    if (cabangSelect && !cabangSelect.classList.contains("hidden") && cabangSelect.value) {
        cabangQuery = `&cabang_id=${cabangSelect.value}`;
    }

    if (mode === "year") {
      const year = yearInput.value || now.getFullYear();
      const month = now.getMonth() + 1;
      return `/api/laporan/lanjutan?year=${year}&month=${month}${cabangQuery}`;
    }
    const [year, month] = (monthInput.value || "").split("-");
    const finalYear = year || now.getFullYear();
    const finalMonth = month || now.getMonth() + 1;
    return `/api/laporan/lanjutan?year=${finalYear}&month=${finalMonth}${cabangQuery}`;
  };

  const renderForecastTable = (forecast, simData) => {
    let container = document.getElementById("forecastTableContainer");
    
    if (!forecast || !forecast.length) {
        if (container) container.innerHTML = "";
        return;
    }

    if (!container) {
      container = document.createElement("div");
      container.id = "forecastTableContainer";
      container.className = "mt-6 overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white";
      if (ctx && ctx.parentNode && ctx.parentNode.parentNode) {
          ctx.parentNode.parentNode.appendChild(container);
      }
    }

    let html = `
      <table class="w-full text-sm text-left">
          <thead class="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
              <tr>
                  <th class="px-6 py-3 font-semibold">Bulan</th>
                  <th class="px-6 py-3 text-right font-semibold text-rose-500">Skenario Pesimis</th>
                  <th class="px-6 py-3 text-right font-semibold text-gray-700">Prediksi (Tren)</th>
                  <th class="px-6 py-3 text-right font-semibold text-emerald-500">Skenario Optimis</th>
                  ${simData ? `<th class="px-6 py-3 text-right font-semibold text-emerald-600">Simulasi (${document.getElementById("simulationInput")?.value}%)</th>` : ''}
              </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
    `;

    forecast.forEach((item, index) => {
        const sysVal = item.total;
        const simVal = simData ? simData[index] : null;
        const diff = simData ? simVal - sysVal : 0;
        const diffClass = diff > 0 ? "text-emerald-600" : (diff < 0 ? "text-rose-600" : "text-gray-400");
        const diffSign = diff > 0 ? "+" : "";
        const [y, m] = item.month.split('-');
        const date = new Date(y, m - 1);
        const monthLabel = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

        html += `
          <tr class="hover:bg-gray-50/50 transition">
              <td class="px-6 py-4 font-medium text-gray-700">${monthLabel}</td>
              <td class="px-6 py-4 text-right font-medium text-rose-500">${formatCurrency(item.lower)}</td>
              <td class="px-6 py-4 text-right font-bold text-gray-800">${formatCurrency(sysVal)}</td>
              <td class="px-6 py-4 text-right font-medium text-emerald-500">${formatCurrency(item.upper)}</td>
              ${simData ? `<td class="px-6 py-4 text-right font-bold text-emerald-600">${formatCurrency(simVal)} <span class="text-[10px] text-gray-400 ml-1">(${diffSign}${formatCurrency(diff)})</span></td>` : ''}
          </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  };

  // --- Detail Modal Logic ---
  const detailModal = document.getElementById("detailModal");
  const detailTitle = document.getElementById("detailModalTitle");
  const detailTable = document.getElementById("detailTable");
  const closeDetailBtn = document.getElementById("closeDetailModal");
  const backdropDetail = document.getElementById("detailModalBackdrop");

  const closeDetail = () => detailModal.classList.add("hidden");
  if(closeDetailBtn) closeDetailBtn.addEventListener("click", closeDetail);
  if(backdropDetail) backdropDetail.addEventListener("click", closeDetail);

  const openDetail = async (category) => {
      detailTitle.textContent = `Detail: ${category}`;
      detailTable.innerHTML = `<tr><td class="py-4 text-center text-gray-500"><i class="fa-solid fa-circle-notch fa-spin"></i> Memuat data...</td></tr>`;
      detailModal.classList.remove("hidden");

      try {
          const mode = modeSelect.value;
          let query = `category=${encodeURIComponent(category)}`;
          
          if (cabangSelect && !cabangSelect.classList.contains("hidden") && cabangSelect.value) {
              query += `&cabang_id=${cabangSelect.value}`;
          }
          
          if (mode === "year") {
              query += `&year=${yearInput.value || new Date().getFullYear()}`;
          } else {
              const [y, m] = (monthInput.value || "").split("-");
              query += `&year=${y}&month=${m}`;
          }

          const res = await fetchJson(`/api/laporan/detail?${query}`);
          
          if (!res || res.length === 0) {
              detailTable.innerHTML = `<tr><td class="py-4 text-center text-gray-500 text-sm">Tidak ada data detail.</td></tr>`;
              return;
          }

          detailTable.innerHTML = res.map(row => `
              <tr class="border-b border-gray-50 last:border-0">
                  <td class="py-3 text-sm text-gray-700 font-medium">${row.label}</td>
                  <td class="py-3 text-sm text-right font-bold text-gray-900">${formatCurrency(row.value)}</td>
              </tr>
          `).join("");
      } catch (err) {
          detailTable.innerHTML = `<tr><td class="py-4 text-center text-rose-500 text-sm">Gagal memuat data.</td></tr>`;
      }
  };

  const renderPieChart = (data) => {
    if (!ctxPie) return;
    
    // Destroy existing chart properly
    const existingChart = Chart.getChart(ctxPie);
    if (existingChart) existingChart.destroy();

    if (!data || !data.length) {
        // Bisa tambahkan visual empty state di sini jika mau
        return;
    }

    pieChart = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                data: data.map(d => d.value),
                backgroundColor: [
                    '#F43F5E', // Rose
                    '#FB923C', // Orange
                    '#FBBF24', // Amber
                    '#A3E635', // Lime
                    '#34D399', // Emerald
                    '#22D3EE', // Cyan
                    '#818CF8', // Indigo
                    '#A78BFA'  // Violet
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const label = pieChart.data.labels[index];
                    openDetail(label);
                }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 11 }, padding: 15 }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const val = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((val / total) * 100).toFixed(1) + '%' : '0%';
                            return ` ${context.label}: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)} (${pct})`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
  };

  const renderChart = (payload) => {
    // Destroy existing chart properly
    const existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    // A. Render Forecast Chart (Line Chart)
    if (payload.history && payload.forecast) {
        const { history, forecast } = payload;
        const labels = [...history.map(d => d.month), ...forecast.map(d => d.month)];
        
        // Data History
        const historyData = history.map(d => d.total);
        
        // Data Forecast (Sambungkan titik terakhir history)
        const forecastData = Array(history.length - 1).fill(null);
        forecastData.push(history[history.length - 1].total);
        forecast.forEach(d => forecastData.push(d.total));

        // Data Batas Atas (Upper Bound)
        const upperData = Array(history.length - 1).fill(null);
        upperData.push(history[history.length - 1].total); // Anchor ke titik terakhir history
        forecast.forEach(d => upperData.push(d.upper));

        // Data Batas Bawah (Lower Bound)
        const lowerData = Array(history.length - 1).fill(null);
        lowerData.push(history[history.length - 1].total); // Anchor ke titik terakhir history
        forecast.forEach(d => lowerData.push(d.lower));

        // Data Anomali (Titik Merah)
        const anomalyData = history.map(d => d.is_anomaly ? d.total : null);

        const datasets = [
            {
                label: 'Pendapatan Aktual',
                data: historyData,
                borderColor: '#4F46E5', // Indigo
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            },
            {
                label: 'Prediksi (Tren)',
                data: forecastData,
                borderColor: '#EC4899', // Pink
                backgroundColor: 'rgba(236, 72, 153, 0.05)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointStyle: 'rectRot',
                fill: false,
                tension: 0.3
            },
            {
                label: 'Skenario Optimis',
                data: upperData,
                borderColor: '#10B981', // Emerald
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderDash: [4, 4],
                pointRadius: 0,
                fill: false,
                tension: 0.3
            },
            {
                label: 'Skenario Pesimis',
                data: lowerData,
                borderColor: '#F43F5E', // Rose
                backgroundColor: 'rgba(99, 102, 241, 0.05)', // Indigo tint for area
                borderWidth: 1,
                borderDash: [4, 4],
                pointRadius: 0,
                fill: '-1', // Mengisi area sampai dataset sebelumnya (Optimis)
                tension: 0.3
            },
            {
                label: 'Deteksi Anomali',
                data: anomalyData,
                borderColor: '#EF4444', // Red 500
                backgroundColor: '#EF4444',
                pointStyle: 'circle',
                pointRadius: 6,
                pointHoverRadius: 8,
                showLine: false, // Scatter only
                order: 0 // Draw on top
            }
        ];

        // --- Logika Simulasi Manual ---
        const simInput = document.getElementById("simulationInput");
        const growthRate = simInput ? parseFloat(simInput.value) : NaN;
        let simValues = null;

        if (!isNaN(growthRate) && history.length > 0) {
            const lastVal = history[history.length - 1].total;
            const simData = Array(history.length - 1).fill(null);
            simData.push(lastVal); // Anchor
            
            let currentVal = lastVal;
            simValues = [];
            forecast.forEach(() => {
                currentVal = currentVal * (1 + growthRate / 100);
                const val = Math.round(currentVal);
                simData.push(val);
                simValues.push(val);
            });

            datasets.push({
                label: `Simulasi (${growthRate}%)`,
                data: simData,
                borderColor: '#10B981', // Emerald 500
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                borderWidth: 2,
                borderDash: [2, 2],
                pointStyle: 'circle',
                pointRadius: 4,
                fill: false,
                tension: 0.3
            });
        }

        renderForecastTable(forecast, simValues);

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { position: 'top' } }
            }
        });
        return;
    }

    // B. Render Standard Chart (Bar Chart)
    const labels = payload.labels || [];
    const pemasukan = payload.datasets?.pemasukan || [];
    const pengeluaran = payload.datasets?.pengeluaran || [];

    // Clear table if exists (when switching back to standard mode)
    const tableContainer = document.getElementById("forecastTableContainer");
    if (tableContainer) tableContainer.innerHTML = "";

    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Pemasukan",
            data: pemasukan,
            backgroundColor: "#6366F1", // Indigo 500
            hoverBackgroundColor: "#4F46E5",
            borderRadius: 6,
            barPercentage: 0.6,
            categoryPercentage: 0.8
          },
          {
            label: "Pengeluaran",
            data: pengeluaran,
            backgroundColor: "#F43F5E", // Rose 500
            hoverBackgroundColor: "#E11D48",
            borderRadius: 6,
            barPercentage: 0.6,
            categoryPercentage: 0.8
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false, // Custom legend in HTML is cleaner
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#1e293b',
            bodyColor: '#475569',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            padding: 10,
            displayColors: true,
            boxPadding: 4,
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) {
                    label += ': ';
                }
                if (context.parsed.y !== null) {
                    label += new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(context.parsed.y);
                }
                return label;
              }
            }
          },
        },
        scales: {
          x: {
            grid: {
                display: false,
                drawBorder: false
            },
            ticks: {
                font: { size: 11 }
            }
          },
          y: {
            border: { display: false },
            grid: {
                borderDash: [5, 5],
                color: '#f1f5f9'
            },
            ticks: {
              font: { size: 11 },
              callback: (value) => {
                  if (value >= 1000000) return 'Rp' + (value/1000000).toFixed(1) + 'jt';
                  if (value >= 1000) return 'Rp' + (value/1000).toFixed(0) + 'rb';
                  return value;
              },
            },
          },
        },
      },
    });

    // Render Pie Chart jika data tersedia
    if (payload.pie_data) {
        renderPieChart(payload.pie_data);
    }
  };

  const loadChart = async () => {
    try {
        const url = buildUrl();
        const data = await fetchJson(url);
        lastChartData = data;
        renderChart(data);
    } catch (e) {
        console.error("Chart Error", e);
        // Optional: Render empty chart state
    }
  };

  const loadLanjutan = async () => {
    try {
        const url = buildLanjutanUrl();
        const data = await fetchJson(url);
        
        // Animasi angka sederhana (optional utility)
        if (presensiEl) presensiEl.textContent = Number(data.presensi ?? 0).toLocaleString('id-ID');
        if (siswaAktifEl) siswaAktifEl.textContent = Number(data.siswa_aktif ?? 0).toLocaleString('id-ID');
        if (siswaNonaktifEl) siswaNonaktifEl.textContent = Number(data.siswa_nonaktif ?? 0).toLocaleString('id-ID');
        if (programFavoritEl) programFavoritEl.textContent = data.program_favorit || "-";
        
        if (programFavoritTotalEl) {
          const total = data.program_favorit_total ?? 0;
          programFavoritTotalEl.textContent = `${total}`; // Text "siswa" sudah ada di HTML
        }
    } catch (e) {
        console.error("Lanjutan Error", e);
    }
  };

  const initFilters = async () => {
      try {
          const session = await fetchJson("/api/auth/session");
          if (session && session.user && session.user.role === "super_admin") {
              // Show Cabang Filter
              const branches = await fetchJson("/api/cabang");
              if (cabangSelect) {
                  cabangSelect.innerHTML = `<option value="">Semua Cabang</option>` + 
                      branches.map(b => `<option value="${b.id}">${b.nama}</option>`).join("");
                  cabangSelect.classList.remove("hidden");
              }
          }
      } catch (e) {
          console.error("Failed to init filters", e);
      }
  };

  // --- Initialization ---

  // Inject Forecast Option
  if (modeSelect) {
      const opt = document.createElement("option");
      opt.value = "forecast";
      opt.textContent = "Forecast (Prediksi)";
      modeSelect.appendChild(opt);
  }

  // Inject Simulation Input UI
  const createSimulationUI = () => {
      if (document.getElementById("simulationWrapper")) return;
      
      const wrapper = document.createElement("div");
      wrapper.id = "simulationWrapper";
      wrapper.className = "hidden flex items-center gap-2 ml-2 border-l pl-3 border-gray-300";
      
      wrapper.innerHTML = `
          <span class="text-xs font-semibold text-gray-500">Simulasi:</span>
          <div class="relative">
              <input type="number" id="simulationInput" class="pl-2 pr-6 py-1.5 border border-gray-200 rounded-md text-xs w-20 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition" placeholder="0" step="0.5">
              <span class="absolute right-2 top-1.5 text-xs text-gray-400">%</span>
          </div>
      `;
      
      if (yearInput && yearInput.parentNode) {
          yearInput.parentNode.insertBefore(wrapper, yearInput.nextSibling);
      }
      
      const input = document.getElementById("simulationInput");
      if (input) {
          input.addEventListener("input", () => {
              if (lastChartData) renderChart(lastChartData);
          });
      }
  };

  createSimulationUI();
  setDefaultFilters();
  toggleMode();

  if (modeSelect) {
    modeSelect.addEventListener("change", toggleMode);
  }
  
  if (applyButton) {
    applyButton.addEventListener("click", () => {
      // Add loading state to button if needed
      applyButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading';
      
      Promise.all([loadChart(), loadLanjutan()])
        .catch((err) => {
            if (window.toast.error) window.toast.error("Gagal memuat laporan", err.message);
        })
        .finally(() => {
             applyButton.innerHTML = '<i class="fa-solid fa-filter"></i> Terapkan';
        });
      
      // Trigger reload for other modules (Forecasting & Market Basket)
      if (window.loadForecasts) window.loadForecasts();
      if (window.loadMarketBasket) window.loadMarketBasket();
    });
  }

  // Initial Load
  initFilters().then(() => {
      Promise.all([loadChart(), loadLanjutan()]).catch((err) => {
        if (window.toast.error) {
          window.toast.error("Gagal memuat laporan", err.message);
        }
      });
  });
})();
