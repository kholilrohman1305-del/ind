(() => {
  const requester = window.api?.request || fetch;
  const form = document.getElementById("profilForm");
  const saveBtn = document.getElementById("profilSaveBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const fields = {
    nama: document.getElementById("profilNama"),
    telepon: document.getElementById("profilTelepon"),
    alamat: document.getElementById("profilAlamat"),
    pendidikan: document.getElementById("profilPendidikan"),
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
    if (type === "success" && window.toast?.success) {
      window.toast.success("Berhasil", message);
      return;
    }
    if (type === "error" && window.toast?.error) {
      window.toast.error("Gagal", message);
      return;
    }
    if (window.notify) {
      window.notify({ type, title: type === "error" ? "Gagal" : "Info", subtitle: message });
    }
  };

  const checkSession = async () => {
    const res = await requester("/api/auth/session", { credentials: "same-origin" });
    const session = await res.json();
    if (!session || !session.loggedIn) {
      window.location.href = "/login";
      return false;
    }
    if (session.user.role !== "edukator") {
      window.location.href = "/dashboard";
      return false;
    }
    return true;
  };

  const loadProfile = async () => {
    const res = await requester("/api/edukator/profile", { credentials: "same-origin" });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }
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
    if (fields.telepon) fields.telepon.value = profile.telepon || "";
    if (fields.alamat) fields.alamat.value = profile.alamat || "";
    if (fields.pendidikan) fields.pendidikan.value = profile.pendidikan_terakhir || "";
    if (fields.email) fields.email.value = profile.email || "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!fields.nama || !fields.email) return;

    const payload = {
      nama: fields.nama.value.trim(),
      telepon: fields.telepon?.value.trim(),
      alamat: fields.alamat?.value.trim(),
      pendidikan_terakhir: fields.pendidikan?.value.trim(),
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
      const res = await requester("/api/edukator/profile", {
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

  // --- Pengaturan Login Biometrik ---
  const setupBiometric = () => {
    const bio = window.ilhamiBiometric;
    const statusText = document.getElementById("biometricStatusText");
    const toggleBtn = document.getElementById("biometricToggleBtn");
    if (!statusText || !toggleBtn) return;

    if (!bio) {
      statusText.textContent = "Fitur biometrik gagal dimuat. Muat ulang halaman ini.";
      toggleBtn.disabled = true;
      toggleBtn.style.opacity = "0.5";
      return;
    }

    const renderState = () => {
      const active = bio.isEnrolled();
      statusText.textContent = active
        ? "Login biometrik aktif di perangkat ini. Anda bisa masuk dengan sidik jari/wajah dari halaman login."
        : "Aktifkan agar bisa masuk lebih cepat dengan sidik jari/wajah di perangkat ini.";
      toggleBtn.textContent = active ? "Nonaktifkan Login Biometrik" : "Aktifkan Login Biometrik";
      toggleBtn.style.background = active
        ? "#EF4444"
        : "linear-gradient(135deg, #00A6B4 0%, #008891 100%)";
    };

    // Tampilkan tombol langsung; cek dukungan berjalan di latar belakang.
    renderState();
    bio.isSupported()
      .then((supported) => {
        if (!supported) {
          statusText.textContent =
            "Perangkat atau browser ini tidak mendukung login biometrik. Gunakan aplikasi ILHAMI atau browser Chrome dengan sidik jari/Windows Hello.";
          toggleBtn.disabled = true;
          toggleBtn.style.opacity = "0.5";
        }
      })
      .catch(() => { /* biarkan tombol tetap aktif */ });

    toggleBtn.addEventListener("click", async () => {
      toggleBtn.disabled = true;
      try {
        if (bio.isEnrolled()) {
          const token = bio.getToken();
          await requester("/api/auth/biometric/unregister", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ token }),
          });
          bio.clearLocal();
          notify("success", "Login biometrik dinonaktifkan.");
        } else {
          const result = await bio.enroll({ email: fields.email?.value });
          if (!result.success) {
            if (result.message) notify("error", result.message);
            return;
          }
          const res = await requester("/api/auth/biometric/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ device_info: navigator.userAgent }),
          });
          const json = await res.json();
          if (!res.ok || !json.success || !json.token) {
            notify("error", json.message || "Gagal mengaktifkan login biometrik.");
            return;
          }
          bio.setToken(json.token);
          notify("success", "Login biometrik diaktifkan. Anda bisa masuk dengan biometrik dari halaman login.");
        }
      } catch (err) {
        notify("error", err.message || "Gagal mengubah pengaturan biometrik.");
      } finally {
        toggleBtn.disabled = false;
        renderState();
      }
    });
  };

  const handleLogout = () => {
    requester("/api/auth/logout", { method: "POST" })
      .finally(() => {
        window.location.href = "/login";
      });
  };

  document.addEventListener("DOMContentLoaded", async () => {
    setupBiometric();
    const ok = await checkSession();
    if (!ok) return;
    try {
      await loadProfile();
    } catch (err) {
      notify("error", "Gagal memuat profil.");
    }
  });

  if (form) form.addEventListener("submit", handleSubmit);
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

  // Pastikan input yang sedang diisi (mis. konfirmasi password) tidak tertutup
  // footer navigasi atau keyboard di layar kecil.
  if (form) {
    form.addEventListener("focusin", (event) => {
      const target = event.target;
      if (!target || !target.matches("input, textarea")) return;
      setTimeout(() => {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 300);
    });
  }
})();
