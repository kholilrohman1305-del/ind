(() => {
  const form = document.getElementById("settingForm");
  const resetButton = document.getElementById("resetSetting");
  const saveBtn = document.getElementById("saveBtn");
  const errorEl = document.getElementById("settingError");

  const kodeInput = document.getElementById("kodeCabang");
  const namaInput = document.getElementById("namaCabang");
  const alamatInput = document.getElementById("alamatCabang");
  const teleponInput = document.getElementById("teleponCabang");
  const tempoInput = document.getElementById("tempoCabang");
  const adminEmailInput = document.getElementById("adminEmail");
  const adminPasswordInput = document.getElementById("adminPassword");
  const adminActiveInput = document.getElementById("adminActive");

  // Ambil role dari body, default ke admin_cabang jika tidak ada
  const role = document.body.dataset.role || "admin_cabang";
  let cachedData = null;

  // --- Helper ---
  const fetchJson = async (url, options = {}) => {
    const requester = window.api?.request || fetch;
    const res = await requester(url, { credentials: "same-origin", ...options });
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
    adminPasswordInput.value = ""; // Reset password field for security
    adminActiveInput.checked = Number(data.admin_is_active || 0) === 1;

    // Logic Role: Hanya Super Admin yang bisa ubah Kode Cabang
    if (role !== "super_admin") {
      kodeInput.setAttribute("disabled", "disabled");
      kodeInput.classList.add("bg-gray-100", "cursor-not-allowed");
    } else {
      kodeInput.removeAttribute("disabled");
      kodeInput.classList.remove("bg-gray-100", "cursor-not-allowed");
    }
  };

  const loadData = async () => {
    try {
        const data = await fetchJson("/api/settings/cabang");
        applyData(data);
    } catch (err) {
        if(window.toast.error) window.toast.error("Gagal memuat data", err.message);
    }
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
    
    // Hanya kirim kode jika super admin
    if (role === "super_admin") {
      payload.kode = kodeInput.value.trim();
    }
    
    // Hanya kirim password jika diisi
    if (adminPasswordInput.value.trim()) {
      payload.admin_password = adminPasswordInput.value.trim();
    }
    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (errorEl) errorEl.classList.add('hidden');
    
    // UX Loading State
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Menyimpan...';

    try {
      const payload = buildPayload();
      
      // Basic Validation
      if (!payload.nama) throw new Error("Nama cabang wajib diisi.");
      if (role === "super_admin" && !payload.kode) throw new Error("Kode cabang wajib diisi.");
      if (!payload.admin_email) throw new Error("Email admin wajib diisi.");

      const data = await fetchJson("/api/settings/cabang", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      applyData(data);
      if (window.toast.success) {
        window.toast.success("Berhasil", "Pengaturan cabang telah diperbarui.");
      }
      
      // Clear password field visual
      adminPasswordInput.value = "";

    } catch (err) {
      if (errorEl) {
          errorEl.textContent = err.message;
          errorEl.classList.remove('hidden');
      }
      if (window.toast.error) {
        window.toast.error("Gagal menyimpan", err.message);
      }
    } finally {
        // Reset Button
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
    }
  };

  const handleReset = () => {
    if (cachedData) {
      applyData(cachedData);
      // Optional: Visual shake or feedback
      return;
    }
    loadData();
  };

  if (form) form.addEventListener("submit", handleSubmit);
  if (resetButton) resetButton.addEventListener("click", handleReset);

  // Init
  loadData();
})();
