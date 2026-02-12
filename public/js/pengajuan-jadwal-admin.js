// Pengajuan Jadwal Admin Management
const { PENGAJUAN_STATUS, ROLES } = window.APP_CONSTANTS;

const requester = window.api?.request || fetch;

const adminPengajuanState = {
  pengajuanList: [],
  stats: { menunggu: 0, disetujui: 0, ditolak: 0 },
  statusFilter: PENGAJUAN_STATUS.MENUNGGU,
  loading: false
};

document.addEventListener("DOMContentLoaded", async () => {
  await checkSession();
  setupEventListeners();
  await fetchPengajuan();
});

function setupEventListeners() {
  // Status filter
  const filterStatus = document.getElementById("filterStatus");
  if (filterStatus) {
    filterStatus.addEventListener("change", (e) => {
      adminPengajuanState.statusFilter = e.target.value;
      fetchPengajuan();
    });
  }

  // Modal close
  const closeBtn = document.getElementById("closeApprovalModal");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeApprovalModal);
  }

  const cancelBtn = document.getElementById("cancelApprovalModal");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeApprovalModal);
  }

  // Form submit
  const form = document.getElementById("approvalForm");
  if (form) {
    form.addEventListener("submit", handleApprovalSubmit);
  }
}

async function fetchPengajuan() {
  if (adminPengajuanState.loading) return;
  adminPengajuanState.loading = true;

  try {
    const params = new URLSearchParams();
    if (adminPengajuanState.statusFilter) {
      params.append("status", adminPengajuanState.statusFilter);
    }

    const url = `/api/pengajuan-jadwal${params.toString() ? '?' + params.toString() : ''}`;
    const res = await requester(url, { credentials: "same-origin" });

    if (!res.ok) {
      if (res.status === 403 || res.status === 401) {
        window.location.href = "/pages/login.html";
        return;
      }
      throw new Error("Failed to fetch pengajuan");
    }

    const json = await res.json();
    if (json.success) {
      adminPengajuanState.pengajuanList = json.data || [];

      // Calculate stats
      const allData = json.data || [];
      adminPengajuanState.stats = {
        menunggu: allData.filter(p => p.status === PENGAJUAN_STATUS.MENUNGGU).length,
        disetujui: allData.filter(p => p.status === PENGAJUAN_STATUS.DISETUJUI).length,
        ditolak: allData.filter(p => p.status === PENGAJUAN_STATUS.DITOLAK).length
      };

      renderStats();
      renderPengajuanList();
    } else {
      window.toast.error(json.message || "Gagal memuat data");
    }
  } catch (err) {
    console.error("Error fetching pengajuan:", err);
    window.toast.error("Gagal memuat data pengajuan");
    adminPengajuanState.pengajuanList = [];
    renderPengajuanList();
  } finally {
    adminPengajuanState.loading = false;
  }
}

function renderStats() {
  document.getElementById("statMenunggu").textContent = adminPengajuanState.stats.menunggu;
  document.getElementById("statDisetujui").textContent = adminPengajuanState.stats.disetujui;
  document.getElementById("statDitolak").textContent = adminPengajuanState.stats.ditolak;
}

