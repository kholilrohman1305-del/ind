(() => {
  const form = document.getElementById("promoForm");
  const resetBtn = document.getElementById("promoReset");
  const searchInput = document.getElementById("promoSearch");

  const promoIdInput = document.getElementById("promoId");
  const programSelect = document.getElementById("promoProgram");
  const namaInput = document.getElementById("promoNama");
  const tipeSelect = document.getElementById("promoTipe");
  const nilaiInput = document.getElementById("promoNilai");
  const mulaiInput = document.getElementById("promoMulai");
  const selesaiInput = document.getElementById("promoSelesai");
  const activeInput = document.getElementById("promoActive");

  const rowsEl = document.getElementById("promoRows");
  const emptyEl = document.getElementById("promoEmpty");

  let cachedRows = [];

  const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, { credentials: "same-origin", ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Permintaan gagal.");
    }
    return data.success ? data.data : data;
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDiskon = (row) => {
    if (row.tipe_diskon === "percent") return `${row.nilai}%`;
    return `Rp ${Number(row.nilai || 0).toLocaleString("id-ID")}`;
  };

  const renderRows = (rows) => {
    rowsEl.innerHTML = "";
    if (!rows.length) {
      emptyEl.classList.remove("hidden");
      return;
    }
    emptyEl.classList.add("hidden");

    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.className = "border-b border-slate-100 hover:bg-slate-50";
      tr.innerHTML = `
        <td class="p-4">
          <div class="font-semibold text-slate-800">${row.nama}</div>
          <div class="text-xs text-slate-400">ID #${row.id}</div>
        </td>
        <td class="p-4">${row.program_nama || "-"}</td>
        <td class="p-4">${formatDate(row.tanggal_mulai)} - ${formatDate(row.tanggal_selesai)}</td>
        <td class="p-4">${formatDiskon(row)}</td>
        <td class="p-4 text-center">
          <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            row.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
          }">
            ${row.is_active ? "Aktif" : "Nonaktif"}
          </span>
        </td>
        <td class="p-4 text-center">
          <button class="link-button" data-action="edit" data-id="${row.id}">Edit</button>
          <button class="link-button text-rose-500" data-action="delete" data-id="${row.id}">Hapus</button>
        </td>
      `;
      rowsEl.appendChild(tr);
    });
  };

  const applyFilter = () => {
    const keyword = (searchInput?.value || "").toLowerCase().trim();
    if (!keyword) {
      renderRows(cachedRows);
      return;
    }
    const filtered = cachedRows.filter(
      (row) =>
        (row.nama && row.nama.toLowerCase().includes(keyword)) ||
        (row.program_nama && row.program_nama.toLowerCase().includes(keyword))
    );
    renderRows(filtered);
  };

  const loadPrograms = async () => {
    const rows = await fetchJson("/api/program");
    const options = rows
      .filter((row) => row.is_active !== 0)
      .map((row) => `<option value="${row.id}">${row.nama}</option>`);
    programSelect.innerHTML = options.length
      ? options.join("")
      : '<option value="">Belum ada program</option>';
  };

  const loadPromo = async () => {
    const rows = await fetchJson("/api/promo");
    cachedRows = rows || [];
    applyFilter();
  };

  const resetForm = () => {
    promoIdInput.value = "";
    namaInput.value = "";
    nilaiInput.value = "";
    activeInput.checked = true;
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 7);
    mulaiInput.value = today.toISOString().slice(0, 10);
    selesaiInput.value = tomorrow.toISOString().slice(0, 10);
    if (programSelect.options.length) {
      programSelect.selectedIndex = 0;
    }
  };

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = {
        program_id: Number(programSelect.value),
        nama: namaInput.value.trim(),
        tipe_diskon: tipeSelect.value,
        nilai: Number(nilaiInput.value || 0),
        tanggal_mulai: mulaiInput.value,
        tanggal_selesai: selesaiInput.value,
        is_active: activeInput.checked ? 1 : 0,
      };
      try {
        if (promoIdInput.value) {
          await fetchJson(`/api/promo/${promoIdInput.value}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (window.notifySuccess) {
            window.notifySuccess("Promo diperbarui", "Data promo tersimpan.");
          }
        } else {
          await fetchJson("/api/promo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (window.notifySuccess) {
            window.notifySuccess("Promo ditambahkan", "Promo baru siap digunakan.");
          }
        }
        resetForm();
        await loadPromo();
      } catch (err) {
        if (window.notifyError) {
          window.notifyError("Gagal menyimpan promo", err.message);
        }
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", resetForm);
  }

  if (searchInput) {
    searchInput.addEventListener("input", applyFilter);
  }

  if (rowsEl) {
    rowsEl.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const row = cachedRows.find((item) => String(item.id) === button.dataset.id);
      if (!row) return;
      if (button.dataset.action === "edit") {
        promoIdInput.value = row.id;
        programSelect.value = row.program_id;
        namaInput.value = row.nama || "";
        tipeSelect.value = row.tipe_diskon || "percent";
        nilaiInput.value = row.nilai || 0;
        mulaiInput.value = row.tanggal_mulai?.slice(0, 10) || "";
        selesaiInput.value = row.tanggal_selesai?.slice(0, 10) || "";
        activeInput.checked = Boolean(row.is_active);
        return;
      }
      if (button.dataset.action === "delete") {
        if (!confirm("Hapus promo ini?")) return;
        try {
          await fetchJson(`/api/promo/${row.id}`, { method: "DELETE" });
          if (window.notifySuccess) {
            window.notifySuccess("Promo dihapus", "Promo sudah tidak aktif.");
          }
          await loadPromo();
        } catch (err) {
          if (window.notifyError) {
            window.notifyError("Gagal menghapus promo", err.message);
          }
        }
      }
    });
  }

  Promise.all([loadPrograms(), loadPromo()])
    .then(() => resetForm())
    .catch((err) => {
      if (window.notifyError) {
        window.notifyError("Gagal memuat promo", err.message);
      }
    });
})();
