(() => {
  const state = {
    privatSiswa: [],
    programs: [],
    mapel: [],
    edukator: [],
    privatRows: [],
    kelasRows: [],
    kelasGroups: [],
    isAdmin: false,
    detailSlots: [],
    fillSlotIndex: null,
  };

  const dayOptions = [
    "senin",
    "selasa",
    "rabu",
    "kamis",
    "jumat",
    "sabtu",
    "minggu",
  ];

  const parseData = (payload) => {
    if (payload && typeof payload === "object" && payload.success) {
      return payload.data;
    }
    return payload;
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

  const fetchJson = async (url, options) => {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Permintaan gagal.");
    }
    return parseData(data);
  };

  const buildOptions = (items, placeholder) => {
    if (!items.length) {
      return `<option value="">${placeholder}</option>`;
    }
    const options = items
      .map((item) => `<option value="${item.id}">${item.nama || item.label}</option>`)
      .join("");
    return `<option value="">${placeholder}</option>${options}`;
  };

  const renderPrivatList = (rows) => {
    const container = document.getElementById("privatList");
    const empty = document.getElementById("privatEmpty");
    container.innerHTML = "";
    state.privatRows = rows;
    if (!rows.length) {
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    rows.forEach((row) => {
      const totalPertemuan = Number(row.jumlah_pertemuan || 0);
      const completed = Number(row.completed_jadwal || 0);
      const progressText = totalPertemuan ? `${completed} / ${totalPertemuan}` : "-";
      const div = document.createElement("div");
      div.className = "schedule-card";
      div.innerHTML = `
        <div class="schedule-info">
          <div class="schedule-title">${row.siswa_nama || "-"}</div>
          <div class="schedule-sub">${row.program_nama || "-"}</div>
        </div>
        <div class="schedule-actions">
          <div class="schedule-progress">Progress: ${progressText}</div>
          ${
            state.isAdmin
              ? `<button class="primary-button" data-action="detail" data-enrollment="${row.enrollment_id}">Lihat</button>
                 <button class="ghost-button" data-action="delete" data-enrollment="${row.enrollment_id}">Hapus</button>`
              : ""
          }
        </div>
      `;
      container.appendChild(div);
    });
  };

  const renderKelasList = (rows) => {
    const container = document.getElementById("kelasList");
    const empty = document.getElementById("kelasEmpty");
    container.innerHTML = "";
    state.kelasRows = rows;
    if (!rows.length) {
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    rows.forEach((row) => {
      const div = document.createElement("div");
      div.className = "schedule-card";
      div.innerHTML = `
        <div class="schedule-info">
          <div class="schedule-title">${row.kelas_nama || "-"}</div>
          <div class="schedule-sub">${row.program_list || "Program belum ditentukan"}</div>
        </div>
        <div class="schedule-actions">
          ${
            state.isAdmin
              ? `<button class="primary-button" data-action="detail" data-kelas="${row.kelas_id}">Lihat</button>
                 <button class="ghost-button" data-action="delete" data-kelas="${row.kelas_id}">Hapus</button>`
              : ""
          }
        </div>
      `;
      container.appendChild(div);
    });
  };

  const renderPrivatSlots = (jumlah, startIndex = 1) => {
    const slotsContainer = document.getElementById("privatSlots");
    slotsContainer.innerHTML = "";
    const total = jumlah > 0 ? jumlah : 1;
    for (let i = 1; i <= total; i += 1) {
      const card = document.createElement("div");
      card.className = "slot-card";
      card.innerHTML = `
        <div class="slot-title">Pertemuan ${startIndex + i - 1}</div>
        <div class="slot-grid">
          <label>
            Tanggal
            <input type="date" class="slot-tanggal" />
          </label>
          <label>
            Jam Mulai
            <input type="time" class="slot-mulai" />
          </label>
          <label>
            Jam Selesai
            <input type="time" class="slot-selesai" />
          </label>
          <label>
            Edukator
            <select class="slot-edukator">
              ${buildOptions(state.edukator, "Pilih edukator")}
            </select>
          </label>
          <label class="full">
            Mapel
            <select class="slot-mapel">
              ${buildOptions(state.mapel, "Pilih mapel")}
            </select>
          </label>
        </div>
      `;
      slotsContainer.appendChild(card);
    }

    const cards = Array.from(slotsContainer.querySelectorAll(".slot-card"));
    if (!cards.length) return;
    const firstCard = cards[0];
    const firstStart = firstCard.querySelector(".slot-mulai");
    const firstEnd = firstCard.querySelector(".slot-selesai");
    const syncTimes = () => {
      const startValue = firstStart.value;
      const endValue = firstEnd.value;
      cards.slice(1).forEach((card) => {
        const startInput = card.querySelector(".slot-mulai");
        const endInput = card.querySelector(".slot-selesai");
        if (startValue && !startInput.value) startInput.value = startValue;
        if (endValue && !endInput.value) endInput.value = endValue;
      });
    };
    firstStart.addEventListener("change", syncTimes);
    firstEnd.addEventListener("change", syncTimes);
  };

  const renderKelasSlots = () => {
    const container = document.getElementById("kelasSlots");
    container.innerHTML = "";
    addKelasSlot();
  };

  const addKelasSlot = () => {
    const container = document.getElementById("kelasSlots");
    const card = document.createElement("div");
    card.className = "slot-card";
    card.innerHTML = `
      <div class="slot-title">Slot Hari</div>
      <button type="button" class="slot-remove">Hapus</button>
      <div class="slot-grid">
        <label>
          Hari
          <select class="slot-hari" required>
            ${dayOptions.map((day) => `<option value="${day}">${day}</option>`).join("")}
          </select>
        </label>
        <label>
          Jam Mulai
          <input type="time" class="slot-mulai" />
        </label>
        <label>
          Jam Selesai
          <input type="time" class="slot-selesai" />
        </label>
        <label class="full">
          Mapel
          <select class="slot-mapel" required>
            ${buildOptions(state.mapel, "Pilih mapel")}
          </select>
        </label>
      </div>
    `;
    const removeBtn = card.querySelector(".slot-remove");
    removeBtn.addEventListener("click", () => {
      const all = container.querySelectorAll(".slot-card");
      if (all.length <= 1) return;
      card.remove();
    });
    container.appendChild(card);
  };

  const updatePrivatForm = (forcedCount = null, startIndex = 1) => {
    const select = document.getElementById("privatSiswa");
    const selected = state.privatSiswa.find((item) => String(item.enrollment_id) === select.value);
    const info = document.getElementById("privatProgramText");
    if (!selected) {
      info.textContent = "-";
      renderPrivatSlots(0);
      return;
    }
    const pertemuan = selected.jumlah_pertemuan || 0;
    info.textContent = `${selected.program_nama || "-"} (${pertemuan} pertemuan)`;
    const target = forcedCount || pertemuan || 1;
    renderPrivatSlots(target, startIndex);
  };

  
  const renderKelasGroups = () => {
    const select = document.getElementById("kelasProgram");
    if (!select) return;
    const options = [
      `<option value="">Pilih kelas</option>`,
      `<option value="__new__">Buat kelas baru</option>`,
    ];
    state.kelasGroups.forEach((group) => {
      options.push(`<option value="${group.id}">${group.nama}</option>`);
    });
    select.innerHTML = options.join("");
  };

  const renderKelasProgramChecklist = () => {
    const container = document.getElementById("kelasProgramChecklist");
    if (!container) return;
    container.innerHTML = "";
    state.programs.forEach((program) => {
      const label = document.createElement("label");
      label.innerHTML = `
        <input type="checkbox" value="${program.id}" />
        <span>${program.nama}</span>
      `;
      container.appendChild(label);
    });
  };

  const getSelectedProgramIds = () => {
    const inputs = Array.from(
      document.querySelectorAll("#kelasProgramChecklist input:checked")
    );
    return inputs.map((input) => Number(input.value));
  };

  const toggleKelasMode = () => {
    const select = document.getElementById("kelasProgram");
    const createSection = document.getElementById("kelasCreateSection");
    const infoSection = document.getElementById("kelasProgramInfo");
    const listEl = document.getElementById("kelasProgramList");
    if (!select) return;
    const value = select.value;
    if (value === "__new__") {
      if (createSection) createSection.classList.remove("hidden");
      if (infoSection) infoSection.classList.add("hidden");
      return;
    }
    if (createSection) createSection.classList.add("hidden");
    if (infoSection) infoSection.classList.remove("hidden");
    const selected = state.kelasGroups.find((item) => String(item.id) === String(value));
    if (listEl) {
      listEl.textContent = selected?.program_names || "-";
    }
  };

  const updateKelasSiswa = async () => {
    const select = document.getElementById("kelasProgram");
    const container = document.getElementById("kelasSiswaList");
    if (!select) return;
    const kelasId = select.value;
    if (!kelasId) {
      container.textContent = "Pilih kelas terlebih dahulu.";
      return;
    }

    if (kelasId === "__new__") {
      const programIds = getSelectedProgramIds();
      if (!programIds.length) {
        container.textContent = "Pilih program kelas terlebih dahulu.";
        return;
      }
      try {
        const rows = await fetchJson(
          `/api/jadwal/kelas/programs/siswa?program_ids=${programIds.join(",")}`
        );
        if (!rows.length) {
          container.textContent = "Belum ada siswa pada program terpilih.";
          return;
        }
        container.innerHTML = rows
          .map((row) => `${row.siswa_nama} - ${row.program_nama}`)
          .join("<br />");
      } catch (err) {
        container.textContent = "Gagal memuat siswa.";
      }
      return;
    }

    try {
      const rows = await fetchJson(`/api/jadwal/kelas/${kelasId}/siswa`);
      if (!rows.length) {
        container.textContent = "Belum ada siswa pada kelas ini.";
        return;
      }
      container.innerHTML = rows
        .map((row) => `${row.siswa_nama} - ${row.program_nama}`)
        .join("<br />");
    } catch (err) {
      container.textContent = "Gagal memuat siswa.";
    }
  };

  const loadLists = async () => {
    const [privatRows, kelasRows] = await Promise.all([
      fetchJson("/api/jadwal/privat/summary"),
      fetchJson("/api/jadwal/kelas/summary"),
    ]);
    renderPrivatList(privatRows || []);
    renderKelasList(kelasRows || []);
  };

  const initTabs = () => {
    const buttons = document.querySelectorAll(".tab-button");
    const contents = document.querySelectorAll(".tab-content");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        contents.forEach((content) => {
          content.classList.toggle("hidden", content.dataset.tab !== btn.dataset.tab);
        });
      });
    });
  };

  const initForms = () => {
    const privatModal = document.getElementById("privatModal");
    const kelasModal = document.getElementById("kelasModal");

    const openPrivatModal = document.getElementById("openPrivatModal");
    const openKelasModal = document.getElementById("openKelasModal");
    const closePrivatModal = document.getElementById("closePrivatModal");
    const closeKelasModal = document.getElementById("closeKelasModal");
    const cancelPrivatModal = document.getElementById("cancelPrivatModal");
    const cancelKelasModal = document.getElementById("cancelKelasModal");

    if (openPrivatModal) {
      openPrivatModal.addEventListener("click", () => {
        state.fillSlotIndex = null;
        updatePrivatForm();
        openModal(privatModal);
      });
    }
    if (openKelasModal) {
      openKelasModal.addEventListener("click", () => {
        renderKelasSlots();
        toggleKelasMode();
        updateKelasSiswa();
        openModal(kelasModal);
      });
    }
    if (closePrivatModal) {
      closePrivatModal.addEventListener("click", () => closeModal(privatModal));
    }
    if (closeKelasModal) {
      closeKelasModal.addEventListener("click", () => closeModal(kelasModal));
    }
    if (cancelPrivatModal) {
      cancelPrivatModal.addEventListener("click", () => closeModal(privatModal));
    }
    if (cancelKelasModal) {
      cancelKelasModal.addEventListener("click", () => closeModal(kelasModal));
    }
    if (privatModal) {
      privatModal.addEventListener("click", (event) => {
        if (event.target === privatModal) closeModal(privatModal);
      });
    }
    if (kelasModal) {
      kelasModal.addEventListener("click", (event) => {
        if (event.target === kelasModal) closeModal(kelasModal);
      });
    }

    const privatSelect = document.getElementById("privatSiswa");
    privatSelect.addEventListener("change", () => {
      state.fillSlotIndex = null;
      updatePrivatForm();
    });

    document.getElementById("kelasProgram").addEventListener("change", () => {
      toggleKelasMode();
      updateKelasSiswa();
    });
    const kelasChecklist = document.getElementById("kelasProgramChecklist");
    if (kelasChecklist) {
      kelasChecklist.addEventListener("change", (event) => {
        if (event.target && event.target.matches("input[type='checkbox']")) {
          updateKelasSiswa();
        }
      });
    }
    document.getElementById("addKelasSlot").addEventListener("click", addKelasSlot);

    document.getElementById("privatForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const error = document.getElementById("privatError");
      error.textContent = "";
      try {
        const enrollmentId = privatSelect.value;
        if (!enrollmentId) throw new Error("Siswa wajib dipilih.");
        const rawSlots = Array.from(document.querySelectorAll("#privatSlots .slot-card")).map(
          (card) => ({
            tanggal: card.querySelector(".slot-tanggal").value,
            jam_mulai: card.querySelector(".slot-mulai").value,
            jam_selesai: card.querySelector(".slot-selesai").value,
            edukator_id: card.querySelector(".slot-edukator").value,
            mapel_id: card.querySelector(".slot-mapel").value,
          })
        );
        const filledSlots = rawSlots.filter((slot) => slot.edukator_id && slot.mapel_id);
        const partialSlots = rawSlots.filter((slot) => {
          const hasTime = slot.jam_mulai || slot.jam_selesai;
          return hasTime && !(slot.jam_mulai && slot.jam_selesai);
        });
        if (partialSlots.length) {
          throw new Error("Lengkapi slot yang sudah diisi.");
        }
        await fetchJson("/api/jadwal/privat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enrollment_id: enrollmentId, slots: filledSlots }),
        });
        if (window.notifySuccess) {
          window.notifySuccess("Jadwal privat disimpan", "Slot terisi diperbarui.");
        }
        await loadLists();
        document.getElementById("privatForm").reset();
        updatePrivatForm();
        closeModal(document.getElementById("privatModal"));
      } catch (err) {
        error.textContent = err.message;
        if (window.notifyError) {
          window.notifyError("Gagal menyimpan jadwal privat", err.message);
        }
      }
    });

    document.getElementById("kelasForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const error = document.getElementById("kelasError");
      error.textContent = "";
      try {
        const kelasValue = document.getElementById("kelasProgram").value;
        const kelasId = kelasValue && kelasValue !== "__new__" ? kelasValue : null;
        const kelasNama = kelasValue === "__new__" ? document.getElementById("kelasNama").value.trim() : null;
        const programIds = kelasValue === "__new__" ? getSelectedProgramIds() : [] ;
        const edukatorId = document.getElementById("kelasEdukator").value;
        const tanggalMulai = document.getElementById("kelasTanggalMulai").value;
        const tanggalAkhir = document.getElementById("kelasTanggalAkhir").value;
        if (!kelasValue) throw new Error("Kelas wajib dipilih.");
        if (kelasValue === "__new__" && !kelasNama) throw new Error("Nama kelas wajib diisi.");
        if (kelasValue === "__new__" && !programIds.length) throw new Error("Program kelas wajib dipilih.");
        if (!edukatorId) throw new Error("Edukator wajib dipilih.");
        const slots = Array.from(document.querySelectorAll("#kelasSlots .slot-card")).map(
          (card) => ({
            hari: card.querySelector(".slot-hari").value,
            jam_mulai: card.querySelector(".slot-mulai").value,
            jam_selesai: card.querySelector(".slot-selesai").value,
            mapel_id: card.querySelector(".slot-mapel").value,
          })
        );
        const invalidTime = slots.some(
          (slot) =>
            (slot.jam_mulai && !slot.jam_selesai) || (!slot.jam_mulai && slot.jam_selesai)
        );
        if (invalidTime) {
          throw new Error("Jam mulai dan selesai harus diisi bersama.");
        }
        await fetchJson("/api/jadwal/kelas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kelas_id: kelasId,
            kelas_nama: kelasNama,
            program_ids: programIds,
            edukator_id: edukatorId,
            tanggal_mulai: tanggalMulai,
            tanggal_akhir: tanggalAkhir,
            slots,
          }),
        });
        if (window.notifySuccess) {
          window.notifySuccess("Jadwal kelas disimpan", "Slot mingguan diperbarui.");
        }
        await loadLists();
        const updatedGroups = await fetchJson("/api/jadwal/kelas/groups");
        state.kelasGroups = updatedGroups || [];
        renderKelasGroups();
        toggleKelasMode();
        document.getElementById("kelasForm").reset();
        renderKelasSlots();
        await updateKelasSiswa();
        closeModal(document.getElementById("kelasModal"));
      } catch (err) {
        error.textContent = err.message;
        if (window.notifyError) {
          window.notifyError("Gagal menyimpan jadwal kelas", err.message);
        }
      }
    });

    const editModal = document.getElementById("editModal");
    const closeEditModal = document.getElementById("closeEditModal");
    const cancelEditModal = document.getElementById("cancelEditModal");
    if (closeEditModal) {
      closeEditModal.addEventListener("click", () => closeModal(editModal));
    }
    if (cancelEditModal) {
      cancelEditModal.addEventListener("click", () => closeModal(editModal));
    }
    if (editModal) {
      editModal.addEventListener("click", (event) => {
        if (event.target === editModal) closeModal(editModal);
      });
    }

    document.getElementById("editForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const error = document.getElementById("editError");
      error.textContent = "";
      try {
        const id = document.getElementById("editJadwalId").value;
        const jamMulai = document.getElementById("editMulai").value;
        const jamSelesai = document.getElementById("editSelesai").value;
        if ((jamMulai && !jamSelesai) || (!jamMulai && jamSelesai)) {
          throw new Error("Jam mulai dan selesai harus diisi bersama.");
        }
        await fetchJson(`/api/jadwal/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tanggal: document.getElementById("editTanggal").value,
            jam_mulai: jamMulai,
            jam_selesai: jamSelesai,
            edukator_id: document.getElementById("editEdukator").value,
            mapel_id: document.getElementById("editMapel").value,
          }),
        });
        if (window.notifySuccess) {
          window.notifySuccess("Jadwal diperbarui", "Slot jadwal tersimpan.");
        }
        await loadLists();
        closeModal(editModal);
      } catch (err) {
        error.textContent = err.message;
        if (window.notifyError) {
          window.notifyError("Gagal memperbarui jadwal", err.message);
        }
      }
    });

    const detailModal = document.getElementById("detailModal");
    const closeDetailModal = document.getElementById("closeDetailModal");
    const closeDetailFooter = document.getElementById("closeDetailFooter");
    if (closeDetailModal) {
      closeDetailModal.addEventListener("click", () => closeModal(detailModal));
    }
    if (closeDetailFooter) {
      closeDetailFooter.addEventListener("click", () => closeModal(detailModal));
    }
    if (detailModal) {
      detailModal.addEventListener("click", (event) => {
        if (event.target === detailModal) closeModal(detailModal);
      });
    }

    const kelasDetailModal = document.getElementById("kelasDetailModal");
    const closeKelasDetailModal = document.getElementById("closeKelasDetailModal");
    const closeKelasDetailFooter = document.getElementById("closeKelasDetailFooter");
    if (closeKelasDetailModal) {
      closeKelasDetailModal.addEventListener("click", () => closeModal(kelasDetailModal));
    }
    if (closeKelasDetailFooter) {
      closeKelasDetailFooter.addEventListener("click", () => closeModal(kelasDetailModal));
    }
    if (kelasDetailModal) {
      kelasDetailModal.addEventListener("click", (event) => {
        if (event.target === kelasDetailModal) closeModal(kelasDetailModal);
      });
    }

    document.getElementById("detailRows").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      if (button.dataset.action === "edit") {
        const row = state.detailSlots.find((item) => String(item.id) === button.dataset.id);
        if (!row) return;
        openEditModal(row);
      }
      if (button.dataset.action === "fill") {
        const enrollmentId = button.dataset.enrollment;
        const pertemuan = Number(button.dataset.pertemuan || 1);
        openPrivatModalWith(enrollmentId, pertemuan);
        closeModal(detailModal);
      }
    });

    document.getElementById("privatList").addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      if (action === "detail") {
        await openDetailModal(button.dataset.enrollment);
      }
      if (action === "delete") {
        const enrollmentId = button.dataset.enrollment;
        if (window.confirm("Hapus seluruh jadwal privat untuk siswa ini?")) {
          try {
            await fetchJson(`/api/jadwal/privat/enrollment/${enrollmentId}`, { method: "DELETE" });
            if (window.notifySuccess) {
              window.notifySuccess("Jadwal privat dihapus", "Silakan tambah jadwal baru.");
            }
            await loadLists();
          } catch (err) {
            if (window.notifyError) {
              window.notifyError("Gagal menghapus jadwal privat", err.message);
            }
          }
        }
      }
    });

    document.getElementById("kelasList").addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      if (button.dataset.action === "detail") {
        await openKelasDetailModal(button.dataset.kelas);
      }
      if (button.dataset.action === "delete") {
        const kelasId = button.dataset.kelas;
        if (window.confirm("Hapus seluruh jadwal kelas untuk kelas ini?")) {
          try {
            await fetchJson(`/api/jadwal/kelas/${kelasId}`, { method: "DELETE" });
            if (window.notifySuccess) {
              window.notifySuccess("Jadwal kelas dihapus", "Silakan tambah jadwal baru.");
            }
            await loadLists();
          } catch (err) {
            if (window.notifyError) {
              window.notifyError("Gagal menghapus jadwal kelas", err.message);
            }
          }
        }
      }
    });
  };

  const openPrivatModalWith = (enrollmentId, pertemuan) => {
    const select = document.getElementById("privatSiswa");
    if (select) {
      select.value = enrollmentId;
    }
    state.fillSlotIndex = pertemuan || 1;
    updatePrivatForm(1, state.fillSlotIndex);
    openModal(document.getElementById("privatModal"));
  };

  const openEditModal = (row) => {
    const editModal = document.getElementById("editModal");
    document.getElementById("editJadwalId").value = row.id;
    document.getElementById("editTanggal").value = row.tanggal || "";
    document.getElementById("editMulai").value = row.jam_mulai || "";
    document.getElementById("editSelesai").value = row.jam_selesai || "";
    document.getElementById("editEdukator").value = row.edukator_id || "";
    document.getElementById("editMapel").value = row.mapel_id || "";
    openModal(editModal);
  };

  const openDetailModal = async (enrollmentId) => {
    const modal = document.getElementById("detailModal");
    const rows = await fetchJson(`/api/jadwal/privat/${enrollmentId}/slots`);
    if (!rows.length) {
      return;
    }
    const jumlahPertemuan = Number(rows[0].jumlah_pertemuan || 0);
    const subtitle = document.getElementById("detailSubtitle");
    subtitle.textContent = `${rows[0].siswa_nama || "-"} - ${rows[0].program_nama || "-"}`;

    const detailRows = document.getElementById("detailRows");
    detailRows.innerHTML = "";
    const filled = rows.filter((row) => row.id);
    state.detailSlots = filled;
    const entries = [];
    for (let i = 1; i <= (jumlahPertemuan || filled.length); i += 1) {
      entries.push(filled[i - 1] || null);
    }

    entries.forEach((entry, index) => {
      const div = document.createElement("div");
      div.className = "detail-row";
      if (entry) {
        const statusText = entry.status_jadwal === "completed" ? "Selesai" : "Belum";
        const statusClass = entry.status_jadwal === "completed" ? "completed" : "pending";
        const jamText = entry.jam_mulai
          ? `${entry.jam_mulai}${entry.jam_selesai ? " - " + entry.jam_selesai : ""}`
          : "-";
        div.innerHTML = `
          <div>Pertemuan ${index + 1}</div>
          <div>${entry.edukator_nama || "-"}</div>
          <div>${entry.mapel_nama || "-"}</div>
          <div>${entry.materi || "-"}</div>
          <div>${formatDate(entry.tanggal)}</div>
          <div>${jamText}</div>
          <div><span class="status-pill ${statusClass}">${statusText}</span></div>
          <div>
            <button class="link-button" data-action="edit" data-id="${entry.id}">Edit</button>
          </div>
        `;
      } else {
        div.innerHTML = `
          <div>Pertemuan ${index + 1}</div>
          <div>-</div>
          <div>-</div>
          <div>-</div>
          <div>-</div>
          <div>-</div>
          <div><span class="status-pill empty">Slot tersedia</span></div>
          <div>
            <button class="link-button" data-action="fill" data-enrollment="${enrollmentId}" data-pertemuan="${index + 1}">Isi</button>
          </div>
        `;
      }
      detailRows.appendChild(div);
    });

    openModal(modal);
  };

  const openKelasDetailModal = async (kelasId) => {
    const modal = document.getElementById("kelasDetailModal");
    const rows = await fetchJson(`/api/jadwal/kelas/${kelasId}/slots`);
    const detailRows = document.getElementById("kelasDetailRows");
    detailRows.innerHTML = "";
    if (!rows.length) {
      return;
    }

    const subtitle = document.getElementById("kelasDetailSubtitle");
    subtitle.textContent = rows[0].kelas_nama || "-";

    rows.forEach((row) => {
      const statusText = row.status_jadwal === "completed" ? "Selesai" : "Belum";
      const statusClass = row.status_jadwal === "completed" ? "completed" : "pending";
      const jamText = row.jam_mulai
        ? `${row.jam_mulai}${row.jam_selesai ? " - " + row.jam_selesai : ""}`
        : "-";
      const div = document.createElement("div");
      div.className = "detail-row kelas";
      div.innerHTML = `
        <div>${formatDate(row.tanggal)}</div>
        <div>${jamText}</div>
        <div>${row.edukator_nama || "-"}</div>
        <div>${row.mapel_nama || "-"}</div>
        <div>${row.materi || "-"}</div>
        <div><span class="status-pill ${statusClass}">${statusText}</span></div>
        <div>-</div>
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
    initTabs();
    initForms();
    try {
      const session = await fetchJson("/api/auth/session");
      const role = session && session.loggedIn ? session.user.role : null;
      const isAdmin = role === "admin_cabang" || role === "super_admin";
      state.isAdmin = isAdmin;

      if (!isAdmin) {
        const privatButton = document.getElementById("openPrivatModal");
        const kelasButton = document.getElementById("openKelasModal");
        if (privatButton) privatButton.style.display = "none";
        if (kelasButton) kelasButton.style.display = "none";
      }

      if (isAdmin) {
        const [mapelRows, edukatorRows, programRows, privatRows, kelasGroups] = await Promise.all([
          fetchJson("/api/mapel"),
          fetchJson("/api/edukator"),
          fetchJson("/api/program"),
          fetchJson("/api/jadwal/privat/siswa"),
          fetchJson("/api/jadwal/kelas/groups"),
        ]);

        state.mapel = (mapelRows || []).filter((item) => item.is_active !== 0);
        state.edukator = (edukatorRows || []).filter((item) => item.is_active !== 0);
        state.programs = (programRows || []).filter((item) => item.tipe_les === "kelas");
        state.privatSiswa = privatRows || [];
        state.kelasGroups = kelasGroups || [];

        const privatSelect = document.getElementById("privatSiswa");
        if (!state.privatSiswa.length) {
          privatSelect.innerHTML = `<option value="">Belum ada siswa privat</option>`;
        } else {
          privatSelect.innerHTML =
            `<option value="">Pilih siswa</option>` +
            state.privatSiswa
              .map(
                (row) =>
                  `<option value="${row.enrollment_id}">${row.siswa_nama} - ${row.program_nama}</option>`
              )
              .join("");
        }

        renderKelasGroups();
        renderKelasProgramChecklist();
        toggleKelasMode();
        document.getElementById("kelasEdukator").innerHTML = buildOptions(
          state.edukator,
          "Pilih edukator"
        );
        document.getElementById("editEdukator").innerHTML = buildOptions(
          state.edukator,
          "Pilih edukator"
        );
        document.getElementById("editMapel").innerHTML = buildOptions(
          state.mapel,
          "Pilih mapel"
        );

        updatePrivatForm();
        renderKelasSlots();
        await updateKelasSiswa();
      }

      await loadLists();
    } catch (err) {
      console.error(err);
      await loadLists();
    }
  };

  init();
})();
