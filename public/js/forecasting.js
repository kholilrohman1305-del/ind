(() => {
  const renderChart = (canvasId, label, data, color) => {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.warn(`Canvas ${canvasId} tidak ditemukan.`);
        return;
    }
    
    const container = ctx.parentElement;
    
    if (typeof Chart === 'undefined') {
        console.error("Chart.js belum dimuat.");
        return;
    }

    // Hapus chart lama jika ada (untuk mencegah overlap saat refresh)
    const existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    // Cek jika data kosong (semua 0)
    const totalValue = data.history.reduce((a, b) => a + b.total, 0);
    if (totalValue === 0 && data.forecast.every(d => d.total === 0)) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-gray-400 text-xs"><i class="fa-solid fa-chart-line text-2xl mb-2 opacity-20"></i>Belum ada data historis</div>`;
        return;
    }

    const historyLabels = data.history.map(d => d.month);
    const forecastLabels = data.forecast.map(d => d.month);
    const allLabels = [...historyLabels, ...forecastLabels];

    const historyData = data.history.map(d => d.total);
    
    // Sambungkan garis forecast dari titik terakhir history
    const forecastData = Array(historyData.length - 1).fill(null);
    forecastData.push(historyData[historyData.length - 1]);
    data.forecast.forEach(d => forecastData.push(d.total));

    // Area Confidence Interval (Batas Atas & Bawah)
    const upperData = Array(historyData.length - 1).fill(null);
    upperData.push(historyData[historyData.length - 1]);
    data.forecast.forEach(d => upperData.push(d.upper));

    const lowerData = Array(historyData.length - 1).fill(null);
    lowerData.push(historyData[historyData.length - 1]);
    data.forecast.forEach(d => lowerData.push(d.lower));

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: allLabels,
        datasets: [
          {
            label: 'Historis',
            data: [...historyData, ...Array(data.forecast.length).fill(null)],
            borderColor: '#94a3b8', // Slate 400
            backgroundColor: '#94a3b8',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.3,
            fill: false
          },
          {
            label: 'Prediksi',
            data: forecastData,
            borderColor: color,
            backgroundColor: color,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.3,
            fill: false
          },
          {
            label: 'Batas Atas',
            data: upperData,
            borderColor: 'transparent',
            backgroundColor: `${color}10`, // Sangat transparan
            pointRadius: 0,
            fill: '+1', // Fill ke dataset berikutnya (Lower)
            tension: 0.3
          },
          {
            label: 'Batas Bawah',
            data: lowerData,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            pointRadius: 0,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: false // Sembunyikan legend agar bersih
          },
          tooltip: {
            callbacks: {
                label: (context) => {
                    if (context.dataset.label.includes('Batas')) return null;
                    let label = context.dataset.label || '';
                    if (label) label += ': ';
                    if (context.parsed.y !== null) {
                        if (canvasId.includes('Financial')) {
                            label += new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(context.parsed.y);
                        } else {
                            label += context.parsed.y;
                        }
                    }
                    return label;
                }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { borderDash: [2, 4], color: '#f1f5f9' },
            ticks: { font: { size: 10 } }
          },
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 8, font: { size: 10 } }
          }
        }
      }
    });
  };

  const loadForecasts = async () => {
    try {
      const cabangSelect = document.getElementById("reportCabang");
      let query = "";
      if (cabangSelect && !cabangSelect.classList.contains("hidden") && cabangSelect.value) {
          query = `?cabang_id=${cabangSelect.value}`;
      }

      // Fetch parallel
      const [resEnroll, resFinance] = await Promise.all([
          fetch(`/api/forecasting/enrollment${query}`),
          fetch(`/api/forecasting/financial${query}`)
      ]);
      
      // Handle Enrollment
      if (resEnroll.ok) {
          const jsonEnroll = await resEnroll.json();
          if (jsonEnroll.success) {
            renderChart("forecastEnrollmentChart", "Siswa Baru", jsonEnroll.data, "#10b981");
          }
      } else {
          console.error("Gagal memuat enrollment forecast");
      }

      // Handle Financial
      if (resFinance.ok) {
          const jsonFinance = await resFinance.json();
          if (jsonFinance.success) {
            renderChart("forecastFinancialChart", "Arus Kas", jsonFinance.data, "#4f46e5");
          }
      } else {
          console.error("Gagal memuat financial forecast");
      }
    } catch (err) {
      console.error("Failed to load forecasts", err);
    }
  };

  // Init
  window.loadForecasts = loadForecasts;
  loadForecasts();
})();