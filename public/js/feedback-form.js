(() => {
  const requester = window.api?.request || fetch;
  const { ENROLLMENT_STATUS } = window.APP_CONSTANTS;

  const form = document.getElementById("feedbackForm");
  const submitBtn = document.getElementById("submitFeedbackBtn");
  const submitText = document.getElementById("submitText");
  const submitSpinner = document.getElementById("submitSpinner");
  const listEl = document.getElementById("programFeedbackList");
  const emptyEl = document.getElementById("programFeedbackEmpty");
  const modal = document.getElementById("feedbackModal");
  const closeModalBtn = document.getElementById("closeFeedbackModal");
  const programNameEl = document.getElementById("feedbackProgramName");
  const programStatusEl = document.getElementById("feedbackProgramStatus");
  const commentEl = document.getElementById("feedbackComment");
  const ratingGroups = Array.from(document.querySelectorAll(".rating-stars"));

  const state = {
    programs: [],
    selectedProgram: null,
    ratings: { materi: 0, edukator: 0, fasilitas: 0, pelayanan: 0 },
  };

  const setLoading = (loading) => {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    if (loading) {
      submitText.textContent = "Mengirim...";
      submitSpinner.classList.remove("hidden");
    } else {
      submitText.textContent = "Kirim Penilaian";
      submitSpinner.classList.add("hidden");
    }
  };

  const notify = (type, message) => {
    if (type === "success" && window.notifySuccess) {
      window.notifySuccess("Berhasil", message);
      return;
    }
    if (type === "error" && window.notifyError) {
      window.notifyError("Gagal", message);
      return;
    }
    if (window.notify) {
      window.notify({ type, title: type === "error" ? "Gagal" : "Info", subtitle: message });
    }
  };

  const renderStars = (container, value = 0) => {
    container.innerHTML = "";
    for (let i = 1; i <= 5; i += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.value = String(i);
      btn.innerHTML = '<i class="fa-solid fa-star"></i>';
      if (i <= value) btn.classList.add("active");
      container.appendChild(btn);
    }
  };

  const resetRatings = () => {
    state.ratings = { materi: 0, edukator: 0, fasilitas: 0, pelayanan: 0 };
    ratingGroups.forEach((group) => renderStars(group, 0));
  };

  const openModal = (program) => {
    state.selectedProgram = program;
    if (programNameEl) programNameEl.textContent = program.program_nama || "Program";
    if (programStatusEl) {
      const status = program.status_enrollment === ENROLLMENT_STATUS.AKTIF ? "Aktif" : "Selesai";
      programStatusEl.textContent = status;
    }
    if (commentEl) commentEl.value = "";
    resetRatings();
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  };

  const renderList = () => {
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!state.programs.length) {
      if (emptyEl) emptyEl.classList.remove("hidden");
      return;
    }
    if (emptyEl) emptyEl.classList.add("hidden");

    state.programs.forEach((program) => {
      const statusLabel = program.status_enrollment === ENROLLMENT_STATUS.AKTIF ? "Aktif" : "Selesai";
      const progress = Number(program.completed_jadwal || 0);
      const total = Number(program.total_pertemuan || 0);
      const progressText = total ? `${progress}/${total} pertemuan` : "-";

      const item = document.createElement("div");
      item.className = "flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/60";
      item.innerHTML = `
        <div class="min-w-0">
          <div class="text-sm font-bold text-slate-800 truncate">${program.program_nama || "Program"}</div>
          <div class="text-xs text-slate-500 mt-1">${progressText}</div>
          <span class="inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            program.status_enrollment === ENROLLMENT_STATUS.AKTIF
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-600"
          }">
            ${statusLabel}
          </span>
        </div>
        <button class="px-3 py-2 text-xs font-semibold rounded-xl text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-sm" type="button">
          Berikan Penilaian
        </button>
      `;

      const btn = item.querySelector("button");
      btn.addEventListener("click", () => openModal(program));
      listEl.appendChild(item);
    });
  };

  const safeJson = async (res) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const loadPrograms = async () => {
    try {
      const res = await requester("/api/siswa/programs", { credentials: "same-origin" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error("Gagal memuat program.");
      const json = await safeJson(res);
      if (!json) throw new Error("Gagal memuat program.");
      if (!json.success) throw new Error(json.message || "Gagal memuat program.");
      state.programs = json.data || [];
      renderList();
    } catch (err) {
      console.error(err);
      notify("error", err.message || "Gagal memuat program.");
    }
  };

  const handleRatingClick = (group, aspect, value) => {
    state.ratings[aspect] = value;
    renderStars(group, value);
  };

  const wireRatingGroups = () => {
    ratingGroups.forEach((group) => {
      const aspect = group.dataset.aspect;
      if (!aspect) return;
      renderStars(group, 0);
      group.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-value]");
        if (!button) return;
        const value = parseInt(button.dataset.value, 10);
        handleRatingClick(group, aspect, value);
      });
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!state.selectedProgram) {
      notify("error", "Pilih program terlebih dahulu.");
      return;
    }

    const { materi, edukator, fasilitas, pelayanan } = state.ratings;
    if (!materi || !edukator || !fasilitas || !pelayanan) {
      notify("error", "Lengkapi semua penilaian bintang.");
      return;
    }

    const avgRating = Math.round((materi + edukator + fasilitas + pelayanan) / 4);
    const komentar = commentEl ? commentEl.value.trim() : "";

    const payload = {
      jenis_feedback: "program",
      rating: avgRating,
      komentar,
      program_id: state.selectedProgram.program_id,
      edukator_id: null,
      aspek_penilaian: { materi, edukator, fasilitas, pelayanan },
    };

    setLoading(true);
    try {
      const res = await requester("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        notify("error", "Sesi Anda telah berakhir. Silakan login ulang.");
        setTimeout(() => { window.location.href = "/login"; }, 1500);
        return;
      }

      const json = await safeJson(res);
      if (!json) {
        throw new Error("Terjadi kesalahan pada server. Silakan coba lagi.");
      }
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengirim feedback.");
      }

      notify("success", "Feedback berhasil dikirim. Terima kasih atas penilaian Anda!");
      closeModal();
    } catch (err) {
      notify("error", err.message || "Gagal mengirim feedback.");
    } finally {
      setLoading(false);
    }
  };

  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
  }

  if (form) form.addEventListener("submit", handleSubmit);

  document.addEventListener("DOMContentLoaded", () => {
    wireRatingGroups();
    loadPrograms();
  });
})();
