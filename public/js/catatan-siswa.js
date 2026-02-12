// Catatan Siswa Management
const requester = window.api?.request || fetch;
const catatanState = {
  students: [],
  selectedStudent: null,
  notes: [],
  kategoriFilter: "",
  loading: false,
  mode: "create" // create or edit
};

// Initialize when DOM is ready
if (document.getElementById("tab-catatan-siswa")) {
  document.addEventListener("DOMContentLoaded", () => {
    setupCatatanSiswa();
  });
}

function setupCatatanSiswa() {
  // Setup character counter
  const textarea = document.getElementById("catatan_text");
  const charCount = document.getElementById("catatan_char_count");
  if (textarea && charCount) {
    textarea.addEventListener("input", () => {
      charCount.textContent = textarea.value.length;
    });
  }

  // Setup modal close buttons
  const closeCatatanModal = document.getElementById("closeCatatanModal");
  if (closeCatatanModal) {
    closeCatatanModal.addEventListener("click", closeCatatanModalHandler);
  }

  // Setup cancel button
  const cancelCatatanForm = document.getElementById("cancelCatatanForm");
  if (cancelCatatanForm) {
    cancelCatatanForm.addEventListener("click", resetCatatanForm);
  }

  // Setup form submit
  const catatanForm = document.getElementById("catatanForm");
  if (catatanForm) {
    catatanForm.addEventListener("submit", handleCatatanSubmit);
  }

  // Setup kategori filter
  const filterKategori = document.getElementById("filterKategori");
  if (filterKategori) {
    filterKategori.addEventListener("change", (e) => {
      catatanState.kategoriFilter = e.target.value;
      renderNoteHistory();
    });
  }

  // Setup tab change event to load students
  const catatanTab = document.querySelector('[data-target="tab-catatan-siswa"]');
  if (catatanTab) {
    catatanTab.addEventListener("click", () => {
      if (catatanState.students.length === 0) {
        fetchStudents();
      }
    });
  }
}

// Fetch students taught by edukator
async function fetchStudents() {
  if (catatanState.loading) return;
  catatanState.loading = true;

  try {
    const res = await requester("/api/catatan-siswa/students", {
      credentials: "same-origin"
    });

    if (!res.ok) {
      if (res.status === 403 || res.status === 401) {
        window.location.href = "/pages/login.html";
        return;
      }
      throw new Error("Failed to fetch students");
    }

    const json = await res.json();
    if (json.success) {
      catatanState.students = json.data || [];
      renderStudentCards();
    } else {
      window.toast.error(json.message || "Gagal memuat data siswa");
    }
  } catch (err) {
    console.error("Error fetching students:", err);
    window.toast.error("Gagal memuat data siswa");
    catatanState.students = [];
    renderStudentCards();
  } finally {
    catatanState.loading = false;
  }
}

