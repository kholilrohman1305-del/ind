(() => {
  const state = {
    rows: [],
    search: "",
    month: "",
  };

  const parseData = (payload) => {
    if (payload && typeof payload === "object" && payload.success) {
      return payload.data;
    }
    return payload;
  };

  const fetchJson = async (url, options) => {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Permintaan gagal.");
    }
    return parseData(data);
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const str = String(value);
    if (str.includes("T")) return str.split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const parsed = new Date(str);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return str;
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    const date = parsed.toISOString().slice(0, 10);
    const time = parsed.toTimeString().slice(0, 8);
    return `${date}, ${time}`;
  };

  const renderList = (rows) => {
    const list = document.getElementById("presensiList");
    const empty = document.getElementById("presensiEmpty");
    list.innerHTML = "";
    state.rows = rows;
    if (!rows.length) {
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    rows.forEach((row) => {
      const div = document.createElement("div");
      div.className = "presensi-card";
      div.innerHTML = `
        <div>
          <div class="presensi-name">${row.nama || "-"}</div>
          <div class="presensi-meta">Hadir bulan ini: ${row.hadir_bulan_ini || 0}</div>
        </div>
        <div class="presensi-actions">
          <button class="primary-button" data-action="detail" data-edukator="${row.id}">
            Lihat Detail
          </button>
        </div>
      `;
      list.appendChild(div);
    });
  };

  const openDetailModal = async (edukatorId) => {
    const modal = document.getElementById("presensiDetailModal");
    const rows = await fetchJson(
      `/api/presensi/edukator/${edukatorId}?month=${encodeURIComponent(state.month)}`
    );
    const detailRows = document.getElementById("presensiDetailRows");
    const detailEmpty = document.getElementById("presensiDetailEmpty");
    detailRows.innerHTML = "";
    if (!rows.length) {
      if (detailEmpty) detailEmpty.style.display = "block";
      openModal(modal);
      return;
    }
    if (detailEmpty) detailEmpty.style.display = "none";
    const subtitle = document.getElementById("presensiDetailSubtitle");
    subtitle.textContent = `Edukator ${rows[0].edukator_nama || ""}`.trim();

    rows.forEach((row) => {
      const lokasi =
        row.latitude && row.longitude
          ? `<a class="link" href="https://www.google.com/maps?q=${row.latitude},${row.longitude}" target="_blank" rel="noopener">
              ${row.latitude}, ${row.longitude}
            </a>`
          : "-";
      const div = document.createElement("div");
      div.className = "presensi-row";
      div.innerHTML = `
        <div>${row.siswa_nama || "-"}</div>
        <div>${formatDate(row.tanggal)}</div>
        <div>${row.kelas || "-"}</div>
        <div>${row.program_nama || "-"}</div>
        <div>${row.materi || "-"}</div>
        <div>${lokasi}</div>
        <div>${formatDateTime(row.waktu_absen)}</div>
      `;
      detailRows.appendChild(div);
    });

    openModal(modal);
  };

  const openModal = (modal) => {
    if (!modal) return;
    modal.classList.remove("hidden");
  };

  const closeModal = (modal) => {
    if (!modal) return;
    modal.classList.add("hidden");
  };

  const init = async () => {
    const closeDetail = document.getElementById("closePresensiDetail");
    const closeDetailFooter = document.getElementById("closePresensiDetailFooter");
    const detailModal = document.getElementById("presensiDetailModal");
    if (closeDetail) {
      closeDetail.addEventListener("click", () => closeModal(detailModal));
    }
    if (closeDetailFooter) {
      closeDetailFooter.addEventListener("click", () => closeModal(detailModal));
    }
    if (detailModal) {
      detailModal.addEventListener("click", (event) => {
        if (event.target === detailModal) closeModal(detailModal);
      });
    }

    document.getElementById("presensiList").addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      if (button.dataset.action === "detail") {
        await openDetailModal(button.dataset.edukator);
      }
    });

    const searchInput = document.getElementById("presensiSearch");
    const monthInput = document.getElementById("presensiMonth");
    const now = new Date();
    state.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (monthInput) monthInput.value = state.month;

    const loadSummary = async () => {
      const rows = await fetchJson(
        `/api/presensi/summary?month=${encodeURIComponent(state.month)}&search=${encodeURIComponent(
          state.search
        )}`
      );
      renderList(rows || []);
    };

    if (searchInput) {
      searchInput.addEventListener("input", async (event) => {
        state.search = event.target.value.trim();
        await loadSummary();
      });
    }

    if (monthInput) {
      monthInput.addEventListener("change", async (event) => {
        state.month = event.target.value;
        await loadSummary();
      });
    }

    try {
      await loadSummary();
    } catch (err) {
      console.error(err);
      renderList([]);
    }
  };

  init();
})();
