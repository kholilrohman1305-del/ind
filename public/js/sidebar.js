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
    if (timeout) setTimeout(remove, timeout);
  };

  if (!window.notify) {
    window.notify = buildNotification;
    window.notifySuccess = (title, subtitle) => buildNotification({ type: "success", title, subtitle });
    window.notifyError = (title, subtitle) =>
      buildNotification({ type: "error", title, subtitle, timeout: 5000 });
    window.notifyWarning = (title, subtitle) => buildNotification({ type: "warning", title, subtitle });
  }

  const body = document.body;
  const page = body.getAttribute("data-page");
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

  if (sidebar) {
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

  const logoutButton = document.querySelector(".profile-action");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      fetch("/api/auth/logout", { method: "POST" })
        .then(() => {
          window.location.href = "/login";
        })
        .catch(() => {
          window.location.href = "/login";
        });
    });
  }
})();
