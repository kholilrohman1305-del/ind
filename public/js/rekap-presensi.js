// Rekap Presensi Edukator
const state = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  data: null,
  loading: false,
  search: ""
};

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  await checkSession();
  setupMonthSelector();
  setupSearch();
  await fetchRekap();
});

// Setup month selector with current month
function setupMonthSelector() {
  const monthSelector = document.getElementById("monthSelector");
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  monthSelector.value = `${year}-${month}`;

  monthSelector.addEventListener("change", (e) => {
    const [y, m] = e.target.value.split("-");
    state.year = parseInt(y);
    state.month = parseInt(m);
    fetchRekap();
  });
}

function setupSearch() {
  const searchInput = document.getElementById("rekapSearch");
  if (!searchInput) return;
  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value || "";
    render();
  });
}

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function matchesSearch(value) {
  const query = normalizeText(state.search);
  if (!query) return true;
  return normalizeText(value).includes(query);
}

// Fetch rekap data from API
async function fetchRekap() {
  if (state.loading) return;
  state.loading = true;

  try {
    const main = document.querySelector("main");
    main.classList.add("loading");

    const res = await fetch(
      `/api/edukator/rekap-presensi?year=${state.year}&month=${state.month}`,
      { credentials: "same-origin" }
    );

    if (!res.ok) {
      if (res.status === 403 || res.status === 401) {
        window.location.href = "/pages/login.html";
        return;
      }
      throw new Error("Failed to fetch rekap");
    }

    const json = await res.json();
    if (json.success) {
      state.data = json.data;
      render();
    } else {
      window.notifyError(json.message || "Gagal memuat data");
    }
  } catch (err) {
    console.error("Error fetching rekap:", err);
    window.notifyError("Gagal memuat data rekap");
    state.data = null;
    renderEmpty();
  } finally {
    state.loading = false;
    const main = document.querySelector("main");
    main.classList.remove("loading");
  }
}

// Render all data
function render() {
  if (!state.data) {
    renderEmpty();
    return;
  }

  renderSummary();
  renderWeekBreakdown();
  renderProgramBreakdown();
  renderMissingPresensi();
}

// Render summary cards
function renderSummary() {
  const { summary } = state.data;

  document.getElementById("totalJadwal").textContent = summary.total_jadwal_terjadwal || 0;
  document.getElementById("totalSelesai").textContent = summary.total_jadwal_selesai || 0;
  document.getElementById("totalPresensi").textContent = summary.total_presensi || 0;
  document.getElementById("persentaseKehadiran").textContent = `${summary.persentase_kehadiran || 0}%`;
}

