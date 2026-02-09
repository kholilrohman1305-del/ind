(() => {
  const body = document.body;
  const role = body?.dataset?.role;
  const isEdukatorPage = role === "edukator";
  if (!isEdukatorPage) return;

  const footerItems = [
    { page: "dashboard", label: "Home", href: "/dashboard-edukator", icon: "fa-solid fa-house" },
    { page: "jadwal", label: "Jadwal", href: "/jadwal-edukator", icon: "fa-solid fa-calendar-days" },
    { page: "presensi", label: "Presensi", href: "/presensi-edukator", icon: "fa-solid fa-qrcode", center: true },
    { page: "rekap-kehadiran", label: "Rekap", href: "/rekap-presensi-edukator", icon: "fa-solid fa-clipboard-check" },
    { page: "rincian-gaji", label: "Gaji", href: "/rincian-gaji-edukator", icon: "fa-solid fa-wallet" },
  ];

  const buildFooterNav = () => {
    const footer = document.getElementById("edukatorFooterNav");
    if (!footer) return;

    const container = document.createElement("div");
    container.className = "edukator-footer-inner";

    footerItems.forEach((item) => {
      const anchor = document.createElement("a");
      anchor.href = item.href;
      anchor.dataset.page = item.page;
      anchor.className = `edukator-footer-link${item.center ? " is-center" : ""}`;
      anchor.setAttribute("aria-label", item.label);

      const iconWrap = document.createElement("span");
      iconWrap.className = "nav-icon";
      const icon = document.createElement("i");
      icon.className = item.icon;
      iconWrap.appendChild(icon);
      anchor.appendChild(iconWrap);

      const label = document.createElement("span");
      label.className = "nav-label";
      label.textContent = item.label;
      anchor.appendChild(label);

      container.appendChild(anchor);
    });

    footer.innerHTML = "";
    footer.appendChild(container);

    const currentPage = document.body.dataset.page;
    container.querySelectorAll(".edukator-footer-link").forEach((item) => {
      item.classList.toggle("active", item.dataset.page === currentPage);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildFooterNav);
  } else {
    buildFooterNav();
  }
})();
