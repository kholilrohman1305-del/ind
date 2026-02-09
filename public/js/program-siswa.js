(() => {
  const requester = window.api?.request || fetch;
  const { ENROLLMENT_STATUS, TIPE_LES } = window.APP_CONSTANTS;

  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabAktif = document.getElementById("tab-aktif");
  const tabSelesai = document.getElementById("tab-selesai");
  const emptyEl = document.getElementById("programEmpty");
  const searchInput = document.getElementById("programSearch");

  // Riwayat Modal Elements
  const riwayatModal = document.getElementById("riwayatModal");
  const riwayatRows = document.getElementById("riwayatRows");
  const riwayatEmpty = document.getElementById("riwayatEmpty");
  const riwayatLabel = document.getElementById("riwayatProgramLabel");
  const closeRiwayat = document.getElementById("closeRiwayatModal");

  // Renew Modal Elements
  const renewModal = document.getElementById("renewModal");
  const renewProgramLabel = document.getElementById("renewProgramLabel");
  const renewStartDate = document.getElementById("renewStartDate");
  const confirmRenewBtn = document.getElementById("confirmRenewBtn");
  const cancelRenewBtn = document.getElementById("cancelRenewBtn");
  const closeRenewModal = document.getElementById("closeRenewModal");
  const renewBtnText = document.getElementById("renewBtnText");
  const renewBtnSpinner = document.getElementById("renewBtnSpinner");

  // Success Modal Elements
  const successModal = document.getElementById("successModal");
  const successMessage = document.getElementById("successMessage");
  const successDetails = document.getElementById("successDetails");
  const successTagihan = document.getElementById("successTagihan");
  const successJadwal = document.getElementById("successJadwal");
  const closeSuccessBtn = document.getElementById("closeSuccessBtn");

  let allRows = [];
  let currentRenewProgramId = null;
  let currentRenewProgramName = "";

  const normalizeText = (value) => String(value || "").toLowerCase();

  // Status 'menunggu_jadwal' dan 'aktif' ditampilkan di tab Aktif
  const isAktif = (row) => row.status_enrollment === ENROLLMENT_STATUS.AKTIF || row.status_enrollment === ENROLLMENT_STATUS.MENUNGGU_JADWAL;
  const isSelesai = (row) => row.status_enrollment === ENROLLMENT_STATUS.SELESAI || (row.jadwal_selesai === true);

  const renderList = (rows, container, isSelesaiTab = false) => {
    if (!container) return;
    container.innerHTML = "";
    rows.forEach((row) => {
      // For selesai tab, can renew only if jadwal_selesai AND tagihan_lunas
      const canRenew = row.can_renew === true;
      const jadwalSelesai = row.jadwal_selesai === true;
      const tagihanLunas = row.tagihan_lunas === true;

      const card = document.createElement("div");
      card.className = "bg-white rounded-3xl p-4 shadow-lg border border-slate-100";

      // Status badge
      let statusBadge;
      if (row.status_enrollment === ENROLLMENT_STATUS.MENUNGGU_JADWAL) {
        statusBadge = `<span class="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-600">Menunggu Jadwal</span>`;
      } else if (row.status_enrollment === ENROLLMENT_STATUS.AKTIF && !jadwalSelesai) {
        statusBadge = `<span class="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">Aktif</span>`;
      } else if (jadwalSelesai && tagihanLunas) {
        statusBadge = `<span class="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-600">Selesai ✓</span>`;
      } else if (jadwalSelesai && !tagihanLunas) {
        statusBadge = `<span class="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-600">Selesai - Tagihan Belum Lunas</span>`;
      } else {
        statusBadge = `<span class="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-500">Non Aktif</span>`;
      }

      // Progress info
      const completedJadwal = Number(row.completed_jadwal || 0);
      const totalPertemuan = Number(row.total_pertemuan || row.jumlah_pertemuan || 0);
      let progressText;
      if (row.status_enrollment === ENROLLMENT_STATUS.MENUNGGU_JADWAL) {
        progressText = `Jadwal akan diatur oleh admin (${totalPertemuan} pertemuan)`;
      } else {
        progressText = `Pertemuan: ${completedJadwal} / ${totalPertemuan}${jadwalSelesai ? " ✓" : ""}`;
      }

      // Tagihan info for selesai tab
      let tagihanInfo = "";
      if (isSelesaiTab) {
        if (tagihanLunas) {
          tagihanInfo = `<div class="text-xs text-emerald-600 mb-1"><i class="fa-solid fa-check-circle mr-1"></i>Tagihan Lunas</div>`;
        } else {
          tagihanInfo = `<div class="text-xs text-amber-600 mb-1"><i class="fa-solid fa-exclamation-circle mr-1"></i>Tagihan Belum Lunas</div>`;
        }
      }

      // Renew button - only show on selesai tab and only if can_renew
      let renewBtn = "";
      if (isSelesaiTab && canRenew) {
        renewBtn = `<button class="renew-btn flex-1 py-2 rounded-2xl font-semibold text-white" data-program="${row.program_id}" data-label="${row.program_nama || ""}" style="background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);">Perpanjang</button>`;
      } else if (isSelesaiTab && !canRenew) {
        // Show disabled button with reason
        if (!jadwalSelesai) {
          renewBtn = `<button class="flex-1 py-2 rounded-2xl font-semibold text-slate-400 bg-slate-100 cursor-not-allowed" disabled title="Jadwal belum selesai">Perpanjang</button>`;
        } else if (!tagihanLunas) {
          renewBtn = `<button class="flex-1 py-2 rounded-2xl font-semibold text-amber-600 bg-amber-50 cursor-not-allowed" disabled title="Tagihan belum lunas">Lunasi Dulu</button>`;
        }
      }

      card.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-slate-800">${row.program_nama || "-"}</h3>
          ${statusBadge}
        </div>
        <div class="text-xs text-slate-500 mb-2">${row.tipe_les === TIPE_LES.KELAS ? "Kelas" : "Privat"} · ${row.jenjang || "-"}</div>
        ${tagihanInfo}
        <div class="text-xs text-slate-500 mb-3">${progressText}</div>
        <div class="flex gap-2">
          <button class="history-btn flex-1 py-2 rounded-2xl font-semibold text-slate-600 border border-slate-200" data-program="${row.program_id}" data-label="${row.program_nama || ""}">Riwayat Kehadiran</button>
          ${renewBtn}
        </div>
      `;
      container.appendChild(card);
    });
  };

  const applyFilters = () => {
    const q = normalizeText(searchInput?.value || "");
    const filtered = allRows.filter((row) =>
      normalizeText(row.program_nama).includes(q) ||
      normalizeText(row.jenjang).includes(q) ||
      normalizeText(row.tipe_les).includes(q)
    );

    // Aktif: enrollment aktif AND jadwal belum selesai
    const aktifRows = filtered.filter((row) => isAktif(row) && !row.jadwal_selesai);

    // Selesai: jadwal sudah selesai (either enrollment selesai or jadwal_selesai true)
    const selesaiRows = filtered.filter((row) => row.jadwal_selesai || row.status_enrollment === ENROLLMENT_STATUS.SELESAI);

    if (aktifRows.length || selesaiRows.length) {
      if (emptyEl) emptyEl.classList.add("hidden");
    } else if (emptyEl) {
      emptyEl.classList.remove("hidden");
    }

    renderList(aktifRows, tabAktif, false);
    renderList(selesaiRows, tabSelesai, true);
  };

  const bindTabs = () => {
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const target = btn.dataset.target;
        if (target === "tab-aktif") {
          tabAktif?.classList.remove("hidden");
          tabSelesai?.classList.add("hidden");
        } else {
          tabSelesai?.classList.remove("hidden");
          tabAktif?.classList.add("hidden");
        }
      });
    });
  };

  // Open Renew Modal
  const openRenewModal = (programId, programName) => {
    currentRenewProgramId = programId;
    currentRenewProgramName = programName;
    if (renewProgramLabel) renewProgramLabel.textContent = programName;
    if (renewStartDate) {
      const today = new Date().toISOString().slice(0, 10);
      renewStartDate.value = today;
    }
    if (renewModal) renewModal.classList.remove("hidden");
  };

  // Close Renew Modal
  const closeRenewModalFn = () => {
    if (renewModal) renewModal.classList.add("hidden");
    currentRenewProgramId = null;
    currentRenewProgramName = "";
  };

  // Show Success Modal
  const showSuccessModal = (data) => {
    if (successMessage) {
      successMessage.textContent = data.message || "Program berhasil diperpanjang.";
    }
    if (successDetails) {
      successDetails.classList.remove("hidden");
    }
    if (successTagihan) {
      successTagihan.textContent = data.tagihan_created ? "✓ Dibuat" : "-";
      successTagihan.className = "font-semibold text-emerald-600";
    }
    if (successJadwal) {
      if (data.jadwal_created && data.jadwal_count > 0) {
        successJadwal.textContent = `✓ ${data.jadwal_count} jadwal`;
        successJadwal.className = "font-semibold text-emerald-600";
      } else {
        successJadwal.textContent = "Manual oleh admin";
        successJadwal.className = "font-semibold text-amber-600";
      }
    }
    if (successModal) successModal.classList.remove("hidden");
  };

  // Close Success Modal
  const closeSuccessModalFn = () => {
    if (successModal) successModal.classList.add("hidden");
  };

  // Perform Renewal
  const performRenewal = async () => {
    if (!currentRenewProgramId) return;

    if (confirmRenewBtn) confirmRenewBtn.disabled = true;
    if (renewBtnText) renewBtnText.textContent = "Memproses...";
    if (renewBtnSpinner) renewBtnSpinner.classList.remove("hidden");

    try {
      const startDate = renewStartDate?.value || null;
          const res = await requester("/api/siswa/renew-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          program_id: Number(currentRenewProgramId),
          start_date: startDate
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memperpanjang program.");
      }

      closeRenewModalFn();
      showSuccessModal(json.data || {});
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      if (confirmRenewBtn) confirmRenewBtn.disabled = false;
      if (renewBtnText) renewBtnText.textContent = "Perpanjang";
      if (renewBtnSpinner) renewBtnSpinner.classList.add("hidden");
    }
  };

  const bindActions = () => {
    document.addEventListener("click", async (event) => {
      // Renew button click - open modal
      const renewButton = event.target.closest(".renew-btn");
      if (renewButton) {
        const programId = renewButton.dataset.program;
        const programName = renewButton.dataset.label || "Program";
        if (!programId) return;
        openRenewModal(programId, programName);
        return;
      }

      // History button click
      const historyBtn = event.target.closest(".history-btn");
      if (!historyBtn) return;
      const programId = historyBtn.dataset.program;
      const label = historyBtn.dataset.label || "Program";
      if (!programId) return;
      if (riwayatLabel) riwayatLabel.textContent = label;
      if (riwayatRows) riwayatRows.innerHTML = "";
      if (riwayatEmpty) riwayatEmpty.classList.add("hidden");
      if (riwayatModal) riwayatModal.classList.remove("hidden");

      const formatDate = (value) => {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(date);
      };

      const formatTime = (value) => {
        if (!value) return "--:--";
        return String(value).slice(0, 5);
      };

      try {
        const res = await requester(`/api/presensi/siswa/program/${programId}`, { credentials: "same-origin" });
        const json = await res.json();
        const rows = json?.data || [];
        if (!rows.length) {
          if (riwayatEmpty) riwayatEmpty.classList.remove("hidden");
          return;
        }
        rows.forEach((row) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td class="py-2 font-semibold text-slate-700">${formatDate(row.tanggal)}</td>
            <td class="py-2 text-slate-600">${row.mapel_nama || "-"}</td>
            <td class="py-2 text-slate-500">${formatTime(row.jam_mulai)} - ${formatTime(row.jam_selesai)}</td>
            <td class="py-2 text-center">
              <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shadow-sm ${row.tipe_les === TIPE_LES.KELAS ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-orange-50 text-orange-600 border-orange-100"}">
                ${row.tipe_les === TIPE_LES.KELAS ? "Kelas" : "Privat"}
              </span>
            </td>
          `;
          riwayatRows.appendChild(tr);
        });
      } catch (err) {
        if (riwayatEmpty) riwayatEmpty.classList.remove("hidden");
      }
    });
  };

  const bindModalClose = () => {
    // Riwayat modal close
    if (closeRiwayat) {
      closeRiwayat.addEventListener("click", () => riwayatModal?.classList.add("hidden"));
    }
    if (riwayatModal) {
      riwayatModal.addEventListener("click", (event) => {
        if (event.target?.dataset?.close === "riwayat") {
          riwayatModal.classList.add("hidden");
        }
      });
    }

    // Renew modal close
    if (closeRenewModal) {
      closeRenewModal.addEventListener("click", closeRenewModalFn);
    }
    if (cancelRenewBtn) {
      cancelRenewBtn.addEventListener("click", closeRenewModalFn);
    }
    if (renewModal) {
      renewModal.addEventListener("click", (event) => {
        if (event.target?.dataset?.close === "renew") {
          closeRenewModalFn();
        }
      });
    }

    // Confirm renew button
    if (confirmRenewBtn) {
      confirmRenewBtn.addEventListener("click", performRenewal);
    }

    // Success modal close
    if (closeSuccessBtn) {
      closeSuccessBtn.addEventListener("click", closeSuccessModalFn);
    }
  };

  const loadData = async () => {
    try {
      // Ambil program-program yang terkait dengan siswa ini
      const res = await requester("/api/siswa/programs", { credentials: "same-origin" });
      const json = await res.json();
      allRows = json?.data || [];
      applyFilters();
    } catch (err) {
      allRows = [];
      applyFilters();
    }
  };

  const init = () => {
    bindTabs();
    bindActions();
    bindModalClose();
    if (searchInput) {
      searchInput.addEventListener("input", applyFilters);
    }
    loadData();
  };

  init();
})();
