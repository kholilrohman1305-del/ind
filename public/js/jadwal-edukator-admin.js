(() => {
  const state = {
    bulan: "",
    rows: [],
    search: "",
    page: 1,
    pageSize: 10,
  };

  const fetchJson = async (url, options = {}) => {
    const requester = window.api?.request || fetch;
    const res = await requester(url, { credentials: "same-origin", ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Permintaan gagal.");
    }
    return data;
  };

  const currentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  };

  const formatTanggal = (value) => {
    if (!value) return "-";
    const str = String(value).includes("T") ? String(value).split("T")[0] : String(value);
    const parsed = new Date(`${str}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return str;
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(parsed);
  };

  const formatBulanLabel = (bulan) => {
    const parsed = new Date(`${bulan}-01T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return bulan;
    return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(parsed);
  };

  const formatJam = (mulai, selesai) => {
    if (!mulai) return "-";
    const start = String(mulai).slice(0, 5);
    const end = selesai ? String(selesai).slice(0, 5) : "";
    return end ? `${start} - ${end}` : start;
  };

  const statusPill = (status) =>
    status === "completed"
      ? '<span class="status-pill" style="background:#d1fae5;color:#065f46;">Selesai</span>'
      : '<span class="status-pill" style="background:#e0e7ff;color:#3730a3;">Terjadwal</span>';

  const tipePill = (tipe) =>
    tipe === "kelas"
      ? '<span class="status-pill" style="background:#d1fae5;color:#065f46;">Kelas</span>'
      : '<span class="status-pill" style="background:#dbeafe;color:#1e40af;">Privat</span>';

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));

  const renderSummary = () => {
    const totals = state.rows.reduce(
      (acc, row) => {
        acc.total += Number(row.total_jadwal || 0);
        acc.selesai += Number(row.total_selesai || 0);
        return acc;
      },
      { total: 0, selesai: 0 }
    );
    document.getElementById("statEdukator").textContent = state.rows.length;
    document.getElementById("statTotal").textContent = totals.total;
    document.getElementById("statSelesai").textContent = totals.selesai;
    document.getElementById("statTerjadwal").textContent = totals.total - totals.selesai;
  };

  const getFilteredRows = () => {
    const query = state.search.trim().toLowerCase();
    if (!query) return state.rows;
    return state.rows.filter((row) =>
      String(row.edukator_nama || "").toLowerCase().includes(query)
    );
  };

  const renderRows = () => {
    const body = document.getElementById("edukatorRows");
    const empty = document.getElementById("edukatorEmpty");
    const pagination = document.getElementById("edukatorPagination");
    if (!body || !empty) return;

    const hidePagination = () => {
      if (pagination) {
        pagination.classList.add("hidden");
        pagination.classList.remove("flex");
      }
    };

    const filtered = getFilteredRows();

    if (!filtered.length) {
      body.innerHTML = "";
      empty.classList.remove("hidden");
      const emptyText = empty.querySelector("p");
      if (emptyText) {
        emptyText.textContent = state.search.trim()
          ? `Tidak ada edukator yang cocok dengan "${state.search.trim()}".`
          : "Tidak ada jadwal edukator pada bulan ini.";
      }
      hidePagination();
      return;
    }
    empty.classList.add("hidden");

    // Pagination (client-side)
    const totalRows = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;
    const startIndex = (state.page - 1) * state.pageSize;
    const pageRows = filtered.slice(startIndex, startIndex + state.pageSize);

    if (pagination) {
      pagination.classList.remove("hidden");
      pagination.classList.add("flex");
      const info = document.getElementById("edukatorPageInfo");
      const label = document.getElementById("edukatorPageLabel");
      const prevBtn = document.getElementById("edukatorPrevPage");
      const nextBtn = document.getElementById("edukatorNextPage");
      if (info) info.textContent = `Menampilkan ${startIndex + 1}-${startIndex + pageRows.length} dari ${totalRows} edukator`;
      if (label) label.textContent = `Hal. ${state.page} / ${totalPages}`;
      if (prevBtn) prevBtn.disabled = state.page <= 1;
      if (nextBtn) nextBtn.disabled = state.page >= totalPages;
    }

    body.innerHTML = pageRows
      .map(
        (row) => `
        <tr class="hover:bg-slate-50 transition">
          <td class="px-5 py-3 font-semibold text-slate-700">${escapeHtml(row.edukator_nama)}</td>
          <td class="px-5 py-3 text-center font-bold text-slate-800">${row.total_jadwal}</td>
          <td class="px-5 py-3 text-center text-slate-600">${row.total_privat}</td>
          <td class="px-5 py-3 text-center text-slate-600">${row.total_kelas}</td>
          <td class="px-5 py-3 text-center text-emerald-600 font-semibold">${row.total_selesai}</td>
          <td class="px-5 py-3 text-slate-500 text-xs">${formatTanggal(row.tanggal_pertama)} s/d ${formatTanggal(row.tanggal_terakhir)}</td>
          <td class="px-5 py-3 text-right">
            <button type="button" data-detail-id="${row.edukator_id}"
              class="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold transition">
              <i class="fa-regular fa-eye mr-1"></i>Detail
            </button>
          </td>
        </tr>`
      )
      .join("");
  };

  const load = async () => {
    try {
      const res = await fetchJson(`/api/jadwal/edukator-bulanan?bulan=${encodeURIComponent(state.bulan)}`);
      state.rows = res.data || [];
      renderSummary();
      renderRows();
    } catch (err) {
      state.rows = [];
      renderSummary();
      renderRows();
      if (window.toast?.error) window.toast.error("Gagal memuat", err.message);
    }
  };

  // --- Detail Modal ---
  const modal = document.getElementById("detailModal");

  const closeModal = () => modal?.classList.remove("show");

  const openDetail = async (row) => {
    if (!modal) return;
    document.getElementById("detailTitle").textContent = row.edukator_nama;
    document.getElementById("detailSubtitle").textContent =
      `Jadwal mengajar bulan ${formatBulanLabel(state.bulan)}`;
    const bodyEl = document.getElementById("detailBody");
    bodyEl.innerHTML = '<div class="text-center text-slate-400 py-8 text-sm">Memuat...</div>';
    modal.classList.add("show");

    try {
      const res = await fetchJson(
        `/api/jadwal/edukator-bulanan/${row.edukator_id}?bulan=${encodeURIComponent(state.bulan)}`
      );
      const rows = res.data || [];
      if (!rows.length) {
        bodyEl.innerHTML = '<div class="text-center text-slate-400 py-8 text-sm">Tidak ada jadwal pada bulan ini.</div>';
        return;
      }

      // Kelompokkan per tanggal
      const grouped = new Map();
      rows.forEach((item) => {
        const key = String(item.tanggal).includes("T") ? String(item.tanggal).split("T")[0] : String(item.tanggal);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(item);
      });

      bodyEl.innerHTML = Array.from(grouped.entries())
        .map(([tanggal, items]) => `
          <div>
            <div class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">${formatTanggal(tanggal)}</div>
            <div class="space-y-2">
              ${items
                .map(
                  (item) => `
                <div class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div class="text-xs font-bold text-slate-700 w-24 flex-shrink-0">${formatJam(item.jam_mulai, item.jam_selesai)}</div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-semibold text-slate-700 truncate">
                      ${escapeHtml(item.siswa_nama || item.kelas_nama || item.program_nama || "-")}
                    </div>
                    <div class="text-xs text-slate-500 truncate">${escapeHtml(item.mapel_nama || item.program_nama || "-")}</div>
                  </div>
                  <div class="flex flex-col items-end gap-1 flex-shrink-0">
                    ${tipePill(item.tipe_les)}
                    ${statusPill(item.status_jadwal)}
                  </div>
                </div>`
                )
                .join("")}
            </div>
          </div>`)
        .join("");
    } catch (err) {
      bodyEl.innerHTML = `<div class="text-center text-red-400 py-8 text-sm">${escapeHtml(err.message)}</div>`;
    }
  };

  // --- Init ---
  const init = () => {
    const filter = document.getElementById("filterBulan");
    state.bulan = currentMonth();
    if (filter) {
      filter.value = state.bulan;
      filter.addEventListener("change", () => {
        state.bulan = filter.value || currentMonth();
        state.page = 1;
        load();
      });
    }

    const searchInput = document.getElementById("searchEdukator");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        state.search = searchInput.value || "";
        state.page = 1;
        renderRows();
      });
    }

    const pageSizeSelect = document.getElementById("edukatorPageSize");
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener("change", () => {
        state.pageSize = Number(pageSizeSelect.value) || 10;
        state.page = 1;
        renderRows();
      });
    }

    document.getElementById("edukatorPrevPage")?.addEventListener("click", () => {
      if (state.page > 1) {
        state.page -= 1;
        renderRows();
      }
    });
    document.getElementById("edukatorNextPage")?.addEventListener("click", () => {
      state.page += 1;
      renderRows();
    });

    document.getElementById("edukatorRows")?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-detail-id]");
      if (!button) return;
      const row = state.rows.find(
        (item) => String(item.edukator_id) === String(button.dataset.detailId)
      );
      if (row) openDetail(row);
    });

    document.getElementById("closeDetailModal")?.addEventListener("click", closeModal);
    modal?.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });

    load();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
