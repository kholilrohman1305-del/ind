(() => {
  const rowsEl = document.getElementById("adminRows");
  const emptyEl = document.getElementById("adminEmpty");
  const searchInput = document.getElementById("searchAdmin");

  const state = {
    rows: [],
    query: "",
  };

  const fetchJson = async (url, options = {}) => {
    const requester = window.api?.request || fetch;
    const res = await requester(url, { credentials: "same-origin", ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      throw new Error(data.message || "Permintaan gagal.");
    }
    return data.data ?? data;
  };

  const normalize = (value) => String(value || "").toLowerCase();

  const applyFilter = () => {
    const keyword = normalize(state.query);
    if (!keyword) return state.rows;
    return state.rows.filter((row) => {
      return (
        normalize(row.cabang_nama).includes(keyword) ||
        normalize(row.cabang_kode).includes(keyword) ||
        normalize(row.email).includes(keyword)
      );
    });
  };

  const renderRows = () => {
    if (!rowsEl) return;
    rowsEl.innerHTML = "";
    const filtered = applyFilter();
    if (!filtered.length) {
      if (emptyEl) emptyEl.classList.remove("hidden");
      return;
    }
    if (emptyEl) emptyEl.classList.add("hidden");

    filtered.forEach((row) => {
      const wrap = document.createElement("div");
      wrap.className =
        "grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/70 transition";
      const isActive = Boolean(row.is_active);
      const statusClass = isActive
        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
        : "bg-slate-100 text-slate-500 border-slate-200";
      const statusText = isActive ? "Aktif" : "Nonaktif";
      const toggleText = isActive ? "Nonaktifkan" : "Aktifkan";

      wrap.innerHTML = `
        <div class="col-span-4">
          <div class="font-semibold text-slate-800">${row.cabang_nama || "-"}</div>
          <div class="text-xs text-slate-400">${row.cabang_kode || "-"}</div>
        </div>
        <div class="col-span-4 text-sm text-slate-600">${row.email || "-"}</div>
        <div class="col-span-2">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusClass}">
            ${statusText}
          </span>
        </div>
        <div class="col-span-2 flex items-center justify-end gap-2">
          <button
            class="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition"
            data-action="reset"
            data-id="${row.id}"
            data-email="${row.email || ""}"
          >
            Reset
          </button>
          <button
            class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100 transition"
            data-action="toggle"
            data-id="${row.id}"
            data-active="${isActive ? 1 : 0}"
          >
            ${toggleText}
          </button>
        </div>
      `;
      rowsEl.appendChild(wrap);
    });
  };

  const loadRows = async () => {
    try {
      const rows = await fetchJson("/api/user-management/admin-cabang");
      state.rows = Array.isArray(rows) ? rows : [];
      renderRows();
    } catch (err) {
      state.rows = [];
      renderRows();
      if (window.toast.error) window.toast.error("Gagal memuat", err.message);
    }
  };

  const resetPassword = async (userId, email) => {
    const input = window.prompt(
      `Password baru untuk ${email || "admin cabang"} (min. 6 karakter):`,
      "password"
    );
    if (input === null) return;
    const password = String(input).trim();
    if (password.length < 6) {
      if (window.toast.error) window.toast.error("Gagal", "Password minimal 6 karakter.");
      return;
    }
    await fetchJson(`/api/user-management/${userId}/reset-password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (window.toast.success) window.toast.success("Berhasil", "Password diperbarui.");
  };

  const toggleStatus = async (userId, currentActive) => {
    const nextActive = !currentActive;
    const confirmText = nextActive
      ? "Aktifkan kembali akun admin cabang ini?"
      : "Nonaktifkan akun admin cabang ini?";
    if (!window.confirm(confirmText)) return;
    await fetchJson(`/api/user-management/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: nextActive }),
    });
    if (window.toast.success) {
      window.toast.success("Status diperbarui", nextActive ? "Akun diaktifkan." : "Akun dinonaktifkan.");
    }
  };

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      state.query = event.target.value;
      renderRows();
    });
  }

  if (rowsEl) {
    rowsEl.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      const id = Number(button.dataset.id);
      if (!id || !action) return;

      try {
        if (action === "reset") {
          await resetPassword(id, button.dataset.email);
        }
        if (action === "toggle") {
          const isActive = Boolean(Number(button.dataset.active));
          await toggleStatus(id, isActive);
        }
        await loadRows();
      } catch (err) {
        if (window.toast.error) window.toast.error("Gagal", err.message);
      }
    });
  }

  loadRows().catch(() => {});
})();
