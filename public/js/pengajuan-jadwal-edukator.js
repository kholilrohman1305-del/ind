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
      menunggu: '<span class="edu-badge warn">Menunggu</span>',
      disetujui: '<span class="edu-badge good">Disetujui</span>',
      ditolak: '<span class="edu-badge bad">Ditolak</span>',
    };
    return badges[status] || status;
  };

  const getTipeBadge = (tipe) => {
    if (tipe === "reschedule") {
      return '<span class="edu-badge info">Reschedule</span>';
    }
    return '<span class="edu-badge purple">Izin</span>';
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

  // Modal functions. Pakai classList (bukan inline style) supaya konsisten
  // dengan pola modal lain di aplikasi ini — sebagian file CSS lama masih
  // mendefinisikan `.hidden { display: none !important; }` secara global,
  // yang akan mengalahkan `style.display` inline dan membuat modal terlihat
  // tidak merespons walau event click-nya sebenarnya berjalan.
  const openModal = () => {
    const modal = document.getElementById("pengajuanModal");
    if (modal) {
      modal.classList.remove("hidden");
    }
  };

  const closeModal = () => {
    const modal = document.getElementById("pengajuanModal");
    if (modal) {
      modal.classList.add("hidden");
      resetForm();
    }
  };

  const resetForm = () => {
    const form = document.getElementById("pengajuanForm");
    if (form) form.reset();

    const rescheduleFields = document.getElementById("rescheduleFields");
    if (rescheduleFields) rescheduleFields.classList.add("hidden");

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
          rescheduleFields.classList.remove("hidden");
          document.getElementById("tanggal_usulan").required = true;
          document.getElementById("jam_mulai_usulan").required = true;
          document.getElementById("jam_selesai_usulan").required = true;

          // Set minimal tanggal ke hari ini
          const today = new Date().toISOString().split("T")[0];
          document.getElementById("tanggal_usulan").min = today;
        } else {
          rescheduleFields.classList.add("hidden");
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
            <div style="margin-top: 8px; padding: 8px 10px; background: var(--edu-good-bg); border-radius: 10px; font-size: 12px; color: var(--edu-good);">
              <b>Usulan:</b> ${tanggalUsulan} | ${jamUsulan}
            </div>
          `;
        }

        const createdAt = formatDate(p.created_at);
        const catatanAdmin = p.catatan_admin
          ? `<div style="margin-top: 8px; padding: 8px 10px; background: var(--edu-warn-bg); border-radius: 10px; font-size: 12px; color: #92400e;"><b>Catatan Admin:</b> ${p.catatan_admin}</div>`
          : "";

        const canCancel = p.status === PENGAJUAN_STATUS.MENUNGGU;

        return `
          <div class="edu-card" style="padding: 14px; display:flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
              <div style="flex: 1; min-width: 0;">
                <div class="edu-list-title" style="white-space: normal;">${title}</div>
                <div class="edu-list-sub">Jadwal: ${tanggalAsal} | ${jamAsal}</div>
                <div class="edu-list-sub" style="margin-top: 4px;">Alasan: ${p.alasan}</div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end; flex-shrink: 0;">
                ${getTipeBadge(p.tipe)}
                ${getStatusBadge(p.status)}
              </div>
            </div>
            ${usulanInfo}
            ${catatanAdmin}
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px; padding-top: 8px; border-top: 1px solid var(--edu-line);">
              <span style="font-size: 11px; color: var(--edu-ink-mute);">Diajukan: ${createdAt}</span>
              ${canCancel ? `<button type="button" class="edu-btn-ghost" onclick="window.cancelPengajuan(${p.id})" style="width:auto;font-size: 11px; padding: 5px 12px; color: var(--edu-bad); background: var(--edu-bad-bg);">Batalkan</button>` : ""}
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
