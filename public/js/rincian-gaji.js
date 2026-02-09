// Rincian Gaji Edukator
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
  await fetchRincianGaji();
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
    fetchRincianGaji();
  });
}

function setupSearch() {
  const searchInput = document.getElementById("rincianSearch");
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

// Format rupiah
function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

// Format time
function formatTime(time) {
  if (!time) return "-";
  return time.slice(0, 5);
}

// Format jenjang label
function formatJenjang(jenjang) {
  if (!jenjang) return "-";
  const labels = {
    "PAUD_TK": "PAUD/TK",
    "SD": "SD",
    "SMP": "SMP",
    "SMA": "SMA",
    "ALUMNI": "Alumni"
  };
  return labels[jenjang] || jenjang;
}

// Format tipe les label
function formatTipeLes(tipeLes) {
  if (!tipeLes) return "-";
  const labels = {
    "privat": "Privat",
    "kelas": "Kelas"
  };
  return labels[tipeLes] || tipeLes;
}

// Fetch rincian gaji from API
async function fetchRincianGaji() {
  if (state.loading) return;
  state.loading = true;

  try {
    const main = document.querySelector("main");
    main.classList.add("loading");

    const res = await fetch(
      `/api/edukator/rincian-gaji?year=${state.year}&month=${state.month}`,
      { credentials: "same-origin" }
    );

    if (!res.ok) {
      if (res.status === 403 || res.status === 401) {
        window.location.href = "/login";
        return;
      }
      throw new Error("Gagal memuat data");
    }

    const json = await res.json();
    if (json.success) {
      state.data = json.data;
      render();
    } else {
      console.error("API Error:", json.message);
      if (window.notifyError) window.notifyError("Gagal memuat data", json.message || "Terjadi kesalahan");
      state.data = null;
      renderEmpty();
    }
  } catch (err) {
    console.error("Error fetching rincian gaji:", err);
    if (window.notifyError) window.notifyError("Gagal memuat data rincian gaji", err.message || "Periksa koneksi internet");
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

  renderEdukatorInfo();
  renderSummary();
  renderTipeBreakdown();
  renderProgramBreakdown();
  renderInfaqList();
  renderTransactions();
}

// Render edukator info
function renderEdukatorInfo() {
  const { edukator } = state.data;
  const infoEl = document.getElementById("edukatorInfo");

  if (edukator && edukator.nama) {
    let info = `${edukator.nama}`;
    if (edukator.jabatan_manajemen) {
      info += ` - ${edukator.jabatan_manajemen}`;
    }
    infoEl.textContent = info;
  }
}

// Render summary cards
function renderSummary() {
  const { summary, edukator } = state.data;

  document.getElementById("totalGaji").textContent = formatRupiah(summary.total_gaji);
  document.getElementById("gajiMengajar").textContent = formatRupiah(summary.gaji_mengajar);
  document.getElementById("gajiTambahan").textContent = formatRupiah(summary.gaji_tambahan);
  const totalInfaqEl = document.getElementById("totalInfaq");
  if (totalInfaqEl) totalInfaqEl.textContent = formatRupiah(summary.total_infaq || 0);
  document.getElementById("totalPertemuan").textContent = summary.total_pertemuan || 0;

  // Transport breakdown
  const gajiPokokEl = document.getElementById("gajiPokok");
  const gajiTransportEl = document.getElementById("gajiTransport");
  if (gajiPokokEl) gajiPokokEl.textContent = formatRupiah(summary.gaji_pokok || 0);
  if (gajiTransportEl) gajiTransportEl.textContent = formatRupiah(summary.transport || 0);

  const jabatanEl = document.getElementById("jabatanManajemen");
  if (edukator && edukator.jabatan_manajemen) {
    jabatanEl.textContent = edukator.jabatan_manajemen;
  } else {
    jabatanEl.textContent = "Tidak ada";
  }
}

// Render infaq list
function renderInfaqList() {
  const { infaq } = state.data;
  const emptyEl = document.getElementById("infaqEmpty");
  const tableEl = document.getElementById("infaqTable");
  const tbody = document.getElementById("infaqBody");

  if (!tbody || !tableEl || !emptyEl) return;

  const filtered = (infaq || []).filter((item) =>
    matchesSearch(`${item.jenis_infaq} ${item.keterangan || ""} ${formatDate(item.tanggal)}`)
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
    const tr = document.createElement("tr");
    tr.className = "border-b border-slate-100 hover:bg-slate-50 transition-colors";
    tr.innerHTML = `
      <td class="py-3 px-2 text-slate-600">${formatDate(item.tanggal)}</td>
      <td class="py-3 px-2 font-medium text-slate-700">${item.jenis_infaq || "-"}</td>
      <td class="py-3 px-2 text-right font-semibold text-rose-600">${formatRupiah(item.nominal)}</td>
      <td class="py-3 px-2 text-slate-500">${item.keterangan || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Render tipe les breakdown table
function renderTipeBreakdown() {
  const { breakdown_by_tipe } = state.data;

  const emptyEl = document.getElementById("tipeBreakdownEmpty");
  const tableEl = document.getElementById("tipeBreakdownTable");
  const tbody = document.getElementById("tipeBreakdownBody");

  const filtered = (breakdown_by_tipe || []).filter((item) =>
    matchesSearch(`${formatTipeLes(item.tipe_les)} ${item.jumlah_pertemuan} ${item.total_gaji}`)
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
    const tr = document.createElement("tr");
    tr.className = "border-b border-slate-100 hover:bg-slate-50 transition-colors";
    tr.innerHTML = `
      <td class="py-3 px-2">
        <span class="inline-flex items-center gap-2">
          <span class="w-2 h-2 rounded-full ${getTipeLesColor(item.tipe_les)}"></span>
          <span class="font-medium text-slate-700">${formatTipeLes(item.tipe_les)}</span>
        </span>
      </td>
      <td class="py-3 px-2 text-right text-slate-700">${item.jumlah_pertemuan || 0}x</td>
      <td class="py-3 px-2 text-right font-semibold text-emerald-600">${formatRupiah(item.total_gaji)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Get color for tipe les
function getTipeLesColor(tipeLes) {
  const colors = {
    "privat": "bg-blue-500",
    "kelas": "bg-purple-500"
  };
  return colors[tipeLes] || "bg-slate-500";
}

// Render program breakdown table
function renderProgramBreakdown() {
  const { breakdown_by_program } = state.data;

  const emptyEl = document.getElementById("programBreakdownEmpty");
  const tableEl = document.getElementById("programBreakdownTable");
  const tbody = document.getElementById("programBreakdownBody");

  const filtered = (breakdown_by_program || []).filter((item) =>
    matchesSearch(`${item.program_nama} ${formatJenjang(item.jenjang)} ${formatTipeLes(item.tipe_les)}`)
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
    const tr = document.createElement("tr");
    tr.className = "border-b border-slate-100 hover:bg-slate-50 transition-colors";
    tr.innerHTML = `
      <td class="py-3 px-2 font-medium text-slate-700">${item.program_nama || "-"}</td>
      <td class="py-3 px-2">
        <span class="px-2 py-0.5 rounded text-xs font-medium ${getJenjangColor(item.jenjang)}">
          ${formatJenjang(item.jenjang)}
        </span>
      </td>
      <td class="py-3 px-2 text-slate-600">${formatTipeLes(item.tipe_les)}</td>
      <td class="py-3 px-2 text-right text-slate-700">${item.jumlah_pertemuan || 0}x</td>
      <td class="py-3 px-2 text-right font-semibold text-emerald-600">${formatRupiah(item.total_gaji)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Get color for jenjang
function getJenjangColor(jenjang) {
  const colors = {
    "PAUD_TK": "bg-pink-100 text-pink-700",
    "SD": "bg-blue-100 text-blue-700",
    "SMP": "bg-purple-100 text-purple-700",
    "SMA": "bg-amber-100 text-amber-700",
    "ALUMNI": "bg-slate-100 text-slate-700"
  };
  return colors[jenjang] || "bg-slate-100 text-slate-700";
}

// Render transactions table
function renderTransactions() {
  const { transactions } = state.data;

  const emptyEl = document.getElementById("transactionEmpty");
  const listEl = document.getElementById("transactionList");
  const tbody = document.getElementById("transactionBody");

  const filtered = (transactions || []).filter((item) =>
    matchesSearch(`${item.siswa_nama} ${item.program_nama} ${formatJenjang(item.jenjang)} ${formatTipeLes(item.tipe_les)} ${formatDate(item.tanggal_jadwal)} ${formatTime(item.jam_mulai)}`)
  );

  if (!filtered.length) {
    emptyEl.classList.remove("hidden");
    listEl.classList.add("hidden");
    return;
  }

  emptyEl.classList.add("hidden");
  listEl.classList.remove("hidden");
  tbody.innerHTML = "";

  filtered.forEach((item) => {
    const tr = document.createElement("tr");
    tr.className = "border-b border-slate-100 hover:bg-slate-50 transition-colors";
    const transportAmount = Number(item.transport_edukator || 0);
    tr.innerHTML = `
      <td class="py-3 px-2 text-slate-600">${formatDate(item.tanggal_jadwal)}</td>
      <td class="py-3 px-2 font-medium text-slate-700">${item.siswa_nama || "-"}</td>
      <td class="py-3 px-2 text-slate-600">${item.program_nama || "-"}</td>
      <td class="py-3 px-2">
        <span class="px-2 py-0.5 rounded text-xs font-medium ${getJenjangColor(item.jenjang)}">
          ${formatJenjang(item.jenjang)}
        </span>
      </td>
      <td class="py-3 px-2 text-slate-600">${formatTipeLes(item.tipe_les)}</td>
      <td class="py-3 px-2 text-slate-500 text-xs">${formatTime(item.jam_mulai)} - ${formatTime(item.jam_selesai)}</td>
      <td class="py-3 px-2 text-right ${transportAmount > 0 ? 'font-medium text-teal-600' : 'text-slate-400'}">${transportAmount > 0 ? formatRupiah(transportAmount) : '-'}</td>
      <td class="py-3 px-2 text-right font-semibold text-emerald-600">${formatRupiah(item.nominal)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Render empty state
function renderEmpty() {
  document.getElementById("totalGaji").textContent = "Rp 0";
  document.getElementById("gajiMengajar").textContent = "Rp 0";
  document.getElementById("gajiTambahan").textContent = "Rp 0";
  const totalInfaqEl = document.getElementById("totalInfaq");
  if (totalInfaqEl) totalInfaqEl.textContent = "Rp 0";
  document.getElementById("totalPertemuan").textContent = "0";

  const gajiPokokEl = document.getElementById("gajiPokok");
  const gajiTransportEl = document.getElementById("gajiTransport");
  if (gajiPokokEl) gajiPokokEl.textContent = "Rp 0";
  if (gajiTransportEl) gajiTransportEl.textContent = "Rp 0";

  document.getElementById("tipeBreakdownEmpty").classList.remove("hidden");
  document.getElementById("tipeBreakdownTable").classList.add("hidden");

  document.getElementById("programBreakdownEmpty").classList.remove("hidden");
  document.getElementById("programBreakdownTable").classList.add("hidden");

  const infaqEmpty = document.getElementById("infaqEmpty");
  const infaqTable = document.getElementById("infaqTable");
  if (infaqEmpty) infaqEmpty.classList.remove("hidden");
  if (infaqTable) infaqTable.classList.add("hidden");

  document.getElementById("transactionEmpty").classList.remove("hidden");
  document.getElementById("transactionList").classList.add("hidden");
}

// Check session
async function checkSession() {
  try {
    const res = await fetch("/api/auth/session", { credentials: "same-origin" });
    const session = await res.json();

    if (!session || !session.loggedIn) {
      window.location.href = "/login";
      return;
    }

    if (session.user.role !== "edukator" && session.user.role !== "admin_cabang" && session.user.role !== "super_admin") {
      window.location.href = "/dashboard-siswa";
      return;
    }
  } catch (err) {
    console.error("Session check error:", err);
    window.location.href = "/login";
  }
}
