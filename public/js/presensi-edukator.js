(() => {
  const { TIPE_LES, JADWAL_STATUS, PRESENSI_STATUS } = window.APP_CONSTANTS;

  const state = {
    privat: [],
    kelas: [],
    search: "",
    pendingId: null,
    pendingTipe: null, // 'privat' or 'kelas'
    kelasSiswa: [], // students in current kelas
    activeTab: "privat",
    date: "",
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

  // Helper tanggal format Indonesia
  const formatDate = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(parsed);
  };

  const formatTime = (row) => {
    if (!row.jam_mulai) return "-";
    const s = row.jam_mulai.substring(0, 5);
    const e = row.jam_selesai ? row.jam_selesai.substring(0, 5) : "";
    return e ? `${s} - ${e}` : s;
  };

  const buildTitle = (row) => {
    const siswa = row.siswa_nama || row.kelas_nama || "";
    const mapel = row.mapel_nama || row.program_nama || "";
    return `${siswa} ${mapel}`.toLowerCase();
  };

  const toSafeDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const toDateKey = (value) => {
    const date = toSafeDate(value);
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const renderList = (rows, list) => {
    list.innerHTML = "";

    if (!rows || !rows.length) {
      return;
    }

    rows.forEach((row) => {
      const card = document.createElement("div");
      card.className = "bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group hover:-translate-y-1";

      const isDone = row.status_jadwal === JADWAL_STATUS.COMPLETED;
      const pertemuan = row.pertemuan_ke ? `Pertemuan ${row.pertemuan_ke}` : "-";
      const isKelas = row.tipe_les === TIPE_LES.KELAS;

      const btnClass = isDone
        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 hover:shadow-emerald-300 active:scale-[0.98]";

      const btnText = isDone ? "Sudah Absen" : "Absen Sekarang";
      const iconBtn = isDone
        ? `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`
        : `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;

      card.innerHTML = `
        <div class="flex justify-between items-start mb-4">
          <div>
            <span class="inline-block px-2.5 py-1 bg-violet-50 text-violet-600 text-[10px] font-bold uppercase tracking-wider rounded-md mb-2 border border-violet-100">
                ${row.program_nama || 'Program'}
            </span>
            <h3 class="font-bold text-lg text-slate-800 group-hover:text-emerald-600 transition-colors line-clamp-1" title="${row.mapel_nama}">
                ${row.mapel_nama || '-'}
            </h3>
          </div>
          <div class="text-right">
            <div class="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 whitespace-nowrap">
               ${pertemuan}
            </div>
          </div>
        </div>

        <div class="space-y-3 mb-6">
           <div class="flex items-center gap-3 text-sm text-slate-600">
              <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                 ${isKelas
                   ? `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>`
                   : `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>`}
              </div>
              <span class="font-medium truncate">${row.siswa_nama || row.kelas_nama || '-'}</span>
           </div>

           <div class="flex items-center gap-3 text-sm text-slate-600">
              <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                 <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div class="flex flex-col">
                 <span class="font-bold text-slate-700">${formatTime(row)}</span>
                 <span class="text-xs text-slate-400">${formatDate(row.tanggal)}</span>
              </div>
           </div>
        </div>

        <button
            class="w-full py-3 px-4 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${btnClass}"
            data-id="${row.id}"
            data-tipe="${row.tipe_les || 'privat'}"
            ${isDone ? "disabled" : ""}>
            ${iconBtn}
            ${btnText}
        </button>
      `;
      list.appendChild(card);
    });
  };

  const applyFilter = () => {
    const keyword = state.search.toLowerCase();
    const source = state.activeTab === TIPE_LES.KELAS ? state.kelas : state.privat;

    const listPrivat = document.getElementById("jadwalPrivat");
    const listKelas = document.getElementById("jadwalKelas");
    const empty = document.getElementById("jadwalEmpty");

    if (!state.date) {
      if (listPrivat) listPrivat.innerHTML = "";
      if (listKelas) listKelas.innerHTML = "";
      if (empty) {
        empty.classList.remove("hidden");
        empty.classList.add("flex");
      }
      if (state.activeTab === TIPE_LES.KELAS) {
        listPrivat?.classList.add("hidden");
        listKelas?.classList.remove("hidden");
      } else {
        listKelas?.classList.add("hidden");
        listPrivat?.classList.remove("hidden");
      }
      return;
    }

    const filtered = source.filter((row) => {
      const title = buildTitle(row);
      if (!title.includes(keyword)) {
        return false;
      }
      if (state.date) {
        const rowKey = toDateKey(row.tanggal);
        if (rowKey !== state.date) {
          return false;
        }
      }
      return true;
    });

    if (state.activeTab === TIPE_LES.KELAS) {
      listPrivat.classList.add("hidden");
      listKelas.classList.remove("hidden");
      renderList(filtered, listKelas);
    } else {
      listKelas.classList.add("hidden");
      listPrivat.classList.remove("hidden");
      renderList(filtered, listPrivat);
    }

    if (empty) {
      if (filtered.length === 0) {
        empty.classList.remove("hidden");
        empty.classList.add("flex");
      } else {
        empty.classList.add("hidden");
        empty.classList.remove("flex");
      }
    }
  };

  const load = async () => {
    const [privat, kelas] = await Promise.all([
      fetchJson("/api/jadwal?tipe=privat"),
      fetchJson("/api/jadwal?tipe=kelas"),
    ]);

    const sortRows = (rows) =>
      (rows || [])
        .filter((row) => row.tanggal)
        .sort((a, b) => {
          const aKey = `${a.tanggal || ""} ${a.jam_mulai || ""}`;
          const bKey = `${b.tanggal || ""} ${b.jam_mulai || ""}`;
          return aKey.localeCompare(bKey);
        });

    state.privat = sortRows(privat);
    state.kelas = sortRows(kelas);
    applyFilter();
  };

  const getLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Browser tidak mendukung lokasi."));
        return;
      }
      if (!window.isSecureContext && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
        reject(new Error("Lokasi memerlukan HTTPS atau localhost."));
        return;
      }

      const requestPosition = () =>
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          },
          (err) => reject(err),
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
        );

      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions
          .query({ name: "geolocation" })
          .then((status) => {
            if (status.state === "denied") {
              reject(new Error("Izin lokasi ditolak. Aktifkan lokasi di browser."));
              return;
            }
            requestPosition();
          })
          .catch(() => requestPosition());
      } else {
        requestPosition();
      }
    });

  // Handle absen for privat (simple)
  const handleAbsenPrivat = async (jadwalId, materi) => {
    let payload = {};
    try {
      const location = await getLocation();
      payload = location;
    } catch (err) {
      const detail = err && err.message ? err.message : "Lokasi tidak tersedia.";
      if (window.notifyWarning) {
        window.notifyWarning("Lokasi tidak tersedia", detail);
      }
      const proceed = window.confirm(
        "Lokasi tidak tersedia. Lanjutkan absensi tanpa lokasi?"
      );
      if (!proceed) return;
    }

    await fetchJson(`/api/presensi/absen/${jadwalId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, materi }),
    });

    if (window.toast.success) {
      window.toast.success("Absensi tersimpan", "Status jadwal diperbarui.");
    } else {
      alert("Absensi berhasil disimpan!");
    }
    await load();
  };

  // Handle absen for kelas (with student attendance list)
  const handleAbsenKelas = async (jadwalId, materi, kehadiran) => {
    let payload = {};
    try {
      const location = await getLocation();
      payload = location;
    } catch (err) {
      const detail = err && err.message ? err.message : "Lokasi tidak tersedia.";
      if (window.notifyWarning) {
        window.notifyWarning("Lokasi tidak tersedia", detail);
      }
      const proceed = window.confirm(
        "Lokasi tidak tersedia. Lanjutkan absensi tanpa lokasi?"
      );
      if (!proceed) return;
    }

    await fetchJson(`/api/presensi/absen/${jadwalId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, materi, kehadiran }),
    });

    if (window.toast.success) {
      window.toast.success("Absensi tersimpan", "Status jadwal dan kehadiran siswa diperbarui.");
    } else {
      alert("Absensi berhasil disimpan!");
    }
    await load();
  };

  // Render student list in kelas modal
  const renderKelasSiswaList = () => {
    const container = document.getElementById("kelasSiswaList");
    if (!container) return;

    if (!state.kelasSiswa || state.kelasSiswa.length === 0) {
      container.innerHTML = '<div class="text-center py-4 text-slate-400 text-sm">Tidak ada siswa terdaftar di kelas ini.</div>';
      return;
    }

    container.innerHTML = state.kelasSiswa.map((siswa, index) => `
      <div class="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-emerald-200 transition-colors">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
            ${siswa.siswa_nama ? siswa.siswa_nama.substring(0, 2).toUpperCase() : '??'}
          </div>
          <div>
            <div class="font-medium text-sm text-slate-800">${siswa.siswa_nama || 'Tanpa Nama'}</div>
            <div class="text-[10px] text-slate-400">${siswa.program_nama || '-'}</div>
          </div>
        </div>
        <div class="flex gap-1">
          <label class="cursor-pointer">
            <input type="radio" name="kehadiran_${siswa.siswa_id}" value="hadir" class="hidden peer kehadiran-radio" data-siswa-id="${siswa.siswa_id}" checked>
            <span class="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all
                         peer-checked:bg-emerald-500 peer-checked:text-white peer-checked:border-emerald-500
                         bg-white text-slate-500 border-slate-200 hover:border-emerald-300">
              Hadir
            </span>
          </label>
          <label class="cursor-pointer">
            <input type="radio" name="kehadiran_${siswa.siswa_id}" value="tidak_hadir" class="hidden peer kehadiran-radio" data-siswa-id="${siswa.siswa_id}">
            <span class="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all
                         peer-checked:bg-rose-500 peer-checked:text-white peer-checked:border-rose-500
                         bg-white text-slate-500 border-slate-200 hover:border-rose-300">
              Tidak Hadir
            </span>
          </label>
          <label class="cursor-pointer">
            <input type="radio" name="kehadiran_${siswa.siswa_id}" value="izin" class="hidden peer kehadiran-radio" data-siswa-id="${siswa.siswa_id}">
            <span class="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all
                         peer-checked:bg-amber-500 peer-checked:text-white peer-checked:border-amber-500
                         bg-white text-slate-500 border-slate-200 hover:border-amber-300">
              Izin
            </span>
          </label>
        </div>
      </div>
    `).join('');

    // Add event listeners to update counts
    container.querySelectorAll('.kehadiran-radio').forEach(radio => {
      radio.addEventListener('change', updateKehadiranCounts);
    });

    updateKehadiranCounts();
  };

  // Update attendance counts in kelas modal
  const updateKehadiranCounts = () => {
    const totalEl = document.getElementById("totalSiswaCount");
    const hadirEl = document.getElementById("hadirCount");
    const tidakHadirEl = document.getElementById("tidakHadirCount");

    const total = state.kelasSiswa.length;
    let hadir = 0;
    let tidakHadir = 0;

    state.kelasSiswa.forEach(siswa => {
      const checked = document.querySelector(`input[name="kehadiran_${siswa.siswa_id}"]:checked`);
      if (checked) {
        if (checked.value === PRESENSI_STATUS.HADIR) hadir++;
        else if (checked.value === PRESENSI_STATUS.TIDAK_HADIR || checked.value === PRESENSI_STATUS.IZIN) tidakHadir++;
      }
    });

    if (totalEl) totalEl.textContent = total;
    if (hadirEl) hadirEl.textContent = hadir;
    if (tidakHadirEl) tidakHadirEl.textContent = tidakHadir;
  };

  // Get kehadiran data from kelas modal
  const getKehadiranData = () => {
    return state.kelasSiswa.map(siswa => {
      const checked = document.querySelector(`input[name="kehadiran_${siswa.siswa_id}"]:checked`);
      return {
        siswaId: siswa.siswa_id,
        status: checked ? checked.value : PRESENSI_STATUS.HADIR
      };
    });
  };

  const init = async () => {
    const searchInput = document.getElementById("presensiSearch");
    const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
    const dateInput = document.getElementById("presensiDate");

    // Logic Tab Switching
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.activeTab = btn.dataset.tab || "privat";
        applyFilter();
      });
    });

    // Privat Modal Elements
    const materiModal = document.getElementById("materiModal");
    const closeMateriModal = document.getElementById("closeMateriModal");
    const cancelMateriModal = document.getElementById("cancelMateriModal");
    const submitMateriModal = document.getElementById("submitMateriModal");
    const materiInput = document.getElementById("materiInput");
    const materiError = document.getElementById("materiError");

    // Kelas Modal Elements
    const kelasModal = document.getElementById("kelasAbsenModal");
    const closeKelasModal = document.getElementById("closeKelasModal");
    const cancelKelasModal = document.getElementById("cancelKelasModal");
    const submitKelasModal = document.getElementById("submitKelasModal");
    const kelasMateriInput = document.getElementById("kelasMateriInput");
    const kelasMateriError = document.getElementById("kelasMateriError");
    const kelasNamaHeader = document.getElementById("kelasNamaHeader");
    const selectAllHadir = document.getElementById("selectAllHadir");
    const selectAllTidakHadir = document.getElementById("selectAllTidakHadir");

    if (searchInput) {
      searchInput.addEventListener("input", (event) => {
        state.search = event.target.value.trim();
        applyFilter();
      });
    }

    if (dateInput) {
      dateInput.addEventListener("change", (event) => {
        state.date = event.target.value || "";
        applyFilter();
      });
    }

    const privatList = document.getElementById("jadwalPrivat");
    const kelasList = document.getElementById("jadwalKelas");

    // Event delegation for buttons
    const handleListClick = async (event) => {
      const button = event.target.closest("button[data-id]");
      if (!button || button.disabled) return;

      const jadwalId = button.dataset.id;
      const tipe = button.dataset.tipe || 'privat';

      state.pendingId = jadwalId;
      state.pendingTipe = tipe;

      if (tipe === TIPE_LES.KELAS) {
        // Fetch students for this kelas
        try {
          const data = await fetchJson(`/api/presensi/kelas-siswa/${jadwalId}`);
          state.kelasSiswa = data.siswa || [];

          if (kelasNamaHeader) kelasNamaHeader.textContent = data.kelas_nama || 'Kelas';
          if (kelasMateriInput) kelasMateriInput.value = "";
          if (kelasMateriError) kelasMateriError.textContent = "";

          renderKelasSiswaList();

          if (kelasModal) {
            kelasModal.classList.remove("hidden");
          }
        } catch (err) {
          if (window.toast.error) {
            window.toast.error("Gagal memuat data", err.message);
          } else {
            alert("Gagal memuat data siswa: " + err.message);
          }
        }
      } else {
        // Privat - show simple materi modal
        if (materiInput) materiInput.value = "";
        if (materiError) materiError.textContent = "";
        if (materiModal) {
          materiModal.classList.remove("hidden");
        }
      }
    };

    if (privatList) privatList.addEventListener("click", handleListClick);
    if (kelasList) kelasList.addEventListener("click", handleListClick);

    // Close Privat Modal
    const closePrivatModal = () => {
      if (materiModal) {
        materiModal.classList.add("hidden");
      }
      state.pendingId = null;
      state.pendingTipe = null;
    };

    if (closeMateriModal) closeMateriModal.addEventListener("click", closePrivatModal);
    if (cancelMateriModal) cancelMateriModal.addEventListener("click", closePrivatModal);

    if (materiModal) {
      materiModal.addEventListener("click", (event) => {
        if (event.target === materiModal || event.target.classList.contains('absolute')) {
          closePrivatModal();
        }
      });
    }

    // Submit Privat Modal
    if (submitMateriModal) {
      submitMateriModal.addEventListener("click", async () => {
        if (!materiInput) return;
        const materi = materiInput.value.trim();
        if (!materi) {
          if (materiError) materiError.textContent = "Materi wajib diisi.";
          return;
        }

        const originalText = submitMateriModal.innerText;
        submitMateriModal.innerText = "Menyimpan...";
        submitMateriModal.disabled = true;

        try {
          await handleAbsenPrivat(state.pendingId, materi);
          closePrivatModal();
        } catch (err) {
          if (materiError) materiError.textContent = err.message;
        } finally {
          submitMateriModal.innerText = originalText;
          submitMateriModal.disabled = false;
        }
      });
    }

    // Close Kelas Modal
    const closeKelasModalFn = () => {
      if (kelasModal) {
        kelasModal.classList.add("hidden");
      }
      state.pendingId = null;
      state.pendingTipe = null;
      state.kelasSiswa = [];
    };

    if (closeKelasModal) closeKelasModal.addEventListener("click", closeKelasModalFn);
    if (cancelKelasModal) cancelKelasModal.addEventListener("click", closeKelasModalFn);

    if (kelasModal) {
      kelasModal.addEventListener("click", (event) => {
        if (event.target === kelasModal || event.target.classList.contains('absolute')) {
          closeKelasModalFn();
        }
      });
    }

    // Select All buttons
    if (selectAllHadir) {
      selectAllHadir.addEventListener("click", () => {
        state.kelasSiswa.forEach(siswa => {
          const radio = document.querySelector(`input[name="kehadiran_${siswa.siswa_id}"][value="hadir"]`);
          if (radio) radio.checked = true;
        });
        updateKehadiranCounts();
      });
    }

    if (selectAllTidakHadir) {
      selectAllTidakHadir.addEventListener("click", () => {
        state.kelasSiswa.forEach(siswa => {
          const radio = document.querySelector(`input[name="kehadiran_${siswa.siswa_id}"][value="tidak_hadir"]`);
          if (radio) radio.checked = true;
        });
        updateKehadiranCounts();
      });
    }

    // Submit Kelas Modal
    if (submitKelasModal) {
      submitKelasModal.addEventListener("click", async () => {
        if (!kelasMateriInput) return;
        const materi = kelasMateriInput.value.trim();
        if (!materi) {
          if (kelasMateriError) kelasMateriError.textContent = "Materi wajib diisi.";
          return;
        }

        const kehadiran = getKehadiranData();

        const originalText = submitKelasModal.innerText;
        submitKelasModal.innerText = "Menyimpan...";
        submitKelasModal.disabled = true;

        try {
          await handleAbsenKelas(state.pendingId, materi, kehadiran);
          closeKelasModalFn();
        } catch (err) {
          if (kelasMateriError) kelasMateriError.textContent = err.message;
        } finally {
          submitKelasModal.innerText = originalText;
          submitKelasModal.disabled = false;
        }
      });
    }

    try {
      await load();
    } catch (err) {
      console.error(err);
      state.privat = [];
      state.kelas = [];
      applyFilter();
    }
  };

  init();
})();
