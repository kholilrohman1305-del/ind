(() => {
  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorEl = document.getElementById("loginError");
  const button = document.getElementById("loginButton");
  const togglePassword = document.getElementById("togglePassword");

  const setError = (message) => {
    if (errorEl) {
      errorEl.textContent = message || "";
    }
  };

  const setLoading = (loading) => {
    if (!button) return;
    button.disabled = loading;
    button.textContent = loading ? "Memproses..." : "Login";
  };

  const redirectByRole = (role) => {
    const map = {
      super_admin: "/dashboard-super",
      admin_cabang: "/dashboard",
      siswa: "/dashboard-siswa",
      edukator: "/dashboard-edukator",
    };
    window.location.href = map[role] || "/dashboard";
  };

  const checkSession = () => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.loggedIn) {
          redirectByRole(data.user.role);
        }
      })
      .catch(() => {});
  };

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setError("");

      const email = emailInput ? emailInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value : "";

      if (!email || !password) {
        setError("Email dan password wajib diisi.");
        return;
      }

      setLoading(true);
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          setError(data.message || "Login gagal.");
          setLoading(false);
          return;
        }

        redirectByRole(data.user.role);
      } catch (err) {
        setError("Terjadi kesalahan. Coba lagi.");
        setLoading(false);
      }
    });
  }

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      togglePassword.textContent = isPassword ? "Sembunyi" : "Lihat";
    });
  }

  checkSession();
})();
