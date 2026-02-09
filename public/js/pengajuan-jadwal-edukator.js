(() => {
  const { PENGAJUAN_STATUS } = window.APP_CONSTANTS;

  const pengajuanState = {
    list: [],
    statusFilter: "",
  };

  const fetchJson = async (url, options = {}) => {
    const requester = window.api?.request || fetch;
    const res = await requester(url, { credentials: "same-origin", ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Permintaan gagal.");
    }
    return data && data.success ? data.data : data;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  };

  const formatTime = (time) => {
    if (!time) return "-";
    return time.slice(0, 5);
  };

  const getStatusBadge = (status) => {
    const badges = {
      menunggu: '<span class="status-pill" style="background: #fef3c7; color: #92400e;">Menunggu</span>',
      disetujui: '<span class="status-pill" style="background: #d1fae5; color: #065f46;">Disetujui</span>',
      ditolak: '<span class="status-pill" style="background: #fee2e2; color: #991b1b;">Ditolak</span>',
    };
    return badges[status] || status;
  };

  const getTipeBadge = (tipe) => {
    if (tipe === "reschedule") {
      return '<span class="status-pill" style="background: #e0e7ff; color: #3730a3;">Reschedule</span>';
    }
    return '<span class="status-pill" style="background: #fce7f3; color: #9d174d;">Izin</span>';
  };

  // Tab switching
  const initTabs = () => {
    const tabBtns = document.querySelectorAll(".tab-btn-jadwal");
    const tabContents = document.querySelectorAll(".tab-content-jadwal");

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.target;

        tabBtns.forEach((b) => b.classList.remove("active"));
        tabContents.forEach((c) => c.classList.remove("active"));

        btn.classList.add("active");
        const targetEl = document.getElementById(target);
        if (targetEl) targetEl.classList.add("active");

        // Load pengajuan list when tab is clicked
        if (target === "tab-pengajuan-view") {
          loadPengajuanList();
        }
      });
    });
  };

  // Modal functions
  const openModal = () => {
    const modal = document.getElementById("pengajuanModal");
    if (modal) {
      modal.style.display = "flex";
    }
  };

  const closeModal = () => {
    const modal = document.getElementById("pengajuanModal");
    if (modal) {
      modal.style.display = "none";
      resetForm();
    }
  };

  const resetForm = () => {
    const form = document.getElementById("pengajuanForm");
    if (form) form.reset();

    const rescheduleFields = document.getElementById("rescheduleFields");
    if (rescheduleFields) rescheduleFields.style.display = "none";

    const counter = document.getElementById("alasanCounter");
    if (counter) counter.textContent = "0";
  };

  // Open modal with jadwal data
  window.openPengajuanModal = (jadwalId, jadwalData) => {
    const jadwalIdInput = document.getElementById("pengajuan_jadwal_id");
    const jadwalInfo = document.getElementById("pengajuan_jadwal_info");

    if (jadwalIdInput) jadwalIdInput.value = jadwalId;

    if (jadwalInfo && jadwalData) {
      const title = jadwalData.siswa_nama
        ? `${jadwalData.siswa_nama} - ${jadwalData.mapel_nama || jadwalData.program_nama || "-"}`
        : `${jadwalData.kelas_nama || jadwalData.program_nama || "-"} - ${jadwalData.mapel_nama || "-"}`;

      const tanggal = formatDate(jadwalData.tanggal);
      const jam = jadwalData.jam_mulai && jadwalData.jam_selesai
        ? `${formatTime(jadwalData.jam_mulai)} - ${formatTime(jadwalData.jam_selesai)}`
        : "-";

      jadwalInfo.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
        <div style="font-size: 13px; color: #64748b;">${tanggal} | ${jam}</div>
      `;
    }

    openModal();
  };

  // Toggle reschedule fields based on tipe
  const initTipeToggle = () => {
    const tipeSelect = document.getElementById("pengajuan_tipe");
    const rescheduleFields = document.getElementById("rescheduleFields");

    if (tipeSelect && rescheduleFields) {
      tipeSelect.addEventListener("change", () => {
        if (tipeSelect.value === "reschedule") {
          rescheduleFields.style.display = "block";
          document.getElementById("tanggal_usulan").required = true;
          document.getElementById("jam_mulai_usulan").required = true;
          document.getElementById("jam_selesai_usulan").required = true;

          // Set minimal tanggal ke hari ini
          const today = new Date().toISOString().split("T")[0];
          document.getElementById("tanggal_usulan").min = today;
        } else {
          rescheduleFields.style.display = "none";
          document.getElementById("tanggal_usulan").required = false;
          document.getElementById("jam_mulai_usulan").required = false;
          document.getElementById("jam_selesai_usulan").required = false;
        }
      });
    }
  };

  // Character counter for alasan
  const initAlasanCounter = () => {
    const alasanInput = document.getElementById("pengajuan_alasan");
    const counter = document.getElementById("alasanCounter");

    if (alasanInput && counter) {
      alasanInput.addEventListener("input", () => {
        counter.textContent = alasanInput.value.length;
      });
    }
  };

  // Submit pengajuan
  const handleSubmit = async (e) => {
    e.preventDefault();

    const jadwalId = document.getElementById("pengajuan_jadwal_id").value;
    const tipe = document.getElementById("pengajuan_tipe").value;
    const alasan = document.getElementById("pengajuan_alasan").value.trim();

    if (!jadwalId || !tipe || !alasan) {
      alert("Mohon lengkapi semua field yang wajib diisi.");
      return;
    }

    const payload = {
      jadwal_id: parseInt(jadwalId, 10),
      tipe,
      alasan,
    };

    if (tipe === "reschedule") {
      const tanggal = document.getElementById("tanggal_usulan").value;
      const jamMulai = document.getElementById("jam_mulai_usulan").value;
      const jamSelesai = document.getElementById("jam_selesai_usulan").value;

      // Validasi tanggal tidak boleh lewat
      const inputDate = new Date(tanggal);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (inputDate < today) {
        alert("Tanggal usulan tidak boleh hari yang sudah lewat.");
        return;
      }

      if (!tanggal || !jamMulai || !jamSelesai) {
        alert("Mohon lengkapi tanggal dan jam usulan untuk reschedule.");
        return;
      }

      payload.tanggal_usulan = tanggal;
      payload.jam_mulai_usulan = jamMulai;
      payload.jam_selesai_usulan = jamSelesai;
    }

    try {
      await fetchJson("/api/pengajuan-jadwal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      alert("Pengajuan berhasil dikirim!");
      closeModal();

      // Switch to pengajuan tab and reload
      const pengajuanTab = document.querySelector('[data-target="tab-pengajuan-view"]');
      if (pengajuanTab) pengajuanTab.click();
    } catch (err) {
      alert("Gagal mengirim pengajuan: " + err.message);
    }
  };

  // Load pengajuan list
  const loadPengajuanList = async () => {
    const list = document.getElementById("pengajuanList");
    const empty = document.getElementById("pengajuanEmpty");

    if (!list || !empty) return;

    try {
      const data = await fetchJson("/api/pengajuan-jadwal");
      pengajuanState.list = data || [];
      renderPengajuanList();
    } catch (err) {
      console.error(err);
      list.innerHTML = "";
      empty.style.display = "block";
      empty.textContent = "Gagal memuat data pengajuan.";
    }
  };

  const renderPengajuanList = () => {
    const list = document.getElementById("pengajuanList");
    const empty = document.getElementById("pengajuanEmpty");

    if (!list || !empty) return;

    let filtered = pengajuanState.list;
    if (pengajuanState.statusFilter) {
      filtered = filtered.filter((p) => p.status === pengajuanState.statusFilter);
    }

    if (!filtered.length) {
      list.innerHTML = "";
      empty.style.display = "block";
      return;
    }

    empty.style.display = "none";
    list.innerHTML = filtered
      .map((p) => {
        const title = p.siswa_nama
          ? `${p.siswa_nama} - ${p.mapel_nama || p.program_nama || "-"}`
          : `${p.kelas_nama || p.program_nama || "-"} - ${p.mapel_nama || "-"}`;

        const tanggalAsal = formatDate(p.tanggal_asal);
        const jamAsal = p.jam_mulai_asal && p.jam_selesai_asal
          ? `${formatTime(p.jam_mulai_asal)} - ${formatTime(p.jam_selesai_asal)}`
          : "-";

        let usulanInfo = "";
        if (p.tipe === "reschedule" && p.tanggal_usulan) {
          const tanggalUsulan = formatDate(p.tanggal_usulan);
          const jamUsulan = p.jam_mulai_usulan && p.jam_selesai_usulan
            ? `${formatTime(p.jam_mulai_usulan)} - ${formatTime(p.jam_selesai_usulan)}`
            : "-";
          usulanInfo = `
            <div style="margin-top: 8px; padding: 8px; background: #f0fdf4; border-radius: 6px; font-size: 12px;">
              <span style="color: #15803d; font-weight: 600;">Usulan:</span> ${tanggalUsulan} | ${jamUsulan}
            </div>
          `;
        }

        const createdAt = formatDate(p.created_at);
        const catatanAdmin = p.catatan_admin
          ? `<div style="margin-top: 8px; padding: 8px; background: #fef3c7; border-radius: 6px; font-size: 12px;"><span style="font-weight: 600;">Catatan Admin:</span> ${p.catatan_admin}</div>`
          : "";

        const canCancel = p.status === PENGAJUAN_STATUS.MENUNGGU;

        return `
          <div class="list-item" style="flex-direction: column; align-items: stretch; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div style="flex: 1;">
                <div class="list-title">${title}</div>
                <div class="list-sub">Jadwal: ${tanggalAsal} | ${jamAsal}</div>
                <div class="list-sub" style="margin-top: 4px;">Alasan: ${p.alasan}</div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;">
                ${getTipeBadge(p.tipe)}
                ${getStatusBadge(p.status)}
              </div>
            </div>
            ${usulanInfo}
            ${catatanAdmin}
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
              <span style="font-size: 11px; color: #94a3b8;">Diajukan: ${createdAt}</span>
              ${canCancel ? `<button class="ghost-button" onclick="window.cancelPengajuan(${p.id})" style="font-size: 11px; padding: 4px 10px; color: #dc2626;">Batalkan</button>` : ""}
            </div>
          </div>
        `;
      })
      .join("");
  };

  // Cancel pengajuan
  window.cancelPengajuan = async (id) => {
    if (!confirm("Yakin ingin membatalkan pengajuan ini?")) return;

    try {
      await fetchJson(`/api/pengajuan-jadwal/${id}`, {
        method: "DELETE",
      });
      alert("Pengajuan berhasil dibatalkan.");
      loadPengajuanList();
    } catch (err) {
      alert("Gagal membatalkan: " + err.message);
    }
  };

  // Status filter
  const initStatusFilter = () => {
    const filter = document.getElementById("pengajuanStatusFilter");
    if (filter) {
      filter.addEventListener("change", () => {
        pengajuanState.statusFilter = filter.value;
        renderPengajuanList();
      });
    }
  };

  // Modal event listeners
  const initModalEvents = () => {
    const closeBtn = document.getElementById("closePengajuanModal");
    const cancelBtn = document.getElementById("cancelPengajuanModal");
    const modal = document.getElementById("pengajuanModal");
    const form = document.getElementById("pengajuanForm");

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });
    }

    if (form) form.addEventListener("submit", handleSubmit);
  };

  // Initialize
  const init = () => {
    initTabs();
    initModalEvents();
    initTipeToggle();
    initAlasanCounter();
    initStatusFilter();
  };

  init();
})();
