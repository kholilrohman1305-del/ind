(() => {
  const ensureNotificationContainer = () => {
    let container = document.querySelector(".notification-container");
    if (container) return container;
    container = document.createElement("div");
    container.className = "notification-container";
    document.body.appendChild(container);
    return container;
  };

  const buildNotification = ({ type = "info", title, subtitle = "", timeout = 3500 }) => {
    const container = ensureNotificationContainer();
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    const iconMap = {
      success: "OK",
      error: "!",
      warning: "!",
      info: "i",
      loading: '<span class="notification-spinner" aria-hidden="true"></span>',
    };
    const icon = iconMap[type] || "i";

    notification.innerHTML = `
      <div class="notification-icon">${icon}</div>
      <div class="notification-body">
        <div class="notification-title">${title || "Notifikasi"}</div>
        ${subtitle ? `<div class="notification-sub">${subtitle}</div>` : ""}
      </div>
      <button class="notification-close" type="button" aria-label="Tutup">x</button>
    `;

    const closeButton = notification.querySelector(".notification-close");
    const remove = () => {
      notification.classList.add("hide");
      setTimeout(() => notification.remove(), 200);
    };

    if (closeButton) closeButton.addEventListener("click", remove);
    container.appendChild(notification);
    const resolvedTimeout = type === "loading" && timeout === 3500 ? 0 : timeout;
    if (resolvedTimeout) setTimeout(remove, resolvedTimeout);
    const update = ({ nextType, nextTitle, nextSubtitle, nextTimeout }) => {
      if (nextType) {
        notification.className = `notification ${nextType}`;
        const nextIcon = iconMap[nextType] || "i";
        const iconEl = notification.querySelector(".notification-icon");
        if (iconEl) iconEl.innerHTML = nextIcon;
      }
      if (nextTitle) {
        const titleEl = notification.querySelector(".notification-title");
        if (titleEl) titleEl.textContent = nextTitle;
      }
      if (typeof nextSubtitle !== "undefined") {
        const subtitleEl = notification.querySelector(".notification-sub");
        if (nextSubtitle) {
          if (subtitleEl) {
            subtitleEl.textContent = nextSubtitle;
          } else {
            const body = notification.querySelector(".notification-body");
            if (body) {
              const sub = document.createElement("div");
              sub.className = "notification-sub";
              sub.textContent = nextSubtitle;
              body.appendChild(sub);
            }
          }
        } else if (subtitleEl) {
          subtitleEl.remove();
        }
      }
      if (nextTimeout) {
        setTimeout(remove, nextTimeout);
      }
    };
    return { close: remove, update };
  };

  if (!window.notify) {
    window.notify = buildNotification;
    window.toast.success = (title, subtitle) => buildNotification({ type: "success", title, subtitle });
    window.toast.error = (title, subtitle) =>
      buildNotification({ type: "error", title, subtitle, timeout: 5000 });
    window.notifyWarning = (title, subtitle) => buildNotification({ type: "warning", title, subtitle });
    window.notifyLoading = (title = "Memproses", subtitle = "Mohon tunggu sebentar") =>
      buildNotification({ type: "loading", title, subtitle, timeout: 0 });
    window.notifyPromise = (promise, messages = {}) => {
      const loading = window.notifyLoading(messages.loadingTitle, messages.loadingSubtitle);
      return promise
        .then((result) => {
          if (loading) loading.close();
          if (messages.successTitle || messages.successSubtitle) {
            window.toast.success(messages.successTitle || "Berhasil", messages.successSubtitle || "");
          }
          return result;
        })
        .catch((error) => {
          if (loading) loading.close();
          if (messages.errorTitle || messages.errorSubtitle) {
            window.toast.error(messages.errorTitle || "Gagal", messages.errorSubtitle || "");
          }
          throw error;
        });
    };
  }

  if (!window.__notifyFetchWrapped && window.fetch) {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
      const requestMethod = init.method || (input && input.method);
      const method = (requestMethod || "GET").toUpperCase();
      const headers = init.headers || (input && input.headers) || {};
      const skipNotify =
        init.skipNotify === true ||
        headers["X-Skip-Notify"] === "1" ||
        headers["x-skip-notify"] === "1" ||
        (headers.get && headers.get("X-Skip-Notify") === "1");
      if (method === "GET" || skipNotify) {
        return originalFetch(input, init);
      }
      let loadingHandle = null;
      const delay = setTimeout(() => {
        if (window.notifyLoading) {
          loadingHandle = window.notifyLoading("Memproses", "Mohon tunggu sebentar");
        }
      }, 300);
      return originalFetch(input, init)
        .then((response) => {
          clearTimeout(delay);
          if (loadingHandle) loadingHandle.close();
          return response;
        })
        .catch((error) => {
          clearTimeout(delay);
          if (loadingHandle) loadingHandle.close();
          throw error;
        });
    };
    window.__notifyFetchWrapped = true;
  }

  const body = document.body;
  const page = body.getAttribute("data-page");
  const role = body.getAttribute("data-role");
  const isEdukator = role === "edukator";
  const links = Array.from(document.querySelectorAll(".nav-link"));

  links.forEach((link) => {
    if (link.dataset.page === page) link.classList.add("active");
  });

  const sidebar = document.getElementById("sidebar");
  let toggle = document.getElementById("sidebarToggle");
  let overlay = document.querySelector(".sidebar-overlay");

  const ensureOverlay = () => {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);
    return overlay;
  };

  const ensureToggle = () => {
    if (toggle) return toggle;
    const button = document.createElement("button");
    button.id = "sidebarToggle";
    button.className = "icon-button sidebar-toggle-floating";
    button.type = "button";
    button.setAttribute("aria-label", "Toggle menu");
    button.textContent = "=";
    document.body.appendChild(button);
    toggle = button;
    return toggle;
  };

  const openMobileSidebar = () => {
    if (!sidebar) return;
    sidebar.classList.add("open");
    ensureOverlay().classList.add("active");
  };

  const closeMobileSidebar = () => {
    if (!sidebar) return;
    sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("active");
  };

  const bindToggle = () => {
    if (!sidebar) return;
    const handler = () => {
      if (window.innerWidth < 900) {
        if (sidebar.classList.contains("open")) {
          closeMobileSidebar();
        } else {
          openMobileSidebar();
        }
        return;
      }
      body.classList.toggle("sidebar-collapsed");
    };
    if (toggle) toggle.addEventListener("click", handler);
  };

  if (sidebar && !isEdukator) {
    ensureToggle();
    bindToggle();

    const overlayEl = ensureOverlay();
    overlayEl.addEventListener("click", closeMobileSidebar);

    links.forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 900) {
          closeMobileSidebar();
        }
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 900) {
        closeMobileSidebar();
      }
    });
  }

  const doLogout = () => {
    const requester = window.api?.request || fetch;
    requester("/api/auth/logout", { method: "POST" })
      .then(() => {
        window.location.href = "/login";
      })
      .catch(() => {
        window.location.href = "/login";
      });
  };

  const logoutButton = document.querySelector(".profile-action");
  if (logoutButton) {
    logoutButton.addEventListener("click", doLogout);
  }

  // Logout handled in profile page for edukator.
})();
