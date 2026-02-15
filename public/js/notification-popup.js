// Notification Popup Component
(() => {
  let popupContainer;

  // Create popup container if it doesn't exist
  const ensureContainer = () => {
    if (!popupContainer) {
      popupContainer = document.createElement("div");
      popupContainer.id = "notificationPopupContainer";
      popupContainer.className = "fixed top-4 right-4 z-[60] flex flex-col gap-3 pointer-events-none";
      popupContainer.style.maxWidth = "400px";
      document.body.appendChild(popupContainer);
    }
    return popupContainer;
  };

  // Show popup notification
  window.showNotificationPopup = (notification) => {
    const container = ensureContainer();

    const popup = document.createElement("div");
    popup.className = "notification-popup bg-white rounded-2xl shadow-2xl border border-indigo-100 p-4 animate-slide-in-right pointer-events-auto";
    popup.style.animation = "slideInRight 0.3s ease-out";

    const icon = notification.tipe_notifikasi === 'pengumuman' ?
      '<i class="fa-solid fa-bullhorn text-indigo-500"></i>' :
      '<i class="fa-solid fa-bell text-slate-500"></i>';

    popup.innerHTML = `
      <div class="flex gap-3">
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
          ${icon}
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-bold text-slate-900 mb-1">${notification.judul}</h4>
          <p class="text-xs text-slate-600 leading-relaxed line-clamp-2">${notification.pesan}</p>
        </div>
        <button class="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 popup-close">
          <i class="fa-solid fa-xmark text-xs"></i>
        </button>
      </div>
    `;

    // Close button
    popup.querySelector(".popup-close").addEventListener("click", () => {
      popup.style.animation = "slideOutRight 0.3s ease-in";
      setTimeout(() => popup.remove(), 300);
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (popup.parentNode) {
        popup.style.animation = "slideOutRight 0.3s ease-in";
        setTimeout(() => popup.remove(), 300);
      }
    }, 5000);

    container.appendChild(popup);
  };

  // Add animations to document if not already present
  if (!document.getElementById("notificationPopupStyles")) {
    const style = document.createElement("style");
    style.id = "notificationPopupStyles";
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
  }
})();
