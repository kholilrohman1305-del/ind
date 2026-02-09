(() => {
  const requester = window.api?.request || fetch;
  const form = document.getElementById("profilSiswaForm");
  const saveBtn = document.getElementById("profilSaveBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const fields = {
    nama: document.getElementById("profilNama"),
    kelas: document.getElementById("profilKelas"),
    jenjang: document.getElementById("profilJenjang"),
    tanggalLahir: document.getElementById("profilTanggalLahir"),
    telepon: document.getElementById("profilTelepon"),
    sekolah: document.getElementById("profilSekolah"),
    alamat: document.getElementById("profilAlamat"),
    email: document.getElementById("profilEmail"),
    password: document.getElementById("profilPassword"),
    passwordConfirm: document.getElementById("profilPasswordConfirm"),
  };

  const setLoading = (loading) => {
    if (!saveBtn) return;
    saveBtn.disabled = loading;
    saveBtn.textContent = loading ? "Menyimpan..." : "Simpan Perubahan";
  };

  const notify = (type, message) => {
    if (type === "success" && window.notifySuccess) {
      window.notifySuccess("Berhasil", message);
      return;
    }
    if (type === "error" && window.notifyError) {
      window.notifyError("Gagal", message);
      return;
    }
    if (window.notify) {
      window.notify({ type, title: type === "error" ? "Gagal" : "Info", subtitle: message });
    }
  };

  const loadProfile = async () => {
    const res = await requester("/api/siswa/profile", { credentials: "same-origin" });
    if (!res.ok) {
      notify("error", "Gagal memuat profil.");
      return;
    }
    const json = await res.json();
    if (!json.success || !json.data) {
      notify("error", json.message || "Profil tidak ditemukan.");
      return;
    }
    const profile = json.data;
    if (fields.nama) fields.nama.value = profile.nama || "";
    if (fields.kelas) fields.kelas.value = profile.kelas || "";
    if (fields.jenjang) fields.jenjang.value = profile.jenjang || "";
    if (fields.tanggalLahir) fields.tanggalLahir.value = profile.tanggal_lahir ? String(profile.tanggal_lahir).slice(0, 10) : "";
    if (fields.telepon) fields.telepon.value = profile.telepon || "";
    if (fields.sekolah) fields.sekolah.value = profile.sekolah_asal || "";
    if (fields.alamat) fields.alamat.value = profile.alamat || "";
    if (fields.email) fields.email.value = profile.email || "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!fields.nama || !fields.email) return;

    const payload = {
      nama: fields.nama.value.trim(),
      kelas: fields.kelas?.value.trim(),
      jenjang: fields.jenjang?.value.trim(),
      tanggal_lahir: fields.tanggalLahir?.value,
      telepon: fields.telepon?.value.trim(),
      sekolah_asal: fields.sekolah?.value.trim(),
      alamat: fields.alamat?.value.trim(),
      email: fields.email.value.trim(),
    };

    const password = fields.password?.value || "";
    const passwordConfirm = fields.passwordConfirm?.value || "";

    if (!payload.nama) {
      notify("error", "Nama wajib diisi.");
      return;
    }
    if (!payload.email) {
      notify("error", "Email wajib diisi.");
      return;
    }

    if (password || passwordConfirm) {
      if (password.length < 6) {
        notify("error", "Password minimal 6 karakter.");
        return;
      }
      if (password !== passwordConfirm) {
        notify("error", "Konfirmasi password tidak sesuai.");
        return;
      }
      payload.password = password;
    }

    setLoading(true);
    try {
      const res = await requester("/api/siswa/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        notify("error", json.message || "Gagal menyimpan perubahan.");
        return;
      }
      if (fields.password) fields.password.value = "";
      if (fields.passwordConfirm) fields.passwordConfirm.value = "";
      notify("success", "Profil berhasil diperbarui.");
    } catch (err) {
      notify("error", err.message || "Gagal menyimpan perubahan.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    requester("/api/auth/logout", { method: "POST" })
      .finally(() => {
        window.location.href = "/login";
      });
  };

  document.addEventListener("DOMContentLoaded", () => {
    loadProfile();
  });

  if (form) form.addEventListener("submit", handleSubmit);
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
})();
