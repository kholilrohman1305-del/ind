(() => {
  const requester = window.api?.request || fetch;

  // DOM Elements
  const createBtn = document.getElementById("createAnnouncementBtn");
  const modal = document.getElementById("announcementModal");
  const modalOverlay = document.getElementById("modalOverlay");
  const closeBtn = document.getElementById("closeModalBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const form = document.getElementById("announcementForm");
  const announcementsList = document.getElementById("announcementsList");
  const loadingState = document.getElementById("loadingState");
  const emptyState = document.getElementById("emptyState");

  // Open modal
  const openModal = () => {
    modal?.classList.remove("hidden");
    form?.reset();
  };

  // Close modal
  const closeModal = () => {
    modal?.classList.add("hidden");
  };

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

  // Render announcements
  const renderAnnouncements = (data) => {
    if (!data || data.length === 0) {
      loadingState?.classList.add("hidden");
      emptyState?.classList.remove("hidden");
      announcementsList?.classList.add("hidden");
      return;
    }

    loadingState?.classList.add("hidden");
    emptyState?.classList.add("hidden");
    announcementsList?.classList.remove("hidden");

    const html = data.map(item => {
      const targetLabel = item.data_ref?.target_role === 'all' ? 'Semua' :
                          item.data_ref?.target_role === 'edukator' ? 'Edukator' : 'Siswa';
      const readPercentage = item.recipient_count > 0 ?
        Math.round((item.read_count / item.recipient_count) * 100) : 0;

      return `
        <div class="announcement-card bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <i class="fa-solid fa-bullhorn text-indigo-500"></i>
                <h3 class="font-bold text-slate-900">${item.judul}</h3>
              </div>
              <p class="text-sm text-slate-600 leading-relaxed">${item.pesan}</p>
            </div>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-slate-100">
            <div class="flex items-center gap-4 text-xs text-slate-500">
              <span class="flex items-center gap-1">
                <i class="fa-solid fa-users"></i>
                ${item.recipient_count} penerima
              </span>
              <span class="flex items-center gap-1">
                <i class="fa-solid fa-envelope-open"></i>
                ${item.read_count} dibaca (${readPercentage}%)
              </span>
              <span class="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold">
                ${targetLabel}
              </span>
            </div>
            <span class="text-xs text-slate-400">${formatDate(item.created_at)}</span>
          </div>
        </div>
      `;
    }).join("");

    announcementsList.innerHTML = html;
  };

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      loadingState?.classList.remove("hidden");
      emptyState?.classList.add("hidden");
      announcementsList?.classList.add("hidden");

      const res = await requester("/api/notifikasi/announcements", {
        credentials: "same-origin"
      });

      if (!res.ok) throw new Error("Gagal memuat pengumuman");

      const json = await res.json();
      renderAnnouncements(json.data);
    } catch (err) {
      console.error("Error fetching announcements:", err);
      loadingState?.classList.add("hidden");
      if (window.toast?.error) {
        window.toast.error("Error", "Gagal memuat pengumuman");
      }
    }
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    const judul = document.getElementById("announcementJudul")?.value.trim();
    const pesan = document.getElementById("announcementPesan")?.value.trim();
    const target_role = document.querySelector('input[name="target_role"]:checked')?.value;

    if (!judul || !pesan) {
      if (window.toast?.error) {
        window.toast.error("Error", "Judul dan pesan wajib diisi");
      }
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Mengirim...';
    submitBtn.disabled = true;

    try {
      const res = await requester("/api/notifikasi/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ judul, pesan, target_role })
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.message || "Gagal mengirim pengumuman");

      if (window.toast?.success) {
        window.toast.success("Berhasil!", json.message);
      }

      closeModal();
      fetchAnnouncements();
    } catch (err) {
      console.error("Error creating announcement:", err);
      if (window.toast?.error) {
        window.toast.error("Error", err.message);
      }
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  };

  // Event listeners
  createBtn?.addEventListener("click", openModal);
  closeBtn?.addEventListener("click", closeModal);
  cancelBtn?.addEventListener("click", closeModal);
  modalOverlay?.addEventListener("click", closeModal);
  form?.addEventListener("submit", handleSubmit);

  // Init
  fetchAnnouncements();
})();
