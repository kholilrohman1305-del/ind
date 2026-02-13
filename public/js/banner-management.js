(() => {
  const bannerList = document.getElementById("bannerList");
  const emptyState = document.getElementById("emptyState");
  const addBannerBtn = document.getElementById("addBannerBtn");
  const bannerModal = document.getElementById("bannerModal");
  const bannerModalOverlay = document.getElementById("bannerModalOverlay");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const cancelModalBtn = document.getElementById("cancelModalBtn");
  const modalTitle = document.getElementById("modalTitle");
  const bannerForm = document.getElementById("bannerForm");
  const bannerFormError = document.getElementById("bannerFormError");
  const deleteModal = document.getElementById("deleteModal");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

  const fields = {
    id: document.getElementById("bannerId"),
    gambar: document.getElementById("bannerGambar"),
    judul: document.getElementById("bannerJudul"),
    linkUrl: document.getElementById("bannerLinkUrl"),
    urutan: document.getElementById("bannerUrutan"),
    isActive: document.getElementById("bannerIsActive"),
  };
  const gambarPreview = document.getElementById("gambarPreview");
  const gambarPreviewImg = document.getElementById("gambarPreviewImg");

  let banners = [];
  let deleteId = null;

  // --- Fetch & Render ---
  const fetchBanners = async () => {
    try {
      const res = await window.api.request("/api/banner");
      const json = await res.json();
      if (json.success) {
        banners = json.data;
        renderBanners();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderBanners = () => {
    if (banners.length === 0) {
      bannerList.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");

    bannerList.innerHTML = banners.map((b, i) => `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition" data-id="${b.id}">
        <div class="flex flex-col md:flex-row">
          <div class="md:w-72 h-40 md:h-auto flex-shrink-0 bg-gray-100 relative">
            <img src="${b.gambar}" alt="${b.judul || 'Banner'}" class="w-full h-full object-cover" />
            <span class="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-xs font-bold ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
              ${b.is_active ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
          <div class="flex-1 p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h3 class="font-bold text-gray-900">${b.judul || '<span class="text-gray-400 italic">Tanpa judul</span>'}</h3>
                  <p class="text-xs text-gray-400 mt-0.5">Urutan: ${b.urutan} &bull; ID: ${b.id}</p>
                </div>
                <span class="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">#${i + 1}</span>
              </div>
              ${b.link_url ? `<p class="text-xs text-indigo-500 mt-2 truncate"><i class="fa-solid fa-link mr-1"></i>${b.link_url}</p>` : ''}
            </div>
            <div class="flex items-center gap-2 mt-3">
              <button class="toggle-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition
                ${b.is_active ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50'}"
                data-id="${b.id}">
                <i class="fa-solid ${b.is_active ? 'fa-eye-slash' : 'fa-eye'}"></i>
                ${b.is_active ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
              <button class="edit-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition" data-id="${b.id}">
                <i class="fa-solid fa-pen"></i> Edit
              </button>
              <button class="delete-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition" data-id="${b.id}">
                <i class="fa-solid fa-trash"></i> Hapus
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join("");
  };

  // --- Modal ---
  const openModal = (mode, banner = null) => {
    bannerForm.reset();
    bannerFormError.classList.add("hidden");
    gambarPreview.classList.add("hidden");
    fields.id.value = "";

    if (mode === "edit" && banner) {
      modalTitle.textContent = "Edit Banner";
      fields.id.value = banner.id;
      fields.judul.value = banner.judul || "";
      fields.linkUrl.value = banner.link_url || "";
      fields.urutan.value = banner.urutan;
      fields.isActive.value = banner.is_active ? "1" : "0";
      if (banner.gambar) {
        gambarPreviewImg.src = banner.gambar;
        gambarPreview.classList.remove("hidden");
      }
    } else {
      modalTitle.textContent = "Tambah Banner";
      fields.urutan.value = banners.length;
    }

    bannerModal.classList.remove("hidden");
  };

  const closeModal = () => bannerModal.classList.add("hidden");

  // --- Submit ---
  bannerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    bannerFormError.classList.add("hidden");

    const isEdit = Boolean(fields.id.value);
    const file = fields.gambar.files[0];

    if (!isEdit && !file) {
      bannerFormError.textContent = "Gambar wajib diupload.";
      bannerFormError.classList.remove("hidden");
      return;
    }

    const formData = new FormData();
    if (file) formData.append("gambar", file);
    formData.append("judul", fields.judul.value);
    formData.append("link_url", fields.linkUrl.value);
    formData.append("urutan", fields.urutan.value);
    formData.append("is_active", fields.isActive.value);

    try {
      const url = isEdit ? `/api/banner/${fields.id.value}` : "/api/banner";
      const method = isEdit ? "PUT" : "POST";
      const res = await window.api.request(url, { method, body: formData });
      const json = await res.json();

      if (!json.success) {
        bannerFormError.textContent = json.message;
        bannerFormError.classList.remove("hidden");
        return;
      }

      closeModal();
      if (window.toast) window.toast.success("Berhasil", json.message);
      fetchBanners();
    } catch (err) {
      bannerFormError.textContent = err.message;
      bannerFormError.classList.remove("hidden");
    }
  });

  // --- Toggle Active ---
  const handleToggle = async (id) => {
    try {
      const res = await window.api.request(`/api/banner/${id}/toggle`, { method: "PATCH" });
      const json = await res.json();
      if (json.success) {
        if (window.toast) window.toast.success("Berhasil", json.message);
        fetchBanners();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Delete ---
  const openDeleteModal = (id) => {
    deleteId = id;
    deleteModal.classList.remove("hidden");
  };

  const closeDeleteModal = () => {
    deleteId = null;
    deleteModal.classList.add("hidden");
  };

  confirmDeleteBtn.addEventListener("click", async () => {
    if (!deleteId) return;
    try {
      const res = await window.api.request(`/api/banner/${deleteId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        if (window.toast) window.toast.success("Berhasil", json.message);
        fetchBanners();
      }
    } catch (err) {
      console.error(err);
    }
    closeDeleteModal();
  });

  // --- Event Delegation ---
  bannerList.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".edit-btn");
    if (editBtn) {
      const banner = banners.find(b => b.id === Number(editBtn.dataset.id));
      if (banner) openModal("edit", banner);
      return;
    }

    const deleteBtn = e.target.closest(".delete-btn");
    if (deleteBtn) {
      openDeleteModal(Number(deleteBtn.dataset.id));
      return;
    }

    const toggleBtn = e.target.closest(".toggle-btn");
    if (toggleBtn) {
      handleToggle(Number(toggleBtn.dataset.id));
      return;
    }
  });

  // --- Image Preview ---
  fields.gambar.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        gambarPreviewImg.src = ev.target.result;
        gambarPreview.classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    } else {
      gambarPreview.classList.add("hidden");
    }
  });

  // --- Close Modals ---
  addBannerBtn.addEventListener("click", () => openModal("create"));
  closeModalBtn.addEventListener("click", closeModal);
  cancelModalBtn.addEventListener("click", closeModal);
  bannerModalOverlay.addEventListener("click", closeModal);
  cancelDeleteBtn.addEventListener("click", closeDeleteModal);

  // --- Init ---
  fetchBanners();
})();