function renderPengajuanList() {
  const container = document.getElementById("pengajuanRows");
  const emptyEl = document.getElementById("pengajuanEmpty");

  if (!container || !emptyEl) return;

  if (adminPengajuanState.pengajuanList.length === 0) {
    container.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }

  emptyEl.classList.add("hidden");
  container.innerHTML = "";

  adminPengajuanState.pengajuanList.forEach((item) => {
    const card = document.createElement("div");
    const statusColor =
      item.status === PENGAJUAN_STATUS.MENUNGGU ? "border-yellow-400 bg-yellow-50" :
      item.status === PENGAJUAN_STATUS.DISETUJUI ? "border-green-400 bg-green-50" :
      "border-red-400 bg-red-50";

    card.className = `bg-white border-l-4 ${statusColor} rounded-lg p-5 shadow-md hover:shadow-lg transition-shadow`;

    const tipeLabel = item.tipe === "reschedule" ? "Reschedule" : "Izin";
    const tipeColor = item.tipe === "reschedule" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700";

    card.innerHTML = `
      <div class="flex justify-between items-start mb-4">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <h4 class="font-bold text-lg text-gray-800">${item.edukator_nama}</h4>
            <span class="px-2 py-1 rounded-full text-xs font-semibold ${tipeColor}">
              ${tipeLabel}
            </span>
          </div>
          <p class="text-sm text-gray-600">
            <i class="fas fa-user text-gray-400 mr-1"></i> ${item.siswa_nama || "-"} • ${item.program_nama || "-"}
          </p>
        </div>
        <div class="flex flex-col items-end">
          <span class="px-3 py-1 rounded-full text-xs font-bold badge-${item.status}">
            ${item.status.toUpperCase()}
          </span>
          <span class="text-xs text-gray-400 mt-1">${formatDate(item.created_at)}</span>
        </div>
      </div>

      <!-- Original Schedule -->
      <div class="bg-gray-50 rounded-lg p-4 mb-3">
        <p class="text-xs font-semibold text-gray-500 mb-2">Jadwal Asli:</p>
        <div class="flex items-center gap-3 text-sm text-gray-700">
          <div class="flex items-center gap-2">
            <i class="fas fa-calendar text-gray-400"></i>
            <span>${formatDate(item.jadwal_tanggal)}</span>
          </div>
          <div class="flex items-center gap-2">
            <i class="fas fa-clock text-gray-400"></i>
            <span>${item.jadwal_jam_mulai} - ${item.jadwal_jam_selesai}</span>
          </div>
        </div>
      </div>

      ${item.tipe === "reschedule" && item.tanggal_usulan ? `
        <!-- Proposed Schedule -->
        <div class="bg-blue-50 rounded-lg p-4 mb-3 border border-blue-200">
          <p class="text-xs font-semibold text-blue-600 mb-2">Usulan Baru:</p>
          <div class="flex items-center gap-3 text-sm text-gray-700">
            <div class="flex items-center gap-2">
              <i class="fas fa-calendar text-blue-600"></i>
              <span class="font-semibold">${formatDate(item.tanggal_usulan)}</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="fas fa-clock text-blue-600"></i>
              <span class="font-semibold">${item.jam_mulai_usulan} - ${item.jam_selesai_usulan}</span>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Reason -->
      <div class="mb-4">
        <p class="text-xs font-semibold text-gray-500 mb-1">Alasan:</p>
        <p class="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">${item.alasan}</p>
      </div>

      ${item.catatan_admin ? `
        <!-- Admin Notes -->
        <div class="mb-4 bg-purple-50 p-3 rounded-lg border border-purple-200">
          <p class="text-xs font-semibold text-purple-600 mb-1">Catatan Admin:</p>
          <p class="text-sm text-gray-700">${item.catatan_admin}</p>
          ${item.approved_by_email ? `
            <p class="text-xs text-gray-400 mt-2">Oleh: ${item.approved_by_email} • ${formatDateTime(item.approved_at)}</p>
          ` : ''}
        </div>
      ` : ''}

      ${item.status === PENGAJUAN_STATUS.MENUNGGU ? `
        <!-- Action Buttons -->
        <div class="flex gap-3 pt-3 border-t border-gray-200">
          <button
            onclick="openApprovalModal(${item.id}, 'approve')"
            class="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <i class="fas fa-check"></i> Setujui
          </button>
          <button
            onclick="openApprovalModal(${item.id}, 'reject')"
            class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <i class="fas fa-times"></i> Tolak
          </button>
        </div>
      ` : ''}
    `;

    container.appendChild(card);
  });
}

window.openApprovalModal = function(pengajuanId, action) {
  const pengajuan = adminPengajuanState.pengajuanList.find(p => p.id === pengajuanId);
  if (!pengajuan) return;

  document.getElementById("approval_pengajuan_id").value = pengajuanId;
  document.getElementById("approval_action").value = action;
  document.getElementById("approval_catatan").value = "";

  const modalHeader = document.getElementById("modalHeader");
  const modalTitle = document.getElementById("modalTitle");
  const modalSubtitle = document.getElementById("modalSubtitle");
  const submitBtn = document.getElementById("submitApprovalBtn");
  const catatanRequired = document.getElementById("catatanRequired");

  if (action === "approve") {
    modalHeader.className = "px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-green-50";
    modalTitle.textContent = "Setujui Pengajuan";
    modalSubtitle.textContent = `${pengajuan.edukator_nama} - ${pengajuan.siswa_nama}`;
    submitBtn.className = "px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition text-sm font-bold";
    submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Setujui';
    catatanRequired.classList.add("hidden");
    document.getElementById("approval_catatan").required = false;
  } else {
    modalHeader.className = "px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-red-50";
    modalTitle.textContent = "Tolak Pengajuan";
    modalSubtitle.textContent = `${pengajuan.edukator_nama} - ${pengajuan.siswa_nama}`;
    submitBtn.className = "px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md transition text-sm font-bold";
    submitBtn.innerHTML = '<i class="fas fa-times mr-2"></i> Tolak';
    catatanRequired.classList.remove("hidden");
    document.getElementById("approval_catatan").required = true;
  }

  showApprovalModal();
};

function showApprovalModal() {
  const modal = document.getElementById("approvalModal");
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  setTimeout(() => {
    modal.classList.remove("opacity-0", "pointer-events-none");
    modal.querySelector(".modal-card").classList.remove("scale-95");
  }, 10);
}

function closeApprovalModal() {
  const modal = document.getElementById("approvalModal");
  if (!modal) return;

  modal.classList.add("opacity-0", "pointer-events-none");
  modal.querySelector(".modal-card").classList.add("scale-95");
  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.getElementById("approvalForm").reset();
  }, 200);
}

async function handleApprovalSubmit(e) {
  e.preventDefault();

  const pengajuanId = document.getElementById("approval_pengajuan_id").value;
  const action = document.getElementById("approval_action").value;
  const catatan = document.getElementById("approval_catatan").value.trim();

  if (action === "reject" && !catatan) {
    window.toast.error("Catatan wajib diisi saat menolak");
    return;
  }

  try {
    const endpoint = action === "approve" ? "approve" : "reject";
    const res = await requester(`/api/pengajuan-jadwal/${pengajuanId}/${endpoint}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ catatan_admin: catatan || null })
    });

    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.message || `Gagal ${action === "approve" ? "menyetujui" : "menolak"} pengajuan`);
    }

    const json = await res.json();
    if (json.success) {
      window.toast.success(json.message || `Pengajuan berhasil ${action === "approve" ? "disetujui" : "ditolak"}`);
      closeApprovalModal();
      fetchPengajuan();
    } else {
      window.toast.error(json.message || "Gagal memproses pengajuan");
    }
  } catch (err) {
    console.error("Error processing approval:", err);
    window.toast.error(err.message || "Gagal memproses pengajuan");
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateTime(datetimeStr) {
  if (!datetimeStr) return "-";
  const date = new Date(datetimeStr);
  return formatDate(datetimeStr) + " " + date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

async function checkSession() {
  try {
    const res = await requester("/api/auth/session", { credentials: "same-origin" });
    const session = await res.json();

    if (!session || !session.loggedIn) {
      window.location.href = "/pages/login.html";
      return;
    }

    if (session.user.role !== ROLES.ADMIN_CABANG && session.user.role !== ROLES.SUPER_ADMIN) {
      window.location.href = "/pages/dashboard-siswa.html";
      return;
    }
  } catch (err) {
    console.error("Session check error:", err);
    window.location.href = "/pages/login.html";
  }
}
