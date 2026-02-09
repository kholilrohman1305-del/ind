(() => {
  const body = document.body;
  const role = body?.dataset?.role;
  if (role !== "siswa") return;

  const items = [
    { page: "dashboard", label: "Home", href: "/dashboard-siswa", icon: "fa-solid fa-house" },
    { page: "jadwal", label: "Jadwal", href: "/jadwal-siswa", icon: "fa-solid fa-calendar-days" },
    { page: "program-saya", label: "Program", href: "/program-siswa", icon: "fa-solid fa-book-open" },
    { page: "feedback", label: "Feedback", href: "/feedback", icon: "fa-solid fa-comment-dots" },
    { page: "tagihan", label: "Tagihan", href: "/tagihan-siswa", icon: "fa-solid fa-file-invoice-dollar" },
  ];

  const buildFooter = () => {
    const footer = document.getElementById("siswaFooterNav");
    if (!footer) return;

    const container = document.createElement("div");
    container.className = "siswa-footer-inner";

    items.forEach((item) => {
      const anchor = document.createElement("a");
      anchor.href = item.href;
      anchor.dataset.page = item.page;
      anchor.className = "siswa-footer-link";
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
    container.querySelectorAll(".siswa-footer-link").forEach((item) => {
      item.classList.toggle("active", item.dataset.page === currentPage);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildFooter);
  } else {
    buildFooter();
  }
})();