// Render student cards
function renderStudentCards() {
  const container = document.getElementById("studentListRows");
  const emptyEl = document.getElementById("studentListEmpty");

  if (!container || !emptyEl) return;

  if (catatanState.students.length === 0) {
    container.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }

  emptyEl.classList.add("hidden");
  container.innerHTML = "";

  catatanState.students.forEach((student) => {
    const card = document.createElement("div");
    card.className = "bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 cursor-pointer border border-gray-100 hover:border-emerald-300";
    card.onclick = () => openCatatanModal(student);

    const avatar = student.siswa_foto
      ? `<img src="${student.siswa_foto}" alt="${student.siswa_nama}" class="w-16 h-16 rounded-full object-cover">`
      : `<div class="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-2xl font-bold">${student.siswa_nama.charAt(0).toUpperCase()}</div>`;

    // Sentiment UI Logic
    let moodIcon = "😐";
    let moodClass = "bg-gray-100 text-gray-600";
    if (student.sentiment?.score > 0) {
        moodIcon = "😊";
        moodClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
    } else if (student.sentiment?.score < 0) {
        moodIcon = "😟";
        moodClass = "bg-rose-100 text-rose-700 border-rose-200";
    }

    card.innerHTML = `
      <div class="flex items-center gap-4 mb-4">
        ${avatar}
        <div class="flex-1">
          <h4 class="font-bold text-gray-800 text-lg line-clamp-1" title="${student.siswa_nama}">${student.siswa_nama}</h4>
          <p class="text-xs text-gray-500">${student.enrollments.length} Program</p>
        </div>
      </div>
      <div class="flex items-center justify-between pt-3 border-t border-gray-100">
        <div class="flex items-center gap-2 text-sm text-gray-600">
          <i class="fa-solid fa-clipboard-list text-emerald-500"></i>
          <span class="font-semibold">${student.total_catatan || 0}</span> Catatan
        </div>
        ${student.total_catatan > 0 ? `
          <div class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border ${moodClass}" title="Mood Perkembangan: ${student.sentiment?.label}">
            <span class="text-sm">${moodIcon}</span>
            <span>${student.sentiment?.label}</span>
          </div>
        ` : ''}
      </div>
    `;

    container.appendChild(card);
  });

  // Update badge
  const badge = document.getElementById("totalCatatanBadge");
  if (badge) {
    const totalCatatan = catatanState.students.reduce((sum, s) => sum + (s.total_catatan || 0), 0);
    badge.textContent = totalCatatan;
    if (totalCatatan > 0) {
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }
}

// Open modal for student
function openCatatanModal(student) {
  catatanState.selectedStudent = student;
  catatanState.notes = [];
  catatanState.kategoriFilter = "";

  // Reset form
  resetCatatanForm();

  // Set student ID
  document.getElementById("catatan_siswa_id").value = student.siswa_id;

  // Set modal title
  document.getElementById("catatanModalTitle").textContent = `Catatan - ${student.siswa_nama}`;

  const enrollmentText = student.enrollments.map(e => e.program_nama).join(", ");
  document.getElementById("catatanModalSubtitle").textContent = enrollmentText || "Siswa";

  // Set today as default date
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("catatan_tanggal").value = today;

  // Show modal
  showCatatanModal();

  // Fetch notes
  fetchNotes(student.siswa_id);
}

// Show modal with animation
function showCatatanModal() {
  const modal = document.getElementById("catatanModal");
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  setTimeout(() => {
    modal.classList.remove("opacity-0", "pointer-events-none");
    modal.querySelector(".modal-card").classList.remove("scale-95");
  }, 10);
}

// Close modal with animation
function closeCatatanModalHandler() {
  const modal = document.getElementById("catatanModal");
  if (!modal) return;

  modal.classList.add("opacity-0", "pointer-events-none");
  modal.querySelector(".modal-card").classList.add("scale-95");
  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    resetCatatanForm();
  }, 200);
}

// Fetch notes for student
async function fetchNotes(siswaId) {
  try {
    const params = new URLSearchParams();
    if (catatanState.kategoriFilter) {
      params.append("kategori", catatanState.kategoriFilter);
    }

    const url = `/api/catatan-siswa/siswa/${siswaId}${params.toString() ? '?' + params.toString() : ''}`;
    const res = await requester(url, { credentials: "same-origin" });

    if (!res.ok) {
      throw new Error("Failed to fetch notes");
    }

    const json = await res.json();
    if (json.success) {
      catatanState.notes = json.data || [];
      renderNoteHistory();
    } else {
      window.toast.error(json.message || "Gagal memuat catatan");
    }
  } catch (err) {
    console.error("Error fetching notes:", err);
    window.toast.error("Gagal memuat catatan");
    catatanState.notes = [];
    renderNoteHistory();
  }
}

