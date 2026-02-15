(() => {
  const requester = window.api?.request || fetch;
  let unreadCount = 0;
  let notificationsData = [];
  let pollInterval;

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Baru saja";
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    if (days < 7) return `${days} hari lalu`;

    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch(type) {
      case 'pengumuman': return '<i class="fa-solid fa-bullhorn text-indigo-500"></i>';
      case 'tagihan': return '<i class="fa-solid fa-file-invoice-dollar text-amber-500"></i>';
      case 'tagihan_overdue': return '<i class="fa-solid fa-exclamation-triangle text-red-500"></i>';
      case 'jadwal_h0': return '<i class="fa-solid fa-calendar-check text-emerald-500"></i>';
      default: return '<i class="fa-solid fa-bell text-slate-500"></i>';
    }
  };

  // Update badge count
  const updateBadge = (count) => {
    unreadCount = count;
    const badge = document.getElementById("notificationBadge");
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    }
  };

  // Render notifications panel
  const renderNotifications = () => {
    const panel = document.getElementById("notificationPanel");
    if (!panel) return;

    const list = document.getElementById("notificationList");
    if (!list) return;

    if (notificationsData.length === 0) {
      list.innerHTML = `
        <div class="py-12 text-center">
          <i class="fa-regular fa-bell-slash text-4xl text-slate-300 mb-3"></i>
          <p class="text-sm text-slate-500 font-semibold">Belum ada notifikasi</p>
        </div>
      `;
      return;
    }

    const html = notificationsData.map(item => `
      <div class="notification-item p-4 hover:bg-slate-50 transition cursor-pointer ${item.is_read ? 'opacity-60' : 'bg-indigo-50/30'}"
           data-id="${item.id}" data-read="${item.is_read}">
        <div class="flex gap-3">
          <div class="flex-shrink-0 mt-1">
            ${getNotificationIcon(item.tipe_notifikasi)}
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-bold text-slate-900 mb-1">${item.judul}</h4>
            <p class="text-xs text-slate-600 leading-relaxed">${item.pesan}</p>
            <span class="text-[10px] text-slate-400 mt-2 block">${formatDate(item.created_at)}</span>
          </div>
          ${!item.is_read ? '<div class="flex-shrink-0"><div class="w-2 h-2 bg-indigo-600 rounded-full"></div></div>' : ''}
        </div>
      </div>
    `).join("");

    list.innerHTML = html;

    // Add click listeners
    list.querySelectorAll(".notification-item").forEach(item => {
      item.addEventListener("click", () => markAsReadSingle(item.dataset.id));
    });
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await requester("/api/notifikasi?limit=20", {
        credentials: "same-origin"
      });

      if (!res.ok) return;

      const json = await res.json();
      notificationsData = json.data?.notifications || [];
      updateBadge(json.data?.unread_count || 0);

      // Show popup for new unread pengumuman
      const newAnnouncements = notificationsData.filter(n =>
        n.tipe_notifikasi === 'pengumuman' && !n.is_read
      );
      if (newAnnouncements.length > 0 && typeof showNotificationPopup === 'function') {
        showNotificationPopup(newAnnouncements[0]);
      }

      renderNotifications();
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  // Mark single notification as read
  const markAsReadSingle = async (id) => {
    try {
      await requester("/api/notifikasi/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ notification_ids: [parseInt(id)] })
      });

      // Update local state
      const item = notificationsData.find(n => String(n.id) === String(id));
      if (item) {
        item.is_read = 1;
        updateBadge(Math.max(0, unreadCount - 1));
        renderNotifications();
      }
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await requester("/api/notifikasi/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ notification_ids: "all" })
      });

      notificationsData.forEach(n => n.is_read = 1);
      updateBadge(0);
      renderNotifications();
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  // Toggle notification panel
  const togglePanel = () => {
    const panel = document.getElementById("notificationPanel");
    const overlay = document.getElementById("notificationOverlay");

    if (!panel || !overlay) return;

    const isHidden = panel.classList.contains("hidden");

    if (isHidden) {
      panel.classList.remove("hidden");
      overlay.classList.remove("hidden");
      fetchNotifications(); // Refresh on open
    } else {
      panel.classList.add("hidden");
      overlay.classList.add("hidden");
    }
  };

  // Close panel
  const closePanel = () => {
    const panel = document.getElementById("notificationPanel");
    const overlay = document.getElementById("notificationOverlay");
    panel?.classList.add("hidden");
    overlay?.classList.add("hidden");
  };

  // Initialize
  const init = () => {
    // Add event listeners
    const bellBtn = document.getElementById("notificationBellBtn");
    const markAllBtn = document.getElementById("markAllReadBtn");
    const overlay = document.getElementById("notificationOverlay");

    bellBtn?.addEventListener("click", togglePanel);
    markAllBtn?.addEventListener("click", () => {
      markAllAsRead();
      closePanel();
    });
    overlay?.addEventListener("click", closePanel);

    // Initial fetch
    fetchNotifications();

    // Poll for new notifications every 30 seconds
    pollInterval = setInterval(fetchNotifications, 30000);
  };

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    if (pollInterval) clearInterval(pollInterval);
  });

  // Auto-init when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose for external use
  window.notificationBell = {
    refresh: fetchNotifications,
    close: closePanel
  };
})();
