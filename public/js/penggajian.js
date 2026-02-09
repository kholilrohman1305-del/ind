(() => {
  // --- CONSTANTS ---
  const requester = window.api?.request || fetch;
  const JENJANGS = ["PAUD_TK", "SD", "SMP", "SMA", "ALUMNI"];
  const KLASIFIKASIS = ["Mahasiswa", "Sarjana", "Sarjana_Manajemen"];
  const GRADIENT_CLASSES = [
    "tarif-gradient-1", "tarif-gradient-2", "tarif-gradient-3",
    "tarif-gradient-4", "tarif-gradient-5", "tarif-gradient-6"
  ];

  // --- DOM ELEMENTS ---
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  // Setting Elements
  const tarifCardsContainer = document.getElementById("tarifCardsContainer");
  const settingRows = document.getElementById("salarySettingRows");
  const settingEmpty = document.getElementById("salarySettingEmpty");
  const addTarifBtn = document.getElementById("addTarifBtn");

  // Add Tarif Modal
  const addTarifModal = document.getElementById("addTarifModal");
  const addTarifForm = document.getElementById("addTarifForm");
  const closeTarifModalBtn = document.getElementById("closeTarifModal");
  const cancelTarifModalBtn = document.getElementById("cancelTarifModal");
  const tarifFormError = document.getElementById("tarifFormError");
  const tarifNamaInput = document.getElementById("tarif_nama");

  // Infaq Modal
  const infaqModal = document.getElementById("infaqModal");
  const infaqForm = document.getElementById("infaqForm");
  const closeInfaqModalBtn = document.getElementById("closeInfaqModal");
  const cancelInfaqModalBtn = document.getElementById("cancelInfaqModal");
  const infaqFormError = document.getElementById("infaqFormError");
  const infaqEdukatorId = document.getElementById("infaqEdukatorId");
  const infaqCabangId = document.getElementById("infaqCabangId");
  const infaqEditId = document.getElementById("infaqEditId");
  const infaqNamaEdukator = document.getElementById("infaqNamaEdukator");
  const infaqJenis = document.getElementById("infaqJenis");
  const infaqNominal = document.getElementById("infaqNominal");
  const infaqTanggal = document.getElementById("infaqTanggal");
  const infaqKeterangan = document.getElementById("infaqKeterangan");
  const resetInfaqFormBtn = document.getElementById("resetInfaqForm");
  const infaqListWrap = document.getElementById("infaqListWrap");
  const infaqListBody = document.getElementById("infaqListBody");
  const infaqListEmpty = document.getElementById("infaqListEmpty");
  const openInfaqMassalBtn = document.getElementById("openInfaqMassal");
  const infaqMassalModal = document.getElementById("infaqMassalModal");
  const infaqMassalForm = document.getElementById("infaqMassalForm");
  const closeInfaqMassalModalBtn = document.getElementById("closeInfaqMassalModal");
  const cancelInfaqMassalModalBtn = document.getElementById("cancelInfaqMassalModal");
  const infaqMassalFormError = document.getElementById("infaqMassalFormError");
  const infaqMassalJenis = document.getElementById("infaqMassalJenis");
  const infaqMassalNominal = document.getElementById("infaqMassalNominal");
  const infaqMassalTanggal = document.getElementById("infaqMassalTanggal");
  const infaqMassalKeterangan = document.getElementById("infaqMassalKeterangan");

  // Slip Elements
  const slipRows = document.getElementById("slipRows");
  const slipEmpty = document.getElementById("slipEmpty");
  const slipMonth = document.getElementById("slipMonth");
  const slipSearch = document.getElementById("slipSearch");
  const slipButton = document.getElementById("generateSlip");
  const slipSummary = document.getElementById("slipSummary");
  const slipPagination = document.getElementById("slipPagination");

  // State
  let tarifNamesData = []; // Unique tarif names with kategori_les
  let tarifRows = []; // All tarif rows from API
  let slipCache = [];
  let slipPage = 1;
  const slipPageSize = 10;

  // --- HELPERS ---
  const fetchJson = async (url, options = {}) => {
    const requester = window.api?.request || fetch;
    const res = await requester(url, { credentials: "same-origin", ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Request gagal.");
    }
    return data && data.success ? data.data : data;
  };

  const formatRupiah = (value) => {
    const number = Number(value || 0);
    return new Intl.NumberFormat("id-ID").format(number);
  };

  const getInputId = (tipeLes, jenjang, klasifikasi) => {
    return `${tipeLes}_${jenjang}_${klasifikasi}`;
  };

  // --- MODAL LOGIC ---
  const setModalVisible = (targetModal, isVisible) => {
    if (!targetModal) return;
    const card = targetModal.querySelector(".modal-card");
    if (isVisible) {
      targetModal.classList.remove("hidden", "opacity-0", "pointer-events-none");
      if (card) {
        card.classList.remove("scale-95");
        card.classList.add("scale-100");
      }
      return;
    }
    targetModal.classList.add("hidden", "opacity-0", "pointer-events-none");
    if (card) {
      card.classList.add("scale-95");
      card.classList.remove("scale-100");
    }
  };

  const openInfaqModal = (row) => {
    if (!infaqModal || !infaqForm) return;
    infaqForm.reset();
    if (infaqFormError) infaqFormError.classList.add("hidden");
    if (infaqEdukatorId) infaqEdukatorId.value = row.edukator_id || "";
    if (infaqCabangId) infaqCabangId.value = row.cabang_id || "";
    if (infaqEditId) infaqEditId.value = "";
    if (resetInfaqFormBtn) resetInfaqFormBtn.classList.add("hidden");
    if (infaqNamaEdukator) infaqNamaEdukator.textContent = row.edukator_nama || "Edukator";
    if (infaqTanggal) infaqTanggal.value = new Date().toISOString().slice(0, 10);
    setModalVisible(infaqModal, true);
    loadInfaqList();
  };

  const setInfaqForm = (item) => {
    if (infaqEditId) infaqEditId.value = item?.id || "";
    if (infaqJenis) infaqJenis.value = item?.jenis_infaq || "";
    if (infaqNominal) infaqNominal.value = item?.nominal || "";
    if (infaqTanggal) infaqTanggal.value = item?.tanggal ? String(item.tanggal).slice(0, 10) : "";
    if (infaqKeterangan) infaqKeterangan.value = item?.keterangan || "";
    if (resetInfaqFormBtn) resetInfaqFormBtn.classList.remove("hidden");
  };

  const resetInfaqForm = () => {
    if (!infaqForm) return;
    infaqForm.reset();
    if (infaqEditId) infaqEditId.value = "";
    if (resetInfaqFormBtn) resetInfaqFormBtn.classList.add("hidden");
    if (infaqTanggal) infaqTanggal.value = new Date().toISOString().slice(0, 10);
  };

  const loadInfaqList = async () => {
    if (!infaqEdukatorId || !infaqEdukatorId.value) return;
    const params = new URLSearchParams();
    params.set("edukator_id", infaqEdukatorId.value);
    if (slipMonth && slipMonth.value) {
      const [year, month] = slipMonth.value.split("-");
      params.set("year", year);
      params.set("month", month);
    }
    try {
      const rows = await fetchJson(`/api/penggajian/infaq?${params.toString()}`);
      if (!infaqListBody || !infaqListWrap || !infaqListEmpty) return;
      infaqListBody.innerHTML = "";
      if (!rows || !rows.length) {
        infaqListWrap.classList.add("hidden");
        infaqListEmpty.classList.remove("hidden");
        return;
      }
      infaqListEmpty.classList.add("hidden");
      infaqListWrap.classList.remove("hidden");

      rows.forEach((item) => {
        const tr = document.createElement("tr");
        tr.className = "border-b border-gray-100 hover:bg-gray-50";
        tr.innerHTML = `
          <td class="py-2">${String(item.tanggal).slice(0, 10)}</td>
          <td class="py-2 font-semibold text-gray-700">${item.jenis_infaq || "-"}</td>
          <td class="py-2 text-right text-rose-600 font-semibold">Rp ${formatRupiah(item.nominal)}</td>
          <td class="py-2 text-gray-500">${item.keterangan || "-"}</td>
          <td class="py-2 text-right">
            <div class="flex items-center justify-end gap-2">
              <button class="px-2 py-1 text-[10px] rounded bg-amber-50 text-amber-600 border border-amber-100" data-action="edit" data-id="${item.id}">Edit</button>
              <button class="px-2 py-1 text-[10px] rounded bg-rose-50 text-rose-600 border border-rose-100" data-action="delete" data-id="${item.id}">Hapus</button>
            </div>
          </td>
        `;
        tr.querySelector('[data-action="edit"]').addEventListener("click", () => {
          setInfaqForm(item);
        });
        tr.querySelector('[data-action="delete"]').addEventListener("click", async () => {
          if (!confirm("Hapus infaq ini?")) return;
          try {
            await fetchJson(`/api/penggajian/infaq/${item.id}`, { method: "DELETE" });
            await loadInfaqList();
            loadSlip();
          } catch (err) {
            if (window.notifyError) window.notifyError("Gagal", err.message);
          }
        });
        infaqListBody.appendChild(tr);
      });
    } catch (err) {
      if (window.notifyError) window.notifyError("Gagal", "Tidak bisa memuat infaq.");
    }
  };

  // --- TAB LOGIC ---
  const setActiveTab = (targetId) => {
    tabButtons.forEach(btn => {
      if (btn.dataset.target === targetId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    tabContents.forEach(content => {
      if (content.id === targetId) {
        content.classList.remove('hidden');
        setTimeout(() => content.classList.add('active'), 10);
      } else {
        content.classList.remove('active');
        content.classList.add('hidden');
      }
    });

    if (targetId === "slip-gaji" && slipCache.length === 0) {
      loadSlip();
    }
  };

  // --- RENDER TARIF CARDS ---
  const renderTarifCards = () => {
    if (!tarifCardsContainer) return;

    if (!tarifNamesData.length) {
      tarifCardsContainer.innerHTML = `
        <div class="col-span-2 text-center py-12 text-gray-400">
          <i class="fa-solid fa-folder-open text-4xl mb-3"></i>
          <p>Belum ada tarif. Klik tombol "Tambah Tarif" untuk menambahkan.</p>
        </div>
      `;
      return;
    }

    tarifCardsContainer.innerHTML = tarifNamesData.map((tarif, index) => {
      const gradientClass = GRADIENT_CLASSES[index % GRADIENT_CLASSES.length];
      const namaTarif = tarif.nama_tarif;
      const kategoriLes = tarif.kategori_les;
      const tarifKey = `${namaTarif}_${kategoriLes}`;

      // Get existing tarif values for this nama_tarif + kategori_les
      const getTarifValue = (jenjang, klasifikasi) => {
        const found = tarifRows.find(
          r => r.nama_tarif === namaTarif && r.kategori_les === kategoriLes && r.jenjang === jenjang && r.klasifikasi_edukator === klasifikasi
        );
        return found ? found.nominal : 0;
      };

      const isDefault = namaTarif === 'Reguler';
      const kategoriIcon = kategoriLes === 'privat' ? 'fa-user' : 'fa-users';
      const kategoriLabel = kategoriLes === 'privat' ? 'Privat' : 'Kelas';

      return `
        <div class="glass-panel overflow-hidden" data-tarif-key="${tarifKey}">
          <div class="${gradientClass} text-white px-6 py-4 flex justify-between items-center">
            <div>
              <h3 class="font-bold text-lg flex items-center gap-2">
                <i class="fa-solid ${kategoriIcon}"></i>
                ${namaTarif.toUpperCase()}
              </h3>
              <p class="text-white/70 text-xs mt-1">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded">
                  <i class="fa-solid ${kategoriIcon} text-[10px]"></i> ${kategoriLabel}
                </span>
                Tarif per pertemuan
              </p>
            </div>
            ${!isDefault ? `
              <button class="delete-tarif-btn w-8 h-8 rounded-full bg-white/20 hover:bg-red-500 text-white flex items-center justify-center transition"
                      data-nama="${namaTarif}" data-kategori="${kategoriLes}" title="Hapus Tarif">
                <i class="fa-solid fa-trash-can text-sm"></i>
              </button>
            ` : ''}
          </div>
          <form class="tarif-form p-4" data-nama-tarif="${namaTarif}" data-kategori-les="${kategoriLes}">
            <input type="hidden" name="nama_tarif" value="${namaTarif}">
            <input type="hidden" name="kategori_les" value="${kategoriLes}">
            <table class="tarif-table">
              <thead>
                <tr class="bg-gray-50">
                  <th class="text-gray-600 bg-yellow-100 border border-yellow-200">Jenjang / Klasifikasi</th>
                  <th class="text-amber-700 bg-yellow-100 border border-yellow-200">MAHASISWA</th>
                  <th class="text-amber-700 bg-yellow-100 border border-yellow-200">SARJANA</th>
                  <th class="text-amber-700 bg-yellow-100 border border-yellow-200">SARJANA + MANAJEMEN</th>
                </tr>
              </thead>
              <tbody>
                ${JENJANGS.map(jenjang => `
                  <tr>
                    <td class="jenjang-cell bg-green-100 text-green-800">${jenjang.replace('PAUD_TK', 'TK/PAUD')}</td>
                    ${KLASIFIKASIS.map(klasifikasi => `
                      <td>
                        <input id="${getInputId(tarifKey, jenjang, klasifikasi)}"
                               type="number" min="0"
                               class="custom-input"
                               placeholder="0"
                               value="${getTarifValue(jenjang, klasifikasi)}">
                      </td>
                    `).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="pt-4">
              <button type="submit" class="w-full py-2.5 text-sm font-bold text-white ${gradientClass} hover:opacity-90 rounded-xl shadow-lg transition transform active:scale-95">
                <i class="fa-solid fa-floppy-disk mr-2"></i>Simpan Tarif ${namaTarif} (${kategoriLabel})
              </button>
            </div>
          </form>
        </div>
      `;
    }).join('');

    // Add event listeners to forms
    document.querySelectorAll('.tarif-form').forEach(form => {
      form.addEventListener('submit', handleTarifFormSubmit);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-tarif-btn').forEach(btn => {
      btn.addEventListener('click', handleDeleteTarif);
    });
  };

  const renderSettingTable = () => {
    if (!settingRows || !settingEmpty) return;

    if (!tarifRows.length) {
      settingRows.innerHTML = "";
      settingEmpty.classList.remove("hidden");
      settingEmpty.classList.add("flex");
      return;
    }
    settingEmpty.classList.add("hidden");
    settingEmpty.classList.remove("flex");

    // Sort by nama_tarif, kategori_les, jenjang, klasifikasi
    const sorted = [...tarifRows].sort((a, b) => {
      // Sort by nama_tarif first
      if (a.nama_tarif !== b.nama_tarif) {
        return (a.nama_tarif || '').localeCompare(b.nama_tarif || '');
      }
      // Then by kategori_les
      if (a.kategori_les !== b.kategori_les) {
        return a.kategori_les === 'privat' ? -1 : 1;
      }
      // Then by jenjang
      if (a.jenjang !== b.jenjang) {
        return JENJANGS.indexOf(a.jenjang) - JENJANGS.indexOf(b.jenjang);
      }
      // Then by klasifikasi
      return KLASIFIKASIS.indexOf(a.klasifikasi_edukator) - KLASIFIKASIS.indexOf(b.klasifikasi_edukator);
    });

    settingRows.innerHTML = sorted.map(row => {
      const kategoriBadgeColor = row.kategori_les === 'privat'
        ? 'bg-blue-50 text-blue-600'
        : 'bg-emerald-50 text-emerald-600';
      const kategoriIcon = row.kategori_les === 'privat' ? 'fa-user' : 'fa-users';

      const jenjangDisplay = row.jenjang.replace("PAUD_TK", "PAUD/TK");
      const klasifikasiDisplay = row.klasifikasi_edukator.replace("Sarjana_Manajemen", "Sarjana + Manajemen");

      return `
        <tr>
          <td><span class="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs font-bold">${row.nama_tarif || 'Reguler'}</span></td>
          <td>
            <span class="px-2 py-0.5 ${kategoriBadgeColor} rounded text-xs font-bold flex items-center gap-1 w-fit">
              <i class="fa-solid ${kategoriIcon} text-[10px]"></i> ${row.kategori_les === 'privat' ? 'Privat' : 'Kelas'}
            </span>
          </td>
          <td class="font-bold text-gray-700">${jenjangDisplay}</td>
          <td class="text-gray-600">${klasifikasiDisplay}</td>
          <td class="font-mono text-indigo-600 font-semibold">Rp ${formatRupiah(row.nominal)}</td>
          <td class="text-xs text-gray-400">
            <i class="fa-regular fa-clock mr-1"></i> ${row.updated_at ? new Date(row.updated_at).toLocaleDateString("id-ID") : "-"}
          </td>
        </tr>
      `;
    }).join("");
  };

  // --- HANDLERS ---
  const handleTarifFormSubmit = async (event) => {
    event.preventDefault();
    const form = event.target;
    const namaTarif = form.dataset.namaTarif;
    const kategoriLes = form.dataset.kategoriLes;
    const tarifKey = `${namaTarif}_${kategoriLes}`;

    const payload = {
      nama_tarif: namaTarif,
      kategori_les: kategoriLes
    };

    JENJANGS.forEach(jenjang => {
      KLASIFIKASIS.forEach(klasifikasi => {
        const inputId = getInputId(tarifKey, jenjang, klasifikasi);
        const input = document.getElementById(inputId);
        const key = `${jenjang}_${klasifikasi}`;
        payload[key] = Number(input?.value || 0);
      });
    });

    try {
      const rows = await fetchJson("/api/penggajian/setting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      tarifRows = rows || [];
      renderSettingTable();

      const kategoriLabel = kategoriLes === 'privat' ? 'Privat' : 'Kelas';
      if (window.notifySuccess) window.notifySuccess("Berhasil", `Tarif ${namaTarif} (${kategoriLabel}) telah diperbarui.`);
    } catch (err) {
      if (window.notifyError) window.notifyError("Gagal Menyimpan", err.message);
    }
  };

  const handleDeleteTarif = async (event) => {
    const btn = event.target.closest('.delete-tarif-btn');
    if (!btn) return;

    const namaTarif = btn.dataset.nama;
    const kategoriLes = btn.dataset.kategori;
    const kategoriLabel = kategoriLes === 'privat' ? 'Privat' : 'Kelas';

    if (!confirm(`Hapus tarif "${namaTarif}" (${kategoriLabel})?\nSemua setting tarif untuk kombinasi ini akan terhapus.`)) return;

    try {
      await fetchJson(`/api/penggajian/setting/tarif?nama_tarif=${encodeURIComponent(namaTarif)}&kategori_les=${encodeURIComponent(kategoriLes)}`, { method: "DELETE" });
      await loadTarifNames();
      if (window.notifySuccess) window.notifySuccess("Berhasil", `Tarif "${namaTarif}" (${kategoriLabel}) telah dihapus.`);
    } catch (err) {
      if (window.notifyError) window.notifyError("Gagal Menghapus", err.message);
    }
  };

  const handleAddTarifSubmit = async (event) => {
    event.preventDefault();
    if (tarifFormError) tarifFormError.classList.add('hidden');

    const namaTarif = tarifNamaInput?.value?.trim();
    const kategoriLesInput = document.querySelector('input[name="kategori_les"]:checked');
    const kategoriLes = kategoriLesInput?.value || 'privat';

    if (!namaTarif) {
      if (tarifFormError) {
        tarifFormError.textContent = "Nama tarif wajib diisi.";
        tarifFormError.classList.remove('hidden');
      }
      return;
    }

    // Check if this tarif name + kategori combination already exists
    const exists = tarifNamesData.some(t => t.nama_tarif === namaTarif && t.kategori_les === kategoriLes);
    if (exists) {
      if (tarifFormError) {
        const kategoriLabel = kategoriLes === 'privat' ? 'Privat' : 'Kelas';
        tarifFormError.textContent = `Tarif "${namaTarif}" untuk kategori ${kategoriLabel} sudah ada.`;
        tarifFormError.classList.remove('hidden');
      }
      return;
    }

    try {
      // Create initial tarif entries with 0 values
      const payload = {
        nama_tarif: namaTarif,
        kategori_les: kategoriLes
      };
      // Set all jenjang/klasifikasi combinations to 0
      JENJANGS.forEach(jenjang => {
        KLASIFIKASIS.forEach(klasifikasi => {
          payload[`${jenjang}_${klasifikasi}`] = 0;
        });
      });

      await fetchJson("/api/penggajian/setting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setModalVisible(addTarifModal, false);
      addTarifForm.reset();
      await loadTarifNames();
      const kategoriLabel = kategoriLes === 'privat' ? 'Privat' : 'Kelas';
      if (window.notifySuccess) window.notifySuccess("Berhasil", `Tarif "${namaTarif}" (${kategoriLabel}) telah ditambahkan.`);
    } catch (err) {
      if (tarifFormError) {
        tarifFormError.textContent = err.message;
        tarifFormError.classList.remove('hidden');
      }
    }
  };


  // --- SLIP FUNCTIONS ---
  const renderSlipSummary = (rows) => {
    if (!slipSummary) return;
    const totalGaji = rows.reduce((acc, row) => acc + Number(row.total_gaji || 0), 0);
    const totalEdukator = rows.length;

    slipSummary.innerHTML = `
      <div class="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
        <div class="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl group-hover:scale-110 transition-transform duration-700"></div>
        <div class="relative z-10">
          <p class="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-2">Total Payout Bulan Ini</p>
          <h2 class="text-4xl font-bold">Rp ${formatRupiah(totalGaji)}</h2>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
        <div>
          <p class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Penerima Gaji</p>
          <h2 class="text-3xl font-bold text-gray-800">${totalEdukator} <span class="text-sm font-medium text-gray-400">Orang</span></h2>
        </div>
        <div class="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
          <i class="fa-solid fa-users-viewfinder"></i>
        </div>
      </div>
    `;
  };

  const renderSlipTable = (rows) => {
    if (!slipRows || !slipEmpty) return;

    const totalPages = Math.max(1, Math.ceil(rows.length / slipPageSize));
    const current = Math.min(Math.max(slipPage, 1), totalPages);
    const start = (current - 1) * slipPageSize;
    const paged = rows.slice(start, start + slipPageSize);

    if (slipPagination) {
      if (!rows.length) {
        slipPagination.innerHTML = "";
      } else {
        slipPagination.innerHTML = `
          <button class="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 transition"
                  data-action="prev" ${current === 1 ? "disabled" : ""}>
            <i class="fa-solid fa-arrow-left"></i> Prev
          </button>
          <span class="text-sm text-gray-500 font-semibold">Page ${current} of ${totalPages}</span>
          <button class="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 transition"
                  data-action="next" ${current === totalPages ? "disabled" : ""}>
            Next <i class="fa-solid fa-arrow-right"></i>
          </button>
        `;
      }
    }

    if (!paged.length) {
      slipRows.innerHTML = "";
      slipEmpty.classList.remove("hidden");
      return;
    }

    slipEmpty.classList.add("hidden");

    slipRows.innerHTML = paged.map(row => {
      const gajiMengajar = Number(row.gaji_mengajar || 0);
      const gajiTambahan = Number(row.gaji_tambahan || 0);
      const totalInfaq = Number(row.total_infaq || 0);
      const totalPertemuan = (Number(row.jumlah_privat || 0)) + (Number(row.jumlah_kelas || 0));

      return `
      <tr class="group hover:bg-indigo-50/30 transition">
        <td>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 flex items-center justify-center font-bold text-xs shadow-sm border border-white">
              ${(row.edukator_nama || "?").substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div class="font-bold text-gray-700 text-sm">${row.edukator_nama}</div>
              <div class="text-[10px] text-gray-400 font-mono">ID: #${row.edukator_id}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="inline-block px-2 py-1 ${row.klasifikasi_label?.includes('Manajemen') ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'} rounded text-xs font-bold">
            ${row.klasifikasi_label || '-'}
          </span>
        </td>
        <td>
          ${row.jabatan_manajemen
            ? `<span class="inline-block px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">${row.jabatan_manajemen}</span>`
            : '<span class="text-gray-400 text-xs">-</span>'
          }
        </td>
        <td>
          <span class="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold border border-gray-200">
            ${String(row.bulan).padStart(2, "0")}/${row.tahun}
          </span>
        </td>
        <td class="text-right">
          <div class="text-gray-600 font-medium text-xs">Rp ${formatRupiah(gajiMengajar)}</div>
          <div class="text-[10px] text-gray-400">${totalPertemuan} pertemuan</div>
        </td>
        <td class="text-right">
          ${gajiTambahan > 0
            ? `<div class="text-amber-600 font-medium text-xs">Rp ${formatRupiah(gajiTambahan)}</div>
               <div class="text-[10px] text-gray-400">Manajemen</div>`
            : '<span class="text-gray-400 text-xs">-</span>'
          }
        </td>
        <td class="text-right">
          ${totalInfaq > 0
            ? `<div class="text-rose-600 font-medium text-xs">Rp ${formatRupiah(totalInfaq)}</div>
               <div class="text-[10px] text-gray-400">Potongan</div>`
            : '<span class="text-gray-400 text-xs">-</span>'
          }
        </td>
        <td class="text-right font-bold text-emerald-600 text-sm">Rp ${formatRupiah(row.total_gaji)}</td>
        <td class="text-center">
          <div class="flex items-center justify-center gap-2">
            <button class="w-8 h-8 rounded-lg bg-white border border-gray-200 text-emerald-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition flex items-center justify-center shadow-sm"
                    data-action="infaq"
                    data-id="${row.edukator_id}"
                    data-nama="${row.edukator_nama}"
                    data-cabang-id="${row.cabang_id || ''}"
                    title="Tambah Infaq">
              <i class="fa-solid fa-hand-holding-heart"></i>
            </button>
            <button class="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition flex items-center justify-center shadow-sm"
                    data-action="print"
                    data-id="${row.edukator_id}"
                    data-bulan="${row.bulan}"
                    data-tahun="${row.tahun}"
                    title="Cetak Slip Gaji">
              <i class="fa-solid fa-print"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
    }).join("");

    renderSlipSummary(rows);
  };

  // --- LOAD DATA ---
  const loadTarifNames = async () => {
    try {
      tarifNamesData = await fetchJson("/api/penggajian/setting/names");
      await loadSetting();
    } catch (err) {
      console.error(err);
      tarifNamesData = [];
      renderTarifCards();
    }
  };

  const loadSetting = async () => {
    try {
      const rows = await fetchJson("/api/penggajian/setting");
      tarifRows = rows || [];
      renderTarifCards();
      renderSettingTable();
    } catch (err) {
      console.error(err);
    }
  };

  const loadSlip = async () => {
    const params = new URLSearchParams();
    if (slipMonth && slipMonth.value) {
      const [year, month] = slipMonth.value.split("-");
      params.set("year", year);
      params.set("month", month);
    }

    if (slipButton) {
      slipButton.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Loading...';
      slipButton.disabled = true;
    }

    try {
      const query = params.toString();
      const rows = await fetchJson(`/api/penggajian/slip${query ? `?${query}` : ""}`);
      slipCache = rows || [];
      slipPage = 1;

      const keyword = slipSearch?.value?.toLowerCase() || "";
      const filtered = keyword
        ? slipCache.filter((row) => String(row.edukator_nama || "").toLowerCase().includes(keyword))
        : slipCache;

      renderSlipTable(filtered);
    } catch (err) {
      console.error(err);
      if (window.notifyError) window.notifyError("Error", "Gagal memuat data gaji.");
    } finally {
      if (slipButton) {
        slipButton.innerHTML = '<i class="fa-solid fa-rotate"></i> Load Data';
        slipButton.disabled = false;
      }
    }
  };

  // --- EVENT LISTENERS ---
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.target));
  });

  // Add Tarif Modal
  if (addTarifBtn) {
    addTarifBtn.addEventListener("click", () => {
      if (addTarifForm) addTarifForm.reset();
      if (tarifFormError) tarifFormError.classList.add('hidden');
      setModalVisible(addTarifModal, true);
    });
  }
  if (closeTarifModalBtn) closeTarifModalBtn.addEventListener("click", () => setModalVisible(addTarifModal, false));
  if (cancelTarifModalBtn) cancelTarifModalBtn.addEventListener("click", () => setModalVisible(addTarifModal, false));
  if (addTarifForm) addTarifForm.addEventListener("submit", handleAddTarifSubmit);

  if (closeInfaqModalBtn) closeInfaqModalBtn.addEventListener("click", () => setModalVisible(infaqModal, false));
  if (cancelInfaqModalBtn) cancelInfaqModalBtn.addEventListener("click", () => setModalVisible(infaqModal, false));
  if (resetInfaqFormBtn) resetInfaqFormBtn.addEventListener("click", resetInfaqForm);
  if (infaqForm) {
    infaqForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (infaqFormError) infaqFormError.classList.add("hidden");
      try {
        const isEdit = Boolean(infaqEditId && infaqEditId.value);
        const payload = {
          edukator_id: infaqEdukatorId?.value || "",
          cabang_id: infaqCabangId?.value || "",
          jenis_infaq: infaqJenis?.value?.trim(),
          nominal: infaqNominal?.value,
          tanggal: infaqTanggal?.value,
          keterangan: infaqKeterangan?.value?.trim(),
        };
        const url = isEdit ? `/api/penggajian/infaq/${infaqEditId.value}` : "/api/penggajian/infaq";
        const method = isEdit ? "PUT" : "POST";
        await fetchJson(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (window.notifySuccess) window.notifySuccess("Berhasil", isEdit ? "Infaq berhasil diperbarui." : "Infaq berhasil ditambahkan.");
        resetInfaqForm();
        await loadInfaqList();
        loadSlip();
      } catch (err) {
        if (infaqFormError) {
          infaqFormError.textContent = err.message;
          infaqFormError.classList.remove("hidden");
        }
      }
    });
  }

  if (openInfaqMassalBtn) {
    openInfaqMassalBtn.addEventListener("click", () => {
      if (infaqMassalForm) infaqMassalForm.reset();
      if (infaqMassalFormError) infaqMassalFormError.classList.add("hidden");
      if (infaqMassalTanggal) infaqMassalTanggal.value = new Date().toISOString().slice(0, 10);
      setModalVisible(infaqMassalModal, true);
    });
  }
  if (closeInfaqMassalModalBtn) closeInfaqMassalModalBtn.addEventListener("click", () => setModalVisible(infaqMassalModal, false));
  if (cancelInfaqMassalModalBtn) cancelInfaqMassalModalBtn.addEventListener("click", () => setModalVisible(infaqMassalModal, false));
  if (infaqMassalForm) {
    infaqMassalForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (infaqMassalFormError) infaqMassalFormError.classList.add("hidden");
      try {
        const payload = {
          jenis_infaq: infaqMassalJenis?.value?.trim(),
          nominal: infaqMassalNominal?.value,
          tanggal: infaqMassalTanggal?.value,
          keterangan: infaqMassalKeterangan?.value?.trim(),
        };
        await fetchJson("/api/penggajian/infaq/massal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setModalVisible(infaqMassalModal, false);
        if (window.notifySuccess) window.notifySuccess("Berhasil", "Infaq massal berhasil ditambahkan.");
        loadSlip();
      } catch (err) {
        if (infaqMassalFormError) {
          infaqMassalFormError.textContent = err.message;
          infaqMassalFormError.classList.remove("hidden");
        }
      }
    });
  }

  // Slip
  if (slipButton) {
    slipButton.addEventListener("click", (event) => {
      event.preventDefault();
      loadSlip();
    });
  }

  if (slipMonth) {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (!slipMonth.value) slipMonth.value = defaultMonth;
    slipMonth.addEventListener("change", () => {
      loadSlip();
      if (infaqModal && !infaqModal.classList.contains("hidden")) {
        loadInfaqList();
      }
    });
  }

  if (slipSearch) {
    slipSearch.addEventListener("input", () => {
      const keyword = slipSearch.value.toLowerCase();
      const filtered = slipCache.filter((row) =>
        String(row.edukator_nama || "").toLowerCase().includes(keyword)
      );
      slipPage = 1;
      renderSlipTable(filtered);
    });
  }

  if (slipPagination) {
    slipPagination.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const keyword = slipSearch?.value?.toLowerCase() || "";
      const filtered = keyword
        ? slipCache.filter((row) => String(row.edukator_nama || "").toLowerCase().includes(keyword))
        : slipCache;

      const totalPages = Math.max(1, Math.ceil(filtered.length / slipPageSize));

      if (button.dataset.action === "prev") slipPage = Math.max(1, slipPage - 1);
      if (button.dataset.action === "next") slipPage = Math.min(totalPages, slipPage + 1);

      renderSlipTable(filtered);
    });
  }

  // Print Slip
  if (slipRows) {
    slipRows.addEventListener("click", (event) => {
      const actionButton = event.target.closest("button[data-action]");
      if (!actionButton) return;
      const action = actionButton.dataset.action;
      if (action === "infaq") {
        const target = slipCache.find(
          (row) => String(row.edukator_id) === String(actionButton.dataset.id)
        );
        if (target) openInfaqModal(target);
        return;
      }

      if (action !== "print") return;

      const button = actionButton;
      if (!button) return;

      const target = slipCache.find(
        (row) =>
          String(row.edukator_id) === String(button.dataset.id) &&
          String(row.bulan) === String(button.dataset.bulan) &&
          String(row.tahun) === String(button.dataset.tahun)
      );

      if (!target) return;

      const printWindow = window.open("", "_blank", "width=900,height=1000");
      if (!printWindow) return;

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="id">
          <head>
            <title>Slip Gaji - ${target.edukator_nama}</title>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
              body { margin: 0; padding: 0; background: #f3f4f6; font-family: 'Plus Jakarta Sans', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              @page { size: A4; margin: 0; }
              .invoice-container { width: 100%; max-width: 800px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.05); }
              .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 40px; display: flex; justify-content: space-between; align-items: center; }
              .brand h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
              .brand p { margin: 4px 0 0; opacity: 0.8; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
              .slip-title { text-align: right; }
              .slip-title h2 { margin: 0; font-size: 32px; font-weight: 700; opacity: 0.2; text-transform: uppercase; }
              .slip-title .period { font-size: 14px; font-weight: 600; margin-top: 5px; opacity: 0.9; }
              .content { padding: 40px; }
              .info-grid { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #f3f4f6; padding-bottom: 30px; }
              .info-col h3 { font-size: 11px; text-transform: uppercase; color: #6b7280; margin: 0 0 8px 0; letter-spacing: 0.5px; font-weight: 700; }
              .info-col p { font-size: 15px; font-weight: 600; color: #1f2937; margin: 0; }
              .info-col .sub { font-size: 13px; color: #6b7280; font-weight: 400; margin-top: 2px; }
              .table-label { font-size: 14px; font-weight: 700; color: #374151; margin-bottom: 12px; display: block; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th { text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase; padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; letter-spacing: 0.5px; }
              td { padding: 16px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #1f2937; }
              .amount { text-align: right; font-weight: 600; font-family: monospace; font-size: 15px; }
              .total-row td { border-bottom: none; border-top: 2px solid #1f2937; padding-top: 20px; color: #111827; }
              .total-row .label { font-size: 16px; font-weight: 700; }
              .total-row .value { font-size: 24px; font-weight: 800; color: #4F46E5; }
              .footer { background: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
              .footer strong { color: #4b5563; }
              @media print { body { background: white; padding: 0; } .invoice-container { box-shadow: none; margin: 0; max-width: 100%; border-radius: 0; } }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              <div class="header">
                <div class="brand">
                  <h1>ILHAMI</h1>
                  <p>Education Center</p>
                </div>
                <div class="slip-title">
                  <h2>PAYSLIP</h2>
                  <div class="period">PERIODE ${String(target.bulan).padStart(2, "0")}/${target.tahun}</div>
                </div>
              </div>
              <div class="content">
                <div class="info-grid">
                  <div class="info-col">
                    <h3>Penerima (Edukator)</h3>
                    <p>${target.edukator_nama}</p>
                    <div class="sub">ID: ${target.edukator_id} | ${target.klasifikasi_label || '-'}${target.jabatan_manajemen ? ` | ${target.jabatan_manajemen}` : ''}</div>
                  </div>
                  <div class="info-col" style="text-align: right;">
                    <h3>Tanggal Cetak</h3>
                    <p>${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <div class="sub">Validasi System Generated</div>
                  </div>
                </div>
                <span class="table-label">Rincian Pendapatan</span>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 60%">Deskripsi</th>
                      <th style="text-align: right;">Jumlah (IDR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>Gaji Les Privat</strong>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${target.jumlah_privat || 0} pertemuan</div>
                      </td>
                      <td class="amount">${formatRupiah(target.gaji_privat)}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Gaji Les Kelas</strong>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${target.jumlah_kelas || 0} pertemuan</div>
                      </td>
                      <td class="amount">${formatRupiah(target.gaji_kelas)}</td>
                    </tr>
                    ${Number(target.gaji_tambahan || 0) > 0 ? `
                    <tr>
                      <td>
                        <strong>Gaji Tambahan (Manajemen)</strong>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Jabatan: ${target.jabatan_manajemen || '-'}</div>
                      </td>
                      <td class="amount">${formatRupiah(target.gaji_tambahan)}</td>
                    </tr>
                    ` : ''}
                    ${Number(target.total_infaq || 0) > 0 ? `
                    <tr>
                      <td>
                        <strong>Potongan Infaq</strong>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Potongan dari gaji</div>
                      </td>
                      <td class="amount">-${formatRupiah(target.total_infaq)}</td>
                    </tr>
                    ` : ''}
                    <tr class="total-row">
                      <td class="label">Total Diterima (Take Home Pay)</td>
                      <td class="amount value">Rp ${formatRupiah(target.total_gaji)}</td>
                    </tr>
                  </tbody>
                </table>
                <div style="margin-top: 40px; text-align: center; display: flex; justify-content: flex-end;">
                  <div style="text-align: center; width: 200px;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 60px;">Disetujui Oleh,</div>
                    <div style="font-weight: 700; border-top: 1px solid #d1d5db; padding-top: 8px;">Admin Keuangan</div>
                  </div>
                </div>
              </div>
              <div class="footer">
                <p>Dokumen ini dibuat secara otomatis oleh sistem <strong>ILHAMI Pro</strong> dan sah tanpa tanda tangan basah.</p>
              </div>
            </div>
            <script>window.onload = function() { window.print(); }<\/script>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    });
  }

  // --- ANOMALY DETECTION FEATURE ---
  const setupAnomalyDetection = () => {
    const slipBtn = document.getElementById("generateSlip");
    if (!slipBtn) return;

    // Cleanup existing elements (prevent duplicates)
    const existingBtn = document.getElementById("btnCheckAnomaly");
    if (existingBtn) existingBtn.remove();
    const existingModal = document.getElementById("anomalyModal");
    if (existingModal) existingModal.remove();

    // 1. Create Button
    const btn = document.createElement("button");
    btn.id = "btnCheckAnomaly";
    btn.className = "px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-sm font-semibold hover:bg-rose-100 transition flex items-center gap-2 ml-2";
    btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Cek Anomali';
    btn.type = "button";
    
    // Insert after Generate Slip button
    if (slipBtn.parentNode) {
        slipBtn.parentNode.insertBefore(btn, slipBtn.nextSibling);
    }

    // 2. Create Modal HTML
    const modalHtml = `
        <div id="anomalyModal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/50 backdrop-blur-sm opacity-0 transition-opacity duration-300">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform scale-95 transition-transform duration-300 modal-card flex flex-col max-h-[90vh]">
                <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-rose-50 rounded-t-2xl">
                    <h3 class="text-lg font-bold text-rose-700 flex items-center gap-2">
                        <i class="fa-solid fa-triangle-exclamation"></i> Deteksi Anomali Gaji
                    </h3>
                    <button id="closeAnomalyModal" class="text-gray-400 hover:text-gray-600 transition">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto flex-1" id="anomalyContent">
                    <!-- Content goes here -->
                </div>
                <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
                    <button id="closeAnomalyFooter" class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition">Tutup</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // 3. Event Listeners
    const modal = document.getElementById("anomalyModal");
    const closeBtn = document.getElementById("closeAnomalyModal");
    const closeFooter = document.getElementById("closeAnomalyFooter");
    const content = document.getElementById("anomalyContent");

    const closeModal = () => {
        modal.classList.add("opacity-0", "pointer-events-none");
        modal.querySelector(".modal-card").classList.remove("scale-100");
        modal.querySelector(".modal-card").classList.add("scale-95");
        setTimeout(() => modal.classList.add("hidden"), 300);
    };

    const openModal = () => {
        modal.classList.remove("hidden");
        // Trigger reflow
        void modal.offsetWidth;
        modal.classList.remove("opacity-0", "pointer-events-none");
        modal.querySelector(".modal-card").classList.add("scale-100");
        modal.querySelector(".modal-card").classList.remove("scale-95");
    };

    [closeBtn, closeFooter].forEach(el => el.addEventListener("click", closeModal));
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    btn.addEventListener("click", async () => {
        const monthVal = document.getElementById("slipMonth")?.value;
        if (!monthVal) {
            if(window.notifyWarning) {
                window.notifyWarning("Pilih Periode", "Silakan pilih bulan terlebih dahulu.");
            } else {
                alert("Silakan pilih bulan terlebih dahulu.");
            }
            return;
        }

        const [year, month] = monthVal.split("-");
        
        // Loading state
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Memeriksa...';
        btn.disabled = true;

        try {
            const res = await requester("/api/penggajian/anomalies/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ year, month })
            });
            const json = await res.json();
            
            if (!json.success) throw new Error(json.message);

            const anomalies = json.data || [];

            // Helper: Generate SVG Sparkline
            const generateSparkline = (data, width = 100, height = 30) => {
                if (!data || data.length < 2) return '';
                const max = Math.max(...data);
                const min = Math.min(...data);
                const range = max - min || 1;
                const step = width / (data.length - 1);
                
                const points = data.map((val, i) => {
                    const x = i * step;
                    const y = height - 3 - ((val - min) / range) * (height - 6);
                    return `${x},${y}`;
                }).join(' ');

                return `<svg width="${width}" height="${height}" class="overflow-visible">
                    <polyline points="${points}" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    ${data.map((val, i) => {
                        const x = i * step;
                        const y = height - 3 - ((val - min) / range) * (height - 6);
                        return i === data.length - 1 ? `<circle cx="${x}" cy="${y}" r="3" fill="#ef4444" />` : '';
                    }).join('')}
                </svg>`;
            };
            
            if (anomalies.length === 0) {
                content.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-8 text-center">
                        <div class="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center text-3xl mb-4">
                            <i class="fa-solid fa-check"></i>
                        </div>
                        <h4 class="text-lg font-bold text-gray-800">Tidak Ditemukan Anomali</h4>
                        <p class="text-gray-500 mt-1">Data gaji untuk periode ini terlihat wajar.</p>
                    </div>
                `;
            } else {
                content.innerHTML = `
                    <div class="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-sm">
                        Ditemukan <strong>${anomalies.length}</strong> data yang menyimpang dari pola historis.
                    </div>
                    <div class="space-y-3">
                        ${anomalies.map(item => {
                            // Gabungkan history + nilai saat ini untuk visualisasi tren
                            const trendData = [...(item.history || []), item.total_gaji];
                            const sparkline = generateSparkline(trendData);

                            return `
                            <div class="p-4 border border-gray-200 rounded-xl hover:shadow-md transition bg-white">
                                <div class="flex justify-between items-start mb-2">
                                    <div>
                                        <h5 class="font-bold text-gray-800">${item.nama}</h5>
                                        <p class="text-xs text-gray-500">ID: ${item.edukator_id}</p>
                                    </div>
                                    <div class="text-right">
                                        <span class="px-2 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg block w-fit ml-auto mb-1">
                                            Z-Score: ${item.z_score}
                                        </span>
                                        <div class="h-8 flex items-center justify-end opacity-80">${sparkline}</div>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-4 text-sm mt-3 bg-gray-50 p-3 rounded-lg">
                                    <div>
                                        <p class="text-xs text-gray-500 mb-1">Gaji Saat Ini</p>
                                        <p class="font-bold text-gray-800">Rp ${formatRupiah(item.total_gaji)}</p>
                                    </div>
                                    <div>
                                        <p class="text-xs text-gray-500 mb-1">Rata-rata Historis</p>
                                        <p class="font-bold text-gray-600">Rp ${formatRupiah(item.rata_rata)}</p>
                                    </div>
                                </div>
                                <p class="text-xs text-rose-600 mt-2 font-medium flex items-center gap-1">
                                    <i class="fa-solid fa-circle-info"></i> ${item.pesan}
                                </p>
                            </div>
                        `}).join('')}
                    </div>
                `;
            }
            
            openModal();

        } catch (err) {
            console.error("Anomaly Check Error:", err);
            if(window.notifyError) {
                window.notifyError("Gagal", err.message);
            } else {
                alert("Gagal: " + err.message);
            }
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
  };

  // Init
  loadTarifNames().catch(() => {});
  setupAnomalyDetection();
})();