// Render note history
function renderNoteHistory() {
  const container = document.getElementById("noteHistoryList");
  const emptyEl = document.getElementById("noteHistoryEmpty");
  const countBadge = document.getElementById("noteCountBadge");

  if (!container || !emptyEl) return;

  if (catatanState.notes.length === 0) {
    container.innerHTML = "";
    emptyEl.classList.remove("hidden");
    if (countBadge) countBadge.textContent = "0";
    return;
  }

  emptyEl.classList.add("hidden");
  if (countBadge) countBadge.textContent = catatanState.notes.length;
  container.innerHTML = "";

  catatanState.notes.forEach((note) => {
    const card = document.createElement("div");
    card.className = "bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow";

    const kategoriColors = {
      akademik: "bg-blue-100 text-blue-700",
      sikap: "bg-purple-100 text-purple-700",
      kehadiran: "bg-green-100 text-green-700",
      umum: "bg-gray-100 text-gray-700"
    };

    card.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-1 rounded-full text-xs font-semibold ${kategoriColors[note.kategori] || kategoriColors.umum}">
              ${note.kategori.charAt(0).toUpperCase() + note.kategori.slice(1)}
            </span>
            <span class="text-xs text-gray-500">${formatDate(note.tanggal)}</span>
          </div>
          <p class="text-sm text-gray-700 whitespace-pre-wrap">${note.catatan}</p>
        </div>
        <div class="flex gap-2 ml-3">
          <button
            onclick="editCatatan(${note.id})"
            class="text-indigo-600 hover:text-indigo-800 p-2 hover:bg-indigo-50 rounded transition"
            title="Edit"
          >
            <i class="fa-solid fa-edit"></i>
          </button>
          <button
            onclick="deleteCatatan(${note.id})"
            class="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded transition"
            title="Hapus"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
      ${note.updated_at !== note.created_at ? `
        <div class="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200">
          Diedit: ${formatDateTime(note.updated_at)}
        </div>
      ` : ''}
    `;

    container.appendChild(card);
  });
}

// Handle form submit
async function handleCatatanSubmit(e) {
  e.preventDefault();

  const mode = document.getElementById("catatan_mode").value;
  const siswaId = document.getElementById("catatan_siswa_id").value;
  const tanggal = document.getElementById("catatan_tanggal").value;
  const kategori = document.getElementById("catatan_kategori").value;
  const catatan = document.getElementById("catatan_text").value.trim();

  if (!catatan) {
    window.toast.error("Catatan tidak boleh kosong");
    return;
  }

  try {
    let res;
    if (mode === "edit") {
      const editId = document.getElementById("catatan_edit_id").value;
      res = await requester(`/api/catatan-siswa/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ catatan, kategori })
      });
    } else {
      res = await requester("/api/catatan-siswa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          siswa_id: parseInt(siswaId),
          tanggal,
          kategori,
          catatan
        })
      });
    }

    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.message || "Gagal menyimpan catatan");
    }

    const json = await res.json();
    if (json.success) {
      window.toast.success(mode === "edit" ? "Catatan berhasil diperbarui" : "Catatan berhasil ditambahkan");
      resetCatatanForm();
      fetchNotes(siswaId);
      fetchStudents(); // Refresh student list to update counts
    } else {
      window.toast.error(json.message || "Gagal menyimpan catatan");
    }
  } catch (err) {
    console.error("Error saving note:", err);
    window.toast.error(err.message || "Gagal menyimpan catatan");
  }
}

// Edit catatan
window.editCatatan = function(noteId) {
  const note = catatanState.notes.find(n => n.id === noteId);
  if (!note) return;

  document.getElementById("catatan_mode").value = "edit";
  document.getElementById("catatan_edit_id").value = noteId;
  document.getElementById("catatan_tanggal").value = note.tanggal;
  document.getElementById("catatan_kategori").value = note.kategori;
  document.getElementById("catatan_text").value = note.catatan;
  document.getElementById("catatan_char_count").textContent = note.catatan.length;

  // Update button text
  const submitBtn = document.getElementById("submitCatatanBtn");
  submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Update';

  // Scroll to form
  document.getElementById("catatanForm").scrollIntoView({ behavior: "smooth", block: "start" });
};

// Delete catatan
window.deleteCatatan = async function(noteId) {
  if (!confirm("Yakin ingin menghapus catatan ini?")) return;

  try {
    const res = await requester(`/api/catatan-siswa/${noteId}`, {
      method: "DELETE",
      credentials: "same-origin"
    });

    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.message || "Gagal menghapus catatan");
    }

    const json = await res.json();
    if (json.success) {
      window.toast.success("Catatan berhasil dihapus");
      const siswaId = catatanState.selectedStudent.siswa_id;
      fetchNotes(siswaId);
      fetchStudents(); // Refresh student list to update counts
    } else {
      window.toast.error(json.message || "Gagal menghapus catatan");
    }
  } catch (err) {
    console.error("Error deleting note:", err);
    window.toast.error(err.message || "Gagal menghapus catatan");
  }
};

// Reset form
function resetCatatanForm() {
  const form = document.getElementById("catatanForm");
  if (form) form.reset();

  document.getElementById("catatan_mode").value = "create";
  document.getElementById("catatan_edit_id").value = "";
  document.getElementById("catatan_char_count").textContent = "0";

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("catatan_tanggal").value = today;

  // Reset button text
  const submitBtn = document.getElementById("submitCatatanBtn");
  submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan';
}

// Format date helper
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Format datetime helper
function formatDateTime(datetimeStr) {
  if (!datetimeStr) return "-";
  const date = new Date(datetimeStr);
  return formatDate(datetimeStr) + " " + date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
