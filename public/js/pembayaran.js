(() => {
  const state = {
    role: null,
    data: [],
    tagihan: [],
    search: "",
    dateStart: "",
    dateEnd: "",
    method: "",
    month: "",
    pendingTagihanId: null,
    page: 1,
    pageSize: 10,
  };

  const fetchJson = async (url, options = {}) => {
    const requester = window.api?.request || fetch;
    const res = await requester(url, { credentials: "same-origin", ...options });
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

  const getMonthRange = (monthValue) => {
    if (!monthValue) return { start: "", end: "" };
    const [year, month] = monthValue.split("-");
    if (!year || !month) return { start: "", end: "" };
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    return {
      start: `${year}-${month}-01`,
      end: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
    };
  };

  const render = () => {
    const body = document.getElementById("pembayaranBody");
    const empty = document.getElementById("pembayaranEmpty");
    const pager = document.getElementById("pembayaranPager");
    if (!body) return;
    body.innerHTML = "";

    const filtered = state.data.filter((item) => {
      const keyword = `${item.siswa_nama} ${item.program_nama}`.toLowerCase();
      const matchSearch = keyword.includes(state.search.toLowerCase());
      const matchMethod = state.method ? item.metode_bayar === state.method : true;

      let matchDate = true;
      if (state.dateStart) {
        const start = new Date(state.dateStart);
        const rowDate = new Date(item.tanggal_bayar);
        matchDate = matchDate && rowDate >= start;
      }
      if (state.dateEnd) {
        const end = new Date(state.dateEnd);
        end.setHours(23, 59, 59, 999);
        const rowDate = new Date(item.tanggal_bayar);
        matchDate = matchDate && rowDate <= end;
      }
      return matchSearch && matchMethod && matchDate;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * state.pageSize;
    const pageRows = filtered.slice(start, start + state.pageSize);

    if (pager) {
      if (filtered.length <= state.pageSize) {
        pager.classList.add("hidden");
      } else {
        pager.classList.remove("hidden");
        pager.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-500 font-semibold">Halaman ${state.page} dari ${totalPages}</span>
            <div class="flex gap-2">
              <button class="w-8 h-8 flex items-center justify-center rounded-lg border ${
                state.page === 1
                  ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                  : "bg-white text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
              } transition" type="button" data-page="prev" ${state.page === 1 ? "disabled" : ""}>
                <i class="fa-solid fa-chevron-left text-xs"></i>
              </button>
              <button class="w-8 h-8 flex items-center justify-center rounded-lg border ${
                state.page === totalPages
                  ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                  : "bg-white text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
              } transition" type="button" data-page="next" ${state.page === totalPages ? "disabled" : ""}>
                <i class="fa-solid fa-chevron-right text-xs"></i>
              </button>
            </div>
          </div>
        `;
        pager.querySelectorAll("button").forEach((btn) => {
          btn.addEventListener("click", () => {
            if (btn.disabled) return;
            state.page = btn.dataset.page === "prev" ? state.page - 1 : state.page + 1;
            render();
          });
        });
      }
    }

    pageRows.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="py-3 pr-4">${item.siswa_nama}</td>
        <td class="py-3 pr-4">${item.program_nama}</td>
        <td class="py-3 pr-4">${formatRupiah(item.nominal)}</td>
        <td class="py-3 pr-4 capitalize">${item.metode_bayar}</td>
        <td class="py-3 pr-4">${formatDate(item.tanggal_bayar)}</td>
        <td class="py-3 pr-4 capitalize">${item.status_tagihan}</td>
        <td class="py-3">${item.catatan || "-"}</td>
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
    const data = await fetchJson(`/api/pembayaran${query ? `?${query}` : ""}`);
    state.data = data || [];
    render();
  };

  const loadTagihan = async () => {
    const data = await fetchJson("/api/tagihan");
    state.tagihan = (data || []).filter((item) => item.status_tagihan !== "lunas");
    const select = document.getElementById("tagihanSelect");
    if (!select) return;
    select.innerHTML = "<option value=\"\">Pilih tagihan</option>";
    state.tagihan.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = `${item.siswa_nama} - ${item.program_nama} (${formatRupiah(item.nominal)})`;
      option.dataset.nominal = item.nominal;
      select.appendChild(option);
    });
    if (state.pendingTagihanId) {
      const target = state.pendingTagihanId;
      state.pendingTagihanId = null;
      setTagihanSelection(target);
    }
  };

  // --- Modal Helpers ---
  const toggleModal = (modalId, show) => {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const card = modal.querySelector('.modal-card');
    if (show) {
      modal.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
      if (card) {
        card.classList.remove('scale-95');
        card.classList.add('scale-100');
      }
    } else {
      modal.classList.add('hidden', 'opacity-0', 'pointer-events-none');
      if (card) {
        card.classList.add('scale-95');
        card.classList.remove('scale-100');
      }
    }
  };

  const openModal = () => {
    toggleModal("pembayaranModal", true);
  };

  const closeModal = () => {
    toggleModal("pembayaranModal", false);
  };

  const init = async () => {
    const session = await fetchJson("/api/auth/session");
    state.role = session.user?.role || null;
    const addBtn = document.getElementById("addPembayaranBtn");
    if (addBtn && state.role !== "admin_cabang") {
      addBtn.style.display = "none";
    }

    const monthInput = document.getElementById("pembayaranMonth");
    const dateStart = document.getElementById("pembayaranDateStart");
    const dateEnd = document.getElementById("pembayaranDateEnd");
    if (monthInput) {
      const now = new Date();
      const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      if (!monthInput.value) monthInput.value = defaultMonth;
      state.month = monthInput.value;
      const range = getMonthRange(state.month);
      state.dateStart = range.start;
      state.dateEnd = range.end;
      if (dateStart) dateStart.value = range.start;
      if (dateEnd) dateEnd.value = range.end;
      monthInput.addEventListener("change", (event) => {
        state.month = event.target.value;
        const updated = getMonthRange(state.month);
        state.dateStart = updated.start;
        state.dateEnd = updated.end;
        if (dateStart) dateStart.value = updated.start;
        if (dateEnd) dateEnd.value = updated.end;
        state.page = 1;
        load();
      });
    }

    await load();
    if (state.role === "admin_cabang") {
      await loadTagihan();
    }

    const searchInput = document.getElementById("pembayaranSearch");
    if (searchInput) {
      searchInput.addEventListener("input", (event) => {
        state.search = event.target.value;
        state.page = 1;
        render();
      });
    }

    if (dateStart) {
      dateStart.addEventListener("change", (event) => {
        state.dateStart = event.target.value;
        state.page = 1;
        render();
      });
    }

    if (dateEnd) {
      dateEnd.addEventListener("change", (event) => {
        state.dateEnd = event.target.value;
        state.page = 1;
        render();
      });
    }

    const methodSelect = document.getElementById("pembayaranMethod");
    if (methodSelect) {
      methodSelect.addEventListener("change", (event) => {
        state.method = event.target.value;
        state.page = 1;
        render();
      });
    }

    const modal = document.getElementById("pembayaranModal");
    const closeBtn = document.getElementById("closePembayaranModal");
    const cancelBtn = document.getElementById("cancelPembayaranModal");
    if (addBtn) addBtn.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    if (modal) {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
      });
    }

    const tagihanSelect = document.getElementById("tagihanSelect");
    const nominalInput = document.getElementById("pembayaranNominal");
    if (tagihanSelect && nominalInput) {
      tagihanSelect.addEventListener("change", (event) => {
        const selected = event.target.selectedOptions[0];
        if (selected && selected.dataset.nominal) {
          nominalInput.value = selected.dataset.nominal;
        }
      });
    }

    const saveBtn = document.getElementById("savePembayaranBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        const error = document.getElementById("pembayaranError");
        if (error) error.textContent = "";
        try {
          const tagihanId = document.getElementById("tagihanSelect").value;
          const nominal = document.getElementById("pembayaranNominal").value;
          const metode = document.getElementById("pembayaranMetode").value;
          const tanggal = document.getElementById("pembayaranTanggal").value;
          const catatan = document.getElementById("pembayaranCatatan").value;

          await fetchJson("/api/pembayaran", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tagihan_id: tagihanId,
              nominal,
              metode_bayar: metode,
              tanggal_bayar: tanggal,
              catatan,
            }),
          });
          if (window.toast.success) {
            window.toast.success("Pembayaran tersimpan", "Data pembayaran berhasil dibuat.");
          }
          closeModal();
          await load();
          await loadTagihan();
          window.dispatchEvent(new CustomEvent("pembayaran:updated"));
        } catch (err) {
          if (error) error.textContent = err.message;
          if (window.toast.error) {
            window.toast.error("Gagal menyimpan pembayaran", err.message);
          }
        }
      });
    }
  };

  const setTagihanSelection = (tagihanId, nominal) => {
    const select = document.getElementById("tagihanSelect");
    const nominalInput = document.getElementById("pembayaranNominal");
    if (!select) return;
    select.value = String(tagihanId);
    if (select.value !== String(tagihanId)) {
      state.pendingTagihanId = tagihanId;
      return;
    }
    const selected = select.selectedOptions[0];
    const valueNominal = nominal || selected?.dataset?.nominal;
    if (nominalInput && valueNominal) {
      nominalInput.value = valueNominal;
    }
  };

  window.openPembayaranModal = async (tagihan) => {
    if (!state.tagihan.length) {
      await loadTagihan();
    }
    if (tagihan?.id) {
      // Calculate remaining amount
      const totalBayar = Number(tagihan.total_bayar || 0);
      const nominal = Number(tagihan.nominal || 0);
      const sisa = Math.max(nominal - totalBayar, 0);
      setTagihanSelection(tagihan.id, sisa);
    }

    // Set default date to today
    const tanggalInput = document.getElementById("pembayaranTanggal");
    if (tanggalInput && !tanggalInput.value) {
      tanggalInput.value = new Date().toISOString().split('T')[0];
    }

    toggleModal("pembayaranModal", true);
  };

  init();
})();
