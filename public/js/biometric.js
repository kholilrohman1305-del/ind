// Helper login biometrik ILHAMI.
// Mendukung dua jalur:
// 1. Bridge aplikasi Android (window.IlhamiBiometric -> BiometricPrompt)
// 2. WebAuthn platform authenticator di browser (Chrome: Windows Hello,
//    sidik jari, wajah). Butuh HTTPS.
window.ilhamiBiometric = (() => {
  const TOKEN_KEY = "ilhami_biometric_token";
  const CRED_KEY = "ilhami_biometric_cred";

  const bridge = window.IlhamiBiometric || null;

  const store = {
    get: (key) => {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    set: (key, value) => {
      try { localStorage.setItem(key, value); } catch (e) { /* storage tidak tersedia */ }
    },
    del: (key) => {
      try { localStorage.removeItem(key); } catch (e) { /* storage tidak tersedia */ }
    },
  };

  const bridgeAvailable = () => {
    try { return !!bridge && bridge.isAvailable(); } catch (e) { return false; }
  };

  const webauthnAvailable = async () => {
    try {
      if (!window.isSecureContext || !window.PublicKeyCredential) return false;
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      return false;
    }
  };

  const isSupported = async () => bridgeAvailable() || (await webauthnAvailable());

  const getToken = () => store.get(TOKEN_KEY);
  const setToken = (token) => {
    if (token) store.set(TOKEN_KEY, token);
    else store.del(TOKEN_KEY);
  };

  // Terdaftar di perangkat ini: token server tersimpan, dan (untuk jalur
  // WebAuthn) credential platform juga tersimpan.
  const isEnrolled = () => {
    if (!getToken()) return false;
    return bridgeAvailable() || !!store.get(CRED_KEY);
  };

  const clearLocal = () => {
    store.del(TOKEN_KEY);
    store.del(CRED_KEY);
  };

  const randomBytes = (length) => {
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    return arr;
  };

  const bufToB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const b64ToBuf = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  // --- Jalur bridge Android ---
  let bridgeResolve = null;
  window.__onBiometricResult = (success, message) => {
    if (bridgeResolve) {
      const resolve = bridgeResolve;
      bridgeResolve = null;
      resolve({ success: !!success, message: message || "" });
    }
  };

  const bridgeVerify = () => new Promise((resolve) => {
    bridgeResolve = resolve;
    try {
      bridge.authenticate();
    } catch (e) {
      bridgeResolve = null;
      resolve({ success: false, message: "Biometrik tidak tersedia di perangkat ini." });
    }
  });

  // --- Jalur WebAuthn (Chrome / browser) ---
  const webauthnEnroll = async ({ email, name } = {}) => {
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: randomBytes(32),
          rp: { name: "ILHAMI Indonesia", id: location.hostname },
          user: {
            id: randomBytes(16),
            name: email || "edukator",
            displayName: name || email || "Edukator",
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60000,
        },
      });
      if (!credential) {
        return { success: false, message: "Pendaftaran biometrik dibatalkan." };
      }
      store.set(CRED_KEY, bufToB64(credential.rawId));
      return { success: true, message: "" };
    } catch (e) {
      const cancelled = e && (e.name === "NotAllowedError" || e.name === "AbortError");
      const detail = e && (e.message || e.name) ? ` (${e.message || e.name})` : "";
      return {
        success: false,
        message: cancelled ? "" : `Gagal mendaftarkan biometrik di perangkat ini${detail}.`,
      };
    }
  };

  const webauthnVerify = async () => {
    const credB64 = store.get(CRED_KEY);
    if (!credB64) {
      return { success: false, message: "Biometrik belum diaktifkan di perangkat ini." };
    }
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: randomBytes(32),
          allowCredentials: [{ type: "public-key", id: b64ToBuf(credB64) }],
          userVerification: "required",
          timeout: 60000,
        },
      });
      return assertion
        ? { success: true, message: "" }
        : { success: false, message: "" };
    } catch (e) {
      const cancelled = e && (e.name === "NotAllowedError" || e.name === "AbortError");
      return { success: false, message: cancelled ? "" : "Verifikasi biometrik gagal." };
    }
  };

  // Verifikasi biometrik (untuk login). Hasil: { success, message }.
  const verify = () => (bridgeAvailable() ? bridgeVerify() : webauthnVerify());

  // Daftarkan biometrik di perangkat ini (untuk aktivasi). Hasil: { success, message }.
  const enroll = (userInfo) =>
    bridgeAvailable() ? bridgeVerify() : webauthnEnroll(userInfo || {});

  return {
    isSupported,
    bridgeAvailable,
    getToken,
    setToken,
    isEnrolled,
    clearLocal,
    verify,
    enroll,
  };
})();
