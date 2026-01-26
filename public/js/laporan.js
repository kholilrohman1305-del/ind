(() => {
  const modeSelect = document.getElementById("reportMode");
  const monthInput = document.getElementById("reportMonth");
  const yearInput = document.getElementById("reportYear");
  const applyButton = document.getElementById("applyReport");
  const ctx = document.getElementById("keuanganChart");
  const presensiEl = document.getElementById("laporanPresensi");
  const siswaAktifEl = document.getElementById("laporanSiswaAktif");
  const siswaNonaktifEl = document.getElementById("laporanSiswaNonaktif");
  const programFavoritEl = document.getElementById("laporanProgramFavorit");
  const programFavoritTotalEl = document.getElementById("laporanProgramFavoritTotal");
  let chart = null;

  const setDefaultFilters = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    monthInput.value = `${now.getFullYear()}-${month}`;
    yearInput.value = String(now.getFullYear());
  };

  const toggleMode = () => {
    const mode = modeSelect.value;
    if (mode === "year") {
      monthInput.classList.add("hidden");
      yearInput.classList.remove("hidden");
    } else {
      yearInput.classList.add("hidden");
      monthInput.classList.remove("hidden");
    }
  };

  const fetchJson = async (url) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Permintaan gagal.");
    }
    return data && data.success ? data.data : data;
  };

  const buildUrl = () => {
    const mode = modeSelect.value;
    if (mode === "year") {
      const year = yearInput.value || new Date().getFullYear();
      return `/api/laporan/keuangan?mode=year&year=${year}`;
    }
    const [year, month] = (monthInput.value || "").split("-");
    const finalYear = year || new Date().getFullYear();
    const finalMonth = month || new Date().getMonth() + 1;
    return `/api/laporan/keuangan?mode=month&year=${finalYear}&month=${finalMonth}`;
  };

  const buildLanjutanUrl = () => {
    const mode = modeSelect.value;
    const now = new Date();
    if (mode === "year") {
      const year = yearInput.value || now.getFullYear();
      const month = now.getMonth() + 1;
      return `/api/laporan/lanjutan?year=${year}&month=${month}`;
    }
    const [year, month] = (monthInput.value || "").split("-");
    const finalYear = year || now.getFullYear();
    const finalMonth = month || now.getMonth() + 1;
    return `/api/laporan/lanjutan?year=${finalYear}&month=${finalMonth}`;
  };

  const renderChart = (payload) => {
    const labels = payload.labels || [];
    const pemasukan = payload.datasets?.pemasukan || [];
    const pengeluaran = payload.datasets?.pengeluaran || [];

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Pemasukan",
            data: pemasukan,
            backgroundColor: "rgba(59, 130, 246, 0.5)",
            borderColor: "rgba(59, 130, 246, 1)",
            borderWidth: 1,
            borderRadius: 8,
          },
          {
            label: "Pengeluaran",
            data: pengeluaran,
            backgroundColor: "rgba(239, 68, 68, 0.5)",
            borderColor: "rgba(239, 68, 68, 1)",
            borderWidth: 1,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: (context) =>
                `${context.dataset.label}: Rp ${Number(context.parsed.y || 0).toLocaleString("id-ID")}`,
            },
          },
        },
        scales: {
          y: {
            ticks: {
              callback: (value) => `Rp ${Number(value).toLocaleString("id-ID")}`,
            },
          },
        },
      },
    });
  };

  const loadChart = async () => {
    const url = buildUrl();
    const data = await fetchJson(url);
    renderChart(data);
  };

  const loadLanjutan = async () => {
    const url = buildLanjutanUrl();
    const data = await fetchJson(url);
    if (presensiEl) presensiEl.textContent = data.presensi ?? 0;
    if (siswaAktifEl) siswaAktifEl.textContent = data.siswa_aktif ?? 0;
    if (siswaNonaktifEl) siswaNonaktifEl.textContent = data.siswa_nonaktif ?? 0;
    if (programFavoritEl) programFavoritEl.textContent = data.program_favorit || "-";
    if (programFavoritTotalEl) {
      const total = data.program_favorit_total ?? 0;
      programFavoritTotalEl.textContent = `${total} siswa`;
    }
  };

  setDefaultFilters();
  toggleMode();

  if (modeSelect) {
    modeSelect.addEventListener("change", toggleMode);
  }
  if (applyButton) {
    applyButton.addEventListener("click", () => {
      Promise.all([loadChart(), loadLanjutan()]).catch((err) => {
        if (window.notifyError) {
          window.notifyError("Gagal memuat laporan", err.message);
        }
      });
    });
  }

  Promise.all([loadChart(), loadLanjutan()]).catch((err) => {
    if (window.notifyError) {
      window.notifyError("Gagal memuat laporan", err.message);
    }
  });
})();
