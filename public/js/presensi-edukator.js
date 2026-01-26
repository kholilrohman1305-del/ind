(() => {
  const state = {
    privat: [],
    kelas: [],
    search: "",
    pendingId: null,
    activeTab: "privat",
  };

  const fetchJson = async (url, options) => {
    const res = await fetch(url, options);
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
      month: "short", // Diubah ke short agar muat di card
      year: "numeric",
    }).format(parsed);
  };

  const formatTime = (row) => {
    if (!row.jam_mulai) return "-";
    // Ambil jam:menit saja (hapus detik jika ada)
    const s = row.jam_mulai.substring(0, 5);
    const e = row.jam_selesai ? row.jam_selesai.substring(0, 5) : "";
    return e ? `${s} - ${e}` : s;
  };

  // Fungsi helper untuk Search Filter saja
  const buildTitle = (row) => {
    const siswa = row.siswa_nama || row.kelas_nama || "";
    const mapel = row.mapel_nama || row.program_nama || "";
    return `${siswa} ${mapel}`.toLowerCase();
  };

  // --- BAGIAN INI YANG DIUBAH TOTAL UNTUK TAMPILAN BARU ---
  const renderList = (rows, list) => {
    list.innerHTML = "";
    
    if (!rows || !rows.length) {
      return; // Empty state ditangani di applyFilter
    }

    rows.forEach((row) => {
      const card = document.createElement("div");
      // Class Tailwind untuk Card Container
      card.className = "bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group hover:-translate-y-1";

      const isDone = row.status_jadwal === "completed";
      const pertemuan = row.pertemuan_ke ? `Pertemuan ${row.pertemuan_ke}` : "-";
      
      // Menentukan style tombol berdasarkan status
      const btnClass = isDone 
        ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 hover:shadow-emerald-300 active:scale-[0.98]";

      const btnText = isDone ? "Sudah Absen" : "Absen Sekarang";
      const iconBtn = isDone 
        ? `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`
        : `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;

      // HTML Template Card Modern
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
                 <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
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
    const source = state.activeTab === "kelas" ? state.kelas : state.privat;
    
    const filtered = source.filter((row) => {
      // Logic search tetap sama
      const title = buildTitle(row);
      return title.includes(keyword);
    });

    const listPrivat = document.getElementById("jadwalPrivat");
    const listKelas = document.getElementById("jadwalKelas");
    const empty = document.getElementById("jadwalEmpty");

    // Toggle Visibility menggunakan class 'hidden' Tailwind
    if (state.activeTab === "kelas") {
      listPrivat.classList.add("hidden");
      listKelas.classList.remove("hidden");
      renderList(filtered, listKelas);
    } else {
      listKelas.classList.add("hidden");
      listPrivat.classList.remove("hidden");
      renderList(filtered, listPrivat);
    }

    // Handle Empty State visual
    if (empty) {
      if (filtered.length === 0) {
        empty.classList.remove("hidden");
        empty.classList.add("flex"); // Flex agar icon tengah
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
    
    // Sort logic tetap sama
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

  // --- Logic Geolocation (Tidak Diubah) ---
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

  const handleAbsen = async (jadwalId, materi) => {
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
    
    if (window.notifySuccess) {
      window.notifySuccess("Absensi tersimpan", "Status jadwal diperbarui.");
    } else {
        alert("Absensi berhasil disimpan!");
    }
    await load();
  };

  const init = async () => {
    const searchInput = document.getElementById("presensiSearch");
    const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
    
    // Logic Tab Switching
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.activeTab = btn.dataset.tab || "privat";
        applyFilter();
      });
    });

    const materiModal = document.getElementById("materiModal");
    const closeMateriModal = document.getElementById("closeMateriModal");
    const cancelMateriModal = document.getElementById("cancelMateriModal");
    const submitMateriModal = document.getElementById("submitMateriModal");
    const materiInput = document.getElementById("materiInput");
    const materiError = document.getElementById("materiError");

    if (searchInput) {
      searchInput.addEventListener("input", (event) => {
        state.search = event.target.value.trim();
        applyFilter();
      });
    }

    const privatList = document.getElementById("jadwalPrivat");
    const kelasList = document.getElementById("jadwalKelas");
    
    // Event delegation untuk tombol di dalam card
    const handleListClick = (event) => {
      const button = event.target.closest("button[data-id]");
      if (!button || button.disabled) return;
      
      state.pendingId = button.dataset.id;
      if (materiInput) materiInput.value = "";
      if (materiError) materiError.textContent = "";
      if (materiModal) {
          materiModal.classList.remove("hidden");
          // Animasi scale in untuk modal card (opsional, jika struktur HTML mendukung)
          const card = materiModal.querySelector('.modal-card');
          if(card) {
             // Reset scale agar animasi jalan
             card.classList.remove('scale-100'); 
             setTimeout(() => card.classList.add('scale-100'), 10);
          }
      }
    };

    if (privatList) privatList.addEventListener("click", handleListClick);
    if (kelasList) kelasList.addEventListener("click", handleListClick);

    const closeModal = () => {
      if (materiModal) {
          const card = materiModal.querySelector('.modal-card');
          if(card) card.classList.remove('scale-100'); // Animasi out
          
          setTimeout(() => {
              materiModal.classList.add("hidden");
          }, 150); // Tunggu animasi selesai jika ada
      }
      state.pendingId = null;
    };

    if (closeMateriModal) closeMateriModal.addEventListener("click", closeModal);
    if (cancelMateriModal) cancelMateriModal.addEventListener("click", closeModal);
    
    // Klik backdrop tutup modal
    if (materiModal) {
      materiModal.addEventListener("click", (event) => {
        // Pastikan yang diklik adalah backdrop (wrapper modal), bukan isi card
        if (event.target === materiModal || event.target.classList.contains('absolute')) {
            closeModal();
        }
      });
    }

    if (submitMateriModal) {
      submitMateriModal.addEventListener("click", async () => {
        if (!materiInput) return;
        const materi = materiInput.value.trim();
        if (!materi) {
          if (materiError) materiError.textContent = "Materi wajib diisi.";
          return;
        }
        
        // Ubah text tombol jadi Loading
        const originalText = submitMateriModal.innerText;
        submitMateriModal.innerText = "Menyimpan...";
        submitMateriModal.disabled = true;

        try {
          await handleAbsen(state.pendingId, materi);
          closeModal();
        } catch (err) {
          if (materiError) materiError.textContent = err.message;
        } finally {
            submitMateriModal.innerText = originalText;
            submitMateriModal.disabled = false;
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