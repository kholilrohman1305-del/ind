(() => {
  const els = {
    cabang: document.getElementById("filterCabang"),
    month: document.getElementById("filterMonth"),
    year: document.getElementById("filterYear"),
    apply: document.getElementById("applyFilter"),
    totalSiswa: document.getElementById("totalSiswa"),
    siswaAktif: document.getElementById("siswaAktif"),
    siswaAktifBreakdown: document.getElementById("siswaAktifBreakdown"),
    siswaBaru: document.getElementById("siswaBaru"),
    totalEdukator: document.getElementById("totalEdukator"),
    pendapatan: document.getElementById("pendapatan"),
    pengeluaran: document.getElementById("pengeluaran"),
    selisih: document.getElementById("selisih"),
    table: document.getElementById("cabangTable"),
    forecastChart: document.getElementById("forecastChart"),
    sidebarToggle: document.getElementById("sidebarToggle"),
    sidebar: document.getElementById("sidebar"),
  };

  let chart = null;

  const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value || 0);

  const formatNumber = (value) =>
    new Intl.NumberFormat("id-ID").format(value || 0);

  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const initFilters = () => {
    const now = new Date();
    if (els.month) {
      els.month.innerHTML = monthNames
        .map((label, idx) => `<option value="${idx + 1}">${label}</option>`)
        .join("");
      els.month.value = String(now.getMonth() + 1);
    }
    if (els.year) {
      const start = now.getFullYear() - 3;
      const end = now.getFullYear() + 1;
      const options = [];
      for (let y = end; y >= start; y -= 1) {
        options.push(`<option value="${y}">${y}</option>`);
      }
      els.year.innerHTML = options.join("");
      els.year.value = String(now.getFullYear());
    }
  };

  const loadCabangOptions = async () => {
    if (!els.cabang) return;
    try {
      const res = await fetch("/api/cabang", { credentials: "same-origin" });
      const json = await res.json();
      if (!res.ok) return;
      const rows = json && json.success ? json.data : json;
      if (!Array.isArray(rows)) return;
      const options = rows
        .map((row) => `<option value="${row.id}">${row.nama}</option>`)
        .join("");
      els.cabang.innerHTML = `<option value="">Semua Cabang</option>${options}`;
    } catch (err) {
      console.error(err);
    }
  };

  const renderSummary = (summary) => {
    if (!summary) return;
    if (els.totalSiswa) els.totalSiswa.textContent = formatNumber(summary.total_siswa);
    if (els.siswaAktif) els.siswaAktif.textContent = formatNumber(summary.siswa_aktif);
    if (els.siswaAktifBreakdown) {
      els.siswaAktifBreakdown.textContent = `Privat ${formatNumber(summary.siswa_aktif_privat)} · Kelas ${formatNumber(summary.siswa_aktif_kelas)}`;
    }
    if (els.siswaBaru) els.siswaBaru.textContent = formatNumber(summary.siswa_baru);
    if (els.totalEdukator) els.totalEdukator.textContent = formatNumber(summary.total_edukator);
    if (els.pendapatan) els.pendapatan.textContent = formatRupiah(summary.pendapatan);
    if (els.pengeluaran) els.pengeluaran.textContent = formatRupiah(summary.pengeluaran);
    if (els.selisih) {
      els.selisih.textContent = formatRupiah(summary.selisih);
      els.selisih.className = summary.selisih >= 0 ? "font-bold text-emerald-600" : "font-bold text-rose-600";
    }
  };

  const renderTable = (rows) => {
    if (!els.table) return;
    if (!rows || !rows.length) {
      els.table.innerHTML = `
        <tr>
          <td colspan="10" class="text-center py-8 text-slate-400">Belum ada data cabang.</td>
        </tr>`;
      return;
    }

    els.table.innerHTML = rows
      .map((row) => {
        const status = row.is_active ? "Aktif" : "Nonaktif";
        return `
          <tr class="border-b border-slate-100 hover:bg-slate-50">
            <td class="px-4 py-3">
              <div class="font-semibold text-slate-800">${row.cabang_nama}</div>
              <div class="text-xs text-slate-400">${row.cabang_kode || "-"} · ${status}</div>
            </td>
            <td class="px-4 py-3">${formatNumber(row.total_siswa)}</td>
            <td class="px-4 py-3">${formatNumber(row.siswa_aktif)}</td>
            <td class="px-4 py-3">${formatNumber(row.siswa_aktif_privat)}</td>
            <td class="px-4 py-3">${formatNumber(row.siswa_aktif_kelas)}</td>
            <td class="px-4 py-3">${formatNumber(row.siswa_baru)}</td>
            <td class="px-4 py-3">${formatNumber(row.total_edukator)}</td>
            <td class="px-4 py-3 text-emerald-600 font-semibold">${formatRupiah(row.pendapatan)}</td>
            <td class="px-4 py-3 text-rose-500 font-semibold">${formatRupiah(row.pengeluaran)}</td>
            <td class="px-4 py-3 font-semibold ${row.selisih >= 0 ? "text-emerald-600" : "text-rose-600"}">${formatRupiah(row.selisih)}</td>
          </tr>
        `;
      })
      .join("");
  };

  const renderForecast = (forecast) => {
    if (!els.forecastChart || !forecast) return;

    const history = forecast.pendapatan?.history || [];
    const pendapatanFuture = forecast.pendapatan?.forecast || [];
    const pengeluaranHistory = forecast.pengeluaran?.history || [];
    const pengeluaranFuture = forecast.pengeluaran?.forecast || [];

    const labels = history.map((row) => row.month).concat(pendapatanFuture.map((row) => row.month));
    const pendapatanData = history.map((row) => row.total).concat(pendapatanFuture.map((row) => row.total));
    const pengeluaranData = pengeluaranHistory.map((row) => row.total).concat(pengeluaranFuture.map((row) => row.total));

    if (chart) chart.destroy();
    chart = new Chart(els.forecastChart, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Pendapatan",
            data: pendapatanData,
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.12)",
            tension: 0.35,
            fill: true,
          },
          {
            label: "Pengeluaran",
            data: pengeluaranData,
            borderColor: "#f43f5e",
            backgroundColor: "rgba(244, 63, 94, 0.08)",
            tension: 0.35,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
        },
        scales: {
          y: {
            ticks: {
              callback: (value) => new Intl.NumberFormat("id-ID").format(value),
            },
          },
        },
      },
    });
  };

  const loadData = async () => {
    try {
      const cabangId = els.cabang?.value || "";
      const month = els.month?.value || "";
      const year = els.year?.value || "";
      const res = await fetch(`/api/dashboard/cabang-analytics?month=${month}&year=${year}&cabang_id=${cabangId}`, {
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat data.");
      }
      const data = json.data || {};
      renderSummary(data.summary);
      renderTable(data.cabang || []);
      renderForecast(data.forecast || {});
    } catch (err) {
      console.error(err);
      renderTable([]);
    }
  };

  if (els.apply) {
    els.apply.addEventListener("click", loadData);
  }

  if (els.cabang) {
    els.cabang.addEventListener("change", loadData);
  }
  if (els.month) {
    els.month.addEventListener("change", loadData);
  }
  if (els.year) {
    els.year.addEventListener("change", loadData);
  }

  if (els.sidebarToggle && els.sidebar) {
    els.sidebarToggle.addEventListener("click", () => {
      els.sidebar.classList.toggle("hidden");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initFilters();
    loadCabangOptions();
    loadData();
  });
})();
