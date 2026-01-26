(() => {
  const monthInput = document.getElementById("kasMonth");
  const saldoForm = document.getElementById("kasSaldoForm");
  const saldoPeriodInput = document.getElementById("kasSaldoPeriode");
  const saldoNominalInput = document.getElementById("kasSaldoNominal");
  const saldoResetBtn = document.getElementById("kasSaldoReset");
  const searchInput = document.getElementById("kasSearch");

  const saldoAwalEl = document.getElementById("kasSaldoAwal");
  const pemasukanEl = document.getElementById("kasPemasukan");
  const pengeluaranEl = document.getElementById("kasPengeluaran");
  const saldoAkhirEl = document.getElementById("kasSaldoAkhir");

  const rowsEl = document.getElementById("kasRows");
  const emptyEl = document.getElementById("kasEmpty");

  let cachedRows = [];

  const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, { credentials: "same-origin", ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Permintaan gagal.");
    }
    return data.success ? data.data : data;
  };

  const formatRupiah = (value) =>
    `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getPeriod = () => {
    const [year, month] = (monthInput.value || "").split("-");
    const now = new Date();
    return {
      year: Number(year || now.getFullYear()),
      month: Number(month || now.getMonth() + 1),
    };
  };

  const renderSummary = (summary) => {
    if (!summary) return;
    if (saldoAwalEl) saldoAwalEl.textContent = formatRupiah(summary.saldo_awal);
    if (pemasukanEl) pemasukanEl.textContent = formatRupiah(summary.pemasukan);
    if (pengeluaranEl) pengeluaranEl.textContent = formatRupiah(summary.pengeluaran);
    if (saldoAkhirEl) saldoAkhirEl.textContent = formatRupiah(summary.saldo_akhir);
  };

  const renderRows = (rows) => {
    rowsEl.innerHTML = "";
    if (!rows.length) {
      emptyEl.classList.remove("hidden");
      return;
    }
    emptyEl.classList.add("hidden");

    rows.forEach((row) => {
      const isPemasukan = row.tipe === "pemasukan";
      const tr = document.createElement("tr");
      tr.className = "border-b border-slate-100 hover:bg-slate-50";
      tr.innerHTML = `
        <td class="p-4">${formatDate(row.tanggal)}</td>
        <td class="p-4">${row.kategori || "-"}</td>
        <td class="p-4">${row.deskripsi || "-"}</td>
        <td class="p-4 text-right font-semibold ${
          isPemasukan ? "text-emerald-600" : "text-rose-500"
        }">${isPemasukan ? "" : "-"}${formatRupiah(row.nominal)}</td>
      `;
      rowsEl.appendChild(tr);
    });
  };

  const applyFilter = () => {
    const keyword = (searchInput?.value || "").toLowerCase().trim();
    if (!keyword) {
      renderRows(cachedRows);
      return;
    }
    const filtered = cachedRows.filter(
      (row) =>
        (row.kategori && row.kategori.toLowerCase().includes(keyword)) ||
        (row.deskripsi && row.deskripsi.toLowerCase().includes(keyword))
    );
    renderRows(filtered);
  };

  const loadKas = async () => {
    const { year, month } = getPeriod();
    const summary = await fetchJson(`/api/kas?year=${year}&month=${month}`);
    renderSummary(summary);
    const entries = await fetchJson(`/api/kas/entries?year=${year}&month=${month}`);
    cachedRows = entries || [];
    applyFilter();
  };

  if (monthInput) {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (!monthInput.value) monthInput.value = defaultMonth;
    monthInput.addEventListener("change", () => {
      saldoPeriodInput.value = monthInput.value;
      loadKas();
    });
  }

  if (saldoPeriodInput) {
    saldoPeriodInput.value = monthInput.value;
  }

  if (saldoForm) {
    saldoForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const [year, month] = (saldoPeriodInput.value || "").split("-");
      try {
        await fetchJson("/api/kas/saldo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            year,
            month,
            nominal: Number(saldoNominalInput.value || 0),
          }),
        });
        if (window.notifySuccess) {
          window.notifySuccess("Saldo awal disimpan", "Perhitungan kas diperbarui.");
        }
        await loadKas();
      } catch (err) {
        if (window.notifyError) {
          window.notifyError("Gagal menyimpan saldo", err.message);
        }
      }
    });
  }

  if (saldoResetBtn) {
    saldoResetBtn.addEventListener("click", () => {
      saldoNominalInput.value = "";
      saldoPeriodInput.value = monthInput.value;
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", applyFilter);
  }

  loadKas().catch((err) => {
    if (window.notifyError) {
      window.notifyError("Gagal memuat kas", err.message);
    }
  });
})();
