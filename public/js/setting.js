(() => {
  const form = document.getElementById("settingForm");
  const resetButton = document.getElementById("resetSetting");
  const errorEl = document.getElementById("settingError");

  const kodeInput = document.getElementById("kodeCabang");
  const namaInput = document.getElementById("namaCabang");
  const alamatInput = document.getElementById("alamatCabang");
  const teleponInput = document.getElementById("teleponCabang");
  const tempoInput = document.getElementById("tempoCabang");
  const adminEmailInput = document.getElementById("adminEmail");
  const adminPasswordInput = document.getElementById("adminPassword");
  const adminActiveInput = document.getElementById("adminActive");

  const role = document.body.dataset.role;
  let cachedData = null;

  const fetchJson = async (url, options) => {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Permintaan gagal.");
    }
    return data.data || data;
  };

  const applyData = (data) => {
    if (!data) return;
    cachedData = data;
    kodeInput.value = data.kode || "";
    namaInput.value = data.nama || "";
    alamatInput.value = data.alamat || "";
    teleponInput.value = data.telepon || "";
    tempoInput.value = data.tanggal_jatuh_tempo || "";
    adminEmailInput.value = data.admin_email || "";
    adminPasswordInput.value = "";
    adminActiveInput.checked = Number(data.admin_is_active || 0) === 1;

    if (role !== "super_admin") {
      kodeInput.setAttribute("disabled", "disabled");
    } else {
      kodeInput.removeAttribute("disabled");
    }
  };

  const loadData = async () => {
    const data = await fetchJson("/api/settings/cabang");
    applyData(data);
  };

  const buildPayload = () => {
    const payload = {
      nama: namaInput.value.trim(),
      alamat: alamatInput.value.trim(),
      telepon: teleponInput.value.trim(),
      tanggal_jatuh_tempo: tempoInput.value,
      admin_email: adminEmailInput.value.trim(),
      admin_is_active: adminActiveInput.checked,
    };
    if (role === "super_admin") {
      payload.kode = kodeInput.value.trim();
    }
    if (adminPasswordInput.value.trim()) {
      payload.admin_password = adminPasswordInput.value.trim();
    }
    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (errorEl) errorEl.textContent = "";
    try {
      const payload = buildPayload();
      if (!payload.nama) {
        throw new Error("Nama cabang wajib diisi.");
      }
      if (role === "super_admin" && !payload.kode) {
        throw new Error("Kode cabang wajib diisi.");
      }
      if (!payload.admin_email) {
        throw new Error("Email admin wajib diisi.");
      }

      const data = await fetchJson("/api/settings/cabang", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      applyData(data);
      if (window.notifySuccess) {
        window.notifySuccess("Setting tersimpan", "Data cabang berhasil diperbarui.");
      }
    } catch (err) {
      if (errorEl) errorEl.textContent = err.message;
      if (window.notifyError) {
        window.notifyError("Gagal menyimpan setting", err.message);
      }
    }
  };

  const handleReset = () => {
    if (cachedData) {
      applyData(cachedData);
      return;
    }
    loadData().catch(() => {});
  };

  if (form) form.addEventListener("submit", handleSubmit);
  if (resetButton) resetButton.addEventListener("click", handleReset);

  loadData().catch((err) => {
    if (errorEl) errorEl.textContent = err.message;
  });
})();
