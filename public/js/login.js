(() => {
    // --- Configuration ---
    const CONFIG = {
        routes: {
            super_admin: "/dashboard-super",
            admin_cabang: "/dashboard",
            siswa: "/dashboard-siswa",
            edukator: "/dashboard-edukator",
            orang_tua: "/dashboard-ortu",
            default: "/dashboard"
        }
    };

    // --- DOM Elements ---
    const form = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const errorEl = document.getElementById("loginError");
    const errorText = document.getElementById("errorText");
    const button = document.getElementById("loginButton");
    const togglePassword = document.getElementById("togglePassword");
    const biometricSection = document.getElementById("biometricSection");
    const biometricButton = document.getElementById("biometricButton");
    const enrollModal = document.getElementById("biometricEnrollModal");
    const enrollConfirm = document.getElementById("biometricEnrollConfirm");
    const enrollSkip = document.getElementById("biometricEnrollSkip");

    // --- Biometric (Edukator via aplikasi Android) ---
    const BIOMETRIC_TOKEN_KEY = "ilhami_biometric_token";

    const biometricBridge = window.IlhamiBiometric || null;

    const bridgeAvailable = () => {
        try {
            return !!biometricBridge && biometricBridge.isAvailable();
        } catch (e) {
            return false;
        }
    };

    const getBiometricToken = () => {
        try { return localStorage.getItem(BIOMETRIC_TOKEN_KEY); } catch (e) { return null; }
    };

    const setBiometricToken = (token) => {
        try {
            if (token) localStorage.setItem(BIOMETRIC_TOKEN_KEY, token);
            else localStorage.removeItem(BIOMETRIC_TOKEN_KEY);
        } catch (e) { /* storage tidak tersedia */ }
    };

    // Meminta verifikasi biometrik ke aplikasi Android, hasilnya lewat callback global.
    let biometricResolve = null;
    window.__onBiometricResult = (success, message) => {
        if (biometricResolve) {
            const resolve = biometricResolve;
            biometricResolve = null;
            resolve({ success: !!success, message: message || "" });
        }
    };

    const promptBiometric = () => new Promise((resolve) => {
        biometricResolve = resolve;
        try {
            biometricBridge.authenticate();
        } catch (e) {
            biometricResolve = null;
            resolve({ success: false, message: "Biometrik tidak tersedia di perangkat ini." });
        }
    });

    const updateBiometricVisibility = () => {
        if (!biometricSection) return;
        const show = bridgeAvailable() && !!getBiometricToken();
        biometricSection.classList.toggle("hidden", !show);
    };

    // --- UI Logic ---

    const showError = (msg) => {
        if (!errorEl) return;
        errorText.textContent = msg;
        errorEl.classList.remove("hidden", "opacity-0");
        // Shake animation reset
        errorEl.classList.remove("animate-pulse");
        void errorEl.offsetWidth; // trigger reflow
        errorEl.classList.add("animate-pulse");
    };

    const hideError = () => {
        if (errorEl) errorEl.classList.add("hidden", "opacity-0");
    };

    const setLoading = (loading) => {
        if (!button) return;
        if (loading) {
            button.disabled = true;
            button.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses...
            `;
            button.classList.add("opacity-70", "cursor-wait");
        } else {
            button.disabled = false;
            button.innerHTML = `Masuk Sekarang`;
            button.classList.remove("opacity-70", "cursor-wait");
        }
    };

    const redirectUser = (role) => {
        const url = CONFIG.routes[role] || CONFIG.routes.default;
        
        // Animasi Exit yang halus
        document.body.style.transition = "opacity 0.6s ease";
        document.body.style.opacity = "0";
        document.body.style.transform = "scale(1.02)";
        
        setTimeout(() => window.location.href = url, 600);
    };

    // --- Main Logic ---

    const checkSession = async () => {
        try {
            const res = await fetch("/api/auth/session");
            if (res.ok) {
                const data = await res.json();
                if (data?.loggedIn && data?.user) {
                    redirectUser(data.user.role);
                }
            }
        } catch (e) { console.debug("Session check failed", e); }
    };

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideError();

            const email = emailInput?.value.trim();
            const password = passwordInput?.value;

            if (!email || !password) {
                showError("Email dan kata sandi wajib diisi.");
                return;
            }

            setLoading(true);

            try {
                const requester = window.api?.request || fetch;
                const response = await requester("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Login gagal. Silakan coba lagi.");
                }

                // Success Feedback
                button.innerHTML = `<i class="fa-solid fa-check-circle mr-2"></i> Berhasil!`;
                button.classList.remove("btn-gradient");
                button.classList.add("bg-emerald-500", "hover:bg-emerald-600");

                // Tawarkan aktivasi biometrik untuk edukator di aplikasi
                if (data.user.role === "edukator" && bridgeAvailable() && !getBiometricToken()) {
                    offerBiometricEnrollment(data.user.role);
                } else {
                    setTimeout(() => redirectUser(data.user.role), 500);
                }

            } catch (err) {
                showError(err.message || "Terjadi kesalahan pada server.");
                setLoading(false);
            }
        });
    }

    // --- Biometric Enrollment (setelah login password edukator) ---
    const hideEnrollModal = () => {
        if (!enrollModal) return;
        enrollModal.classList.add("hidden");
        enrollModal.classList.remove("flex");
    };

    const offerBiometricEnrollment = (role) => {
        if (!enrollModal || !enrollConfirm || !enrollSkip) {
            redirectUser(role);
            return;
        }
        enrollModal.classList.remove("hidden");
        enrollModal.classList.add("flex");

        enrollSkip.onclick = () => {
            hideEnrollModal();
            redirectUser(role);
        };

        enrollConfirm.onclick = async () => {
            enrollConfirm.disabled = true;
            enrollConfirm.textContent = "Memverifikasi...";
            try {
                const result = await promptBiometric();
                if (result.success) {
                    const requester = window.api?.request || fetch;
                    const res = await requester("/api/auth/biometric/register", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ device_info: navigator.userAgent }),
                    });
                    const json = await res.json();
                    if (res.ok && json.success && json.token) {
                        setBiometricToken(json.token);
                    }
                }
            } catch (e) { /* gagal aktivasi tidak menghalangi login */ }
            hideEnrollModal();
            redirectUser(role);
        };
    };

    // --- Biometric Login ---
    if (biometricButton) {
        biometricButton.addEventListener("click", async () => {
            hideError();
            const token = getBiometricToken();
            if (!token || !bridgeAvailable()) {
                updateBiometricVisibility();
                return;
            }

            biometricButton.disabled = true;
            const originalHtml = biometricButton.innerHTML;
            biometricButton.innerHTML = '<i class="fa-solid fa-fingerprint text-lg animate-pulse"></i> Memverifikasi...';

            const restore = () => {
                biometricButton.disabled = false;
                biometricButton.innerHTML = originalHtml;
            };

            try {
                const result = await promptBiometric();
                if (!result.success) {
                    if (result.message) showError(result.message);
                    restore();
                    return;
                }

                const requester = window.api?.request || fetch;
                const response = await requester("/api/auth/biometric/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify({ token }),
                });
                const data = await response.json();

                if (!response.ok || !data.success) {
                    if (response.status === 401) {
                        // Token tidak berlaku lagi — hapus dan minta login password
                        setBiometricToken(null);
                        updateBiometricVisibility();
                    }
                    throw new Error(data.message || "Login biometrik gagal. Silakan masuk dengan password.");
                }

                biometricButton.innerHTML = '<i class="fa-solid fa-check-circle text-lg"></i> Berhasil!';
                setTimeout(() => redirectUser(data.user.role), 500);
            } catch (err) {
                showError(err.message || "Login biometrik gagal. Silakan masuk dengan password.");
                restore();
            }
        });
    }

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", () => {
            const type = passwordInput.type === "password" ? "text" : "password";
            passwordInput.type = type;
            togglePassword.innerHTML = type === "password" 
                ? '<i class="fa-regular fa-eye"></i>' 
                : '<i class="fa-regular fa-eye-slash text-indigo-400"></i>';
        });
    }

    // --- Extra: Modern Mouse Parallax Effect ---
    document.addEventListener('mousemove', (e) => {
        const x = (window.innerWidth - e.pageX * 2) / 100;
        const y = (window.innerHeight - e.pageY * 2) / 100;

        const orb1 = document.getElementById('orb1');
        const orb2 = document.getElementById('orb2');

        if(orb1) orb1.style.transform = `translateX(${x}px) translateY(${y}px)`;
        if(orb2) orb2.style.transform = `translateX(${x * -1}px) translateY(${y * -1}px)`;
    });

    // Init
    updateBiometricVisibility();
    checkSession();
})();
