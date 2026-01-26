(() => {
  const state = {
    role: null,
    data: [],
    enrollments: [],
    search: "",
    status: "aktif",
    month: "",
  };

  const fetchJson = async (url, options) => {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Permintaan gagal.");
    return data && data.success ? data.data : data;
  };

  const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value || 0);

  const formatDate = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
  };

  const render = () => {
    const body = document.getElementById("tagihanBody");
    const empty = document.getElementById("tagihanEmpty");
    if (!body) return;
    body.innerHTML = "";
    const filtered = state.data.filter((item) => {
      const keyword = `${item.siswa_nama} ${item.program_nama}`.toLowerCase();
      const matchSearch = keyword.includes(state.search.toLowerCase());
      const matchStatus =
        state.status === "aktif"
          ? item.status_tagihan !== "lunas"
          : state.status
            ? item.status_tagihan === state.status
            : true;
      return matchSearch && matchStatus;
    });

    filtered.forEach((item) => {
      const totalBayar = Number(item.total_bayar || 0);
      const nominal = Number(item.nominal || 0);
      const sisa = Math.max(nominal - totalBayar, 0);
      const progress = nominal ? Math.min(Math.round((totalBayar / nominal) * 100), 100) : 0;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="py-3 pr-4">${item.siswa_nama}</td>
        <td class="py-3 pr-4">${item.program_nama}</td>
        <td class="py-3 pr-4">${formatRupiah(nominal)}</td>
        <td class="py-3 pr-4">${formatRupiah(totalBayar)}</td>
        <td class="py-3 pr-4">${formatRupiah(sisa)}</td>
        <td class="py-3 pr-4">${progress}%</td>
        <td class="py-3 pr-4">${formatDate(item.tanggal_jatuh_tempo)}</td>
        <td class="py-3 pr-4 capitalize">${item.status_tagihan}</td>
        <td class="py-3">
          ${
            state.role === "admin_cabang"
              ? `<div class="flex gap-2">
                   <button class="text-indigo-600 text-xs detail-btn" data-id="${item.id}">Detail</button>
                   ${
                     item.status_tagihan !== "lunas"
                       ? `<button class="text-emerald-600 text-xs pay-btn" data-id="${item.id}">Bayar</button>`
                       : ""
                   }
                   <button class="text-rose-500 text-xs delete-btn" data-id="${item.id}">Hapus</button>
                 </div>`
              : `<button class="text-indigo-600 text-xs detail-btn" data-id="${item.id}">Detail</button>`
          }
        </td>
      `;
      body.appendChild(row);
    });
    if (empty) {
      empty.style.display = filtered.length ? "none" : "block";
    }
  };

  const load = async () => {
    const params = new URLSearchParams();
    if (state.month) {
      const [year, month] = state.month.split("-");
      if (year && month) {
        params.set("year", year);
        params.set("month", month);
      }
    }
    const query = params.toString();
    const data = await fetchJson(`/api/tagihan${query ? `?${query}` : ""}`);
    state.data = data || [];
    render();
  };

  const loadEnrollments = async () => {
    const data = await fetchJson("/api/tagihan/enrollments");
    state.enrollments = data || [];
    const select = document.getElementById("enrollmentSelect");
    if (!select) return;
    select.innerHTML = "<option value=\"\">Pilih siswa & program</option>";
    state.enrollments.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.enrollment_id;
      option.textContent = `${item.siswa_nama} - ${item.program_nama}`;
      option.dataset.harga = item.harga;
      select.appendChild(option);
    });
  };

  const openModal = () => {
    const modal = document.getElementById("tagihanModal");
    if (modal) modal.classList.remove("hidden");
  };

  const closeModal = () => {
    const modal = document.getElementById("tagihanModal");
    if (modal) modal.classList.add("hidden");
  };

  const init = async () => {
    const session = await fetchJson("/api/auth/session");
    state.role = session.user?.role || null;
    const addBtn = document.getElementById("addTagihanBtn");
    if (addBtn && state.role !== "admin_cabang") {
      addBtn.style.display = "none";
    }
    const filterSelect = document.getElementById("tagihanFilter");
    const monthInput = document.getElementById("tagihanMonth");
    if (filterSelect) {
      filterSelect.value = state.status;
    }
    if (monthInput) {
      const now = new Date();
      const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      if (!monthInput.value) monthInput.value = defaultMonth;
      state.month = monthInput.value;
      monthInput.addEventListener("change", (event) => {
        state.month = event.target.value;
        load();
      });
    }

    await load();
    if (state.role === "admin_cabang") {
      await loadEnrollments();
    }

    const searchInput = document.getElementById("tagihanSearch");
    if (searchInput) {
      searchInput.addEventListener("input", (event) => {
        state.search = event.target.value;
        render();
      });
    }
    if (filterSelect) {
      filterSelect.addEventListener("change", (event) => {
        state.status = event.target.value;
        render();
      });
    }

    const modal = document.getElementById("tagihanModal");
    const closeBtn = document.getElementById("closeTagihanModal");
    const cancelBtn = document.getElementById("cancelTagihanModal");
    if (addBtn) addBtn.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    if (modal) {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
      });
    }

    const enrollmentSelect = document.getElementById("enrollmentSelect");
    const nominalInput = document.getElementById("tagihanNominal");
    if (enrollmentSelect && nominalInput) {
      enrollmentSelect.addEventListener("change", (event) => {
        const selected = event.target.selectedOptions[0];
        if (selected && selected.dataset.harga) {
          nominalInput.value = selected.dataset.harga;
        }
      });
    }

    const saveBtn = document.getElementById("saveTagihanBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        const error = document.getElementById("tagihanError");
        if (error) error.textContent = "";
        try {
          const enrollmentId = document.getElementById("enrollmentSelect").value;
          const jenisTagihan = document.getElementById("jenisTagihan").value;
          const nominal = document.getElementById("tagihanNominal").value;
          const tanggal = document.getElementById("tagihanTanggal").value;

          await fetchJson("/api/tagihan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              enrollment_id: enrollmentId,
              jenis_tagihan: jenisTagihan,
              nominal,
              tanggal_jatuh_tempo: tanggal,
            }),
          });
          if (window.notifySuccess) {
            window.notifySuccess("Tagihan tersimpan", "Data tagihan berhasil dibuat.");
          }
          closeModal();
          await load();
        } catch (err) {
          if (error) error.textContent = err.message;
          if (window.notifyError) {
            window.notifyError("Gagal menyimpan tagihan", err.message);
          }
        }
      });
    }

    const body = document.getElementById("tagihanBody");
    if (body) {
      body.addEventListener("click", async (event) => {
        const detailBtn = event.target.closest(".detail-btn");
        const payBtn = event.target.closest(".pay-btn");
        const deleteBtn = event.target.closest(".delete-btn");

        const button = detailBtn || payBtn || deleteBtn;
        if (!button) return;
        const id = button.dataset.id;
        if (!id) return;

        const item = state.data.find((row) => String(row.id) === String(id));
        if (!item) return;

        if (detailBtn) {
          openDetail(item);
          return;
        }
        if (payBtn) {
          if (window.openPembayaranModal) {
            window.openPembayaranModal(item);
          }
          return;
        }
        if (deleteBtn) {
          if (!confirm("Hapus tagihan ini?")) return;
          try {
            await fetchJson(`/api/tagihan/${id}`, { method: "DELETE" });
            if (window.notifySuccess) {
              window.notifySuccess("Tagihan dihapus", "Data tagihan berhasil dihapus.");
            }
            await load();
          } catch (err) {
            if (window.notifyError) {
              window.notifyError("Gagal menghapus tagihan", err.message);
            }
          }
        }
      });
    }
  };

  const openDetail = (item) => {
    const modal = document.getElementById("tagihanDetailModal");
    const closeBtn = document.getElementById("closeDetailModal");
    const closeBottom = document.getElementById("closeDetailModalBottom");
    const subtitle = document.getElementById("tagihanDetailSubtitle");
    const program = document.getElementById("detailProgram");
    const nominal = document.getElementById("detailNominal");
    const paid = document.getElementById("detailPaid");
    const remaining = document.getElementById("detailRemaining");
    const status = document.getElementById("detailStatus");
    const progressBar = document.getElementById("detailProgressBar");
    const progressText = document.getElementById("detailProgressText");

    if (!modal) return;
    const totalBayar = Number(item.total_bayar || 0);
    const nominalValue = Number(item.nominal || 0);
    const sisa = Math.max(nominalValue - totalBayar, 0);
    const progress = nominalValue ? Math.min(Math.round((totalBayar / nominalValue) * 100), 100) : 0;

    if (subtitle) subtitle.textContent = `${item.siswa_nama} - ${item.program_nama}`;
    if (program) program.textContent = item.program_nama || "-";
    if (nominal) nominal.textContent = formatRupiah(nominalValue);
    if (paid) paid.textContent = formatRupiah(totalBayar);
    if (remaining) remaining.textContent = formatRupiah(sisa);
    if (status) status.textContent = item.status_tagihan || "-";
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `${progress}%`;

    modal.classList.remove("hidden");

    const close = () => modal.classList.add("hidden");
    if (closeBtn) closeBtn.onclick = close;
    if (closeBottom) closeBottom.onclick = close;
    modal.onclick = (event) => {
      if (event.target === modal) close();
    };
  };

  window.addEventListener("pembayaran:updated", () => {
    load();
  });

  init();
})();