// Render week breakdown table
function renderWeekBreakdown() {
  const { breakdown_by_week } = state.data;

  const emptyEl = document.getElementById("weekBreakdownEmpty");
  const tableEl = document.getElementById("weekBreakdownTable");
  const tbody = document.getElementById("weekBreakdownBody");

  const filtered = (breakdown_by_week || []).filter((item) =>
    matchesSearch(`minggu ${item.minggu_ke} ${item.total_jadwal} ${item.total_presensi}`)
  );

  if (!filtered.length) {
    emptyEl.classList.remove("hidden");
    tableEl.classList.add("hidden");
    return;
  }

  emptyEl.classList.add("hidden");
  tableEl.classList.remove("hidden");
  tbody.innerHTML = "";

  filtered.forEach((item) => {
    const persentase = item.total_jadwal > 0
      ? ((item.total_presensi / item.total_jadwal) * 100).toFixed(1)
      : "0.0";

    const tr = document.createElement("tr");
    tr.className = "border-b border-slate-100 hover:bg-slate-50 transition-colors";
    tr.innerHTML = `
      <td class="py-3 px-2 text-slate-700">Minggu ${item.minggu_ke}</td>
      <td class="py-3 px-2 text-right text-slate-700">${item.total_jadwal || 0}</td>
      <td class="py-3 px-2 text-right text-slate-700">${item.total_presensi || 0}</td>
      <td class="py-3 px-2 text-right">
        <span class="inline-block px-2 py-1 rounded-lg text-xs font-semibold ${
          parseFloat(persentase) >= 90 ? "bg-green-100 text-green-700" :
          parseFloat(persentase) >= 70 ? "bg-yellow-100 text-yellow-700" :
          "bg-red-100 text-red-700"
        }">
          ${persentase}%
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Render program breakdown table
function renderProgramBreakdown() {
  const { breakdown_by_program } = state.data;

  const emptyEl = document.getElementById("programBreakdownEmpty");
  const tableEl = document.getElementById("programBreakdownTable");
  const tbody = document.getElementById("programBreakdownBody");

  const filtered = (breakdown_by_program || []).filter((item) =>
    matchesSearch(`${item.program_nama} ${item.total_jadwal} ${item.total_presensi}`)
  );

  if (!filtered.length) {
    emptyEl.classList.remove("hidden");
    tableEl.classList.add("hidden");
    return;
  }

  emptyEl.classList.add("hidden");
  tableEl.classList.remove("hidden");
  tbody.innerHTML = "";

  filtered.forEach((item) => {
    const persentase = item.total_jadwal > 0
      ? ((item.total_presensi / item.total_jadwal) * 100).toFixed(1)
      : "0.0";

    const tr = document.createElement("tr");
    tr.className = "border-b border-slate-100 hover:bg-slate-50 transition-colors";
    tr.innerHTML = `
      <td class="py-3 px-2 text-slate-700 font-medium">${item.program_nama || "-"}</td>
      <td class="py-3 px-2 text-right text-slate-700">${item.total_jadwal || 0}</td>
      <td class="py-3 px-2 text-right text-slate-700">${item.total_presensi || 0}</td>
      <td class="py-3 px-2 text-right">
        <span class="inline-block px-2 py-1 rounded-lg text-xs font-semibold ${
          parseFloat(persentase) >= 90 ? "bg-green-100 text-green-700" :
          parseFloat(persentase) >= 70 ? "bg-yellow-100 text-yellow-700" :
          "bg-red-100 text-red-700"
        }">
          ${persentase}%
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Render missing presensi list
function renderMissingPresensi() {
  const { jadwal_tidak_presensi } = state.data;

  const emptyEl = document.getElementById("missingPresensiEmpty");
  const listEl = document.getElementById("missingPresensiList");

  const filtered = (jadwal_tidak_presensi || []).filter((item) =>
    matchesSearch(`${item.siswa_nama} ${item.program_nama} ${formatDate(item.tanggal)} ${item.jam_mulai}`)
  );

  if (!filtered.length) {
    emptyEl.classList.remove("hidden");
    listEl.classList.add("hidden");
    return;
  }

  emptyEl.classList.add("hidden");
  listEl.classList.remove("hidden");
  listEl.innerHTML = "";

  filtered.forEach((item) => {
    const card = document.createElement("div");
    card.className = "flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg hover:shadow-md transition-shadow";
    card.innerHTML = `
      <div class="flex-1">
        <div class="font-semibold text-slate-800">${item.siswa_nama || "-"}</div>
        <div class="text-sm text-slate-600 mt-1">${item.program_nama || "-"}</div>
      </div>
      <div class="text-right">
        <div class="text-sm font-medium text-slate-700">${formatDate(item.tanggal)}</div>
        <div class="text-xs text-slate-500 mt-1">${item.jam_mulai || "-"}</div>
      </div>
    `;
    listEl.appendChild(card);
  });
}

// Render empty state
function renderEmpty() {
  document.getElementById("totalJadwal").textContent = "0";
  document.getElementById("totalSelesai").textContent = "0";
  document.getElementById("totalPresensi").textContent = "0";
  document.getElementById("persentaseKehadiran").textContent = "0%";

  document.getElementById("weekBreakdownEmpty").classList.remove("hidden");
  document.getElementById("weekBreakdownTable").classList.add("hidden");

  document.getElementById("programBreakdownEmpty").classList.remove("hidden");
  document.getElementById("programBreakdownTable").classList.add("hidden");

  document.getElementById("missingPresensiEmpty").classList.remove("hidden");
  document.getElementById("missingPresensiList").classList.add("hidden");
}

// Format date helper
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Check session
async function checkSession() {
  try {
    const res = await fetch("/api/auth/session", { credentials: "same-origin" });
    const session = await res.json();

    if (!session || !session.loggedIn) {
      window.location.href = "/pages/login.html";
      return;
    }

    if (session.user.role !== "edukator" && session.user.role !== "admin_cabang" && session.user.role !== "super_admin") {
      window.location.href = "/pages/dashboard-siswa.html";
      return;
    }
  } catch (err) {
    console.error("Session check error:", err);
    window.location.href = "/pages/login.html";
  }
}
