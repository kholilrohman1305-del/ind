(() => {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const normalizeText = (value) => String(value || "").toLowerCase();

  const filterRows = (rows, query) => {
    if (!query) return rows;
    const q = normalizeText(query);
    return (rows || []).filter((row) => {
      return (
        normalizeText(row.siswa_nama).includes(q) ||
        normalizeText(row.program_nama).includes(q) ||
        normalizeText(row.mapel_nama).includes(q) ||
        normalizeText(row.kelas_nama).includes(q) ||
        normalizeText(row.jam_mulai).includes(q) ||
        normalizeText(row.jam_selesai).includes(q)
      );
    });
  };

  const renderList = (rows, query = "") => {
    const list = document.getElementById("jadwalList");
    const empty = document.getElementById("jadwalEmpty");
    if (!list) return;
    
    list.innerHTML = "";

    const filteredRows = filterRows(rows || [], query);
    if (!filteredRows.length) {
      if (empty) empty.classList.remove("hidden");
      return;
    }
    
    if (empty) empty.classList.add("hidden");
    
    filteredRows.forEach((row) => {
      const item = document.createElement("div");
      // Modern List Item Styling
      item.className = "flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors group";
      
      const jamMulai = row.jam_mulai ? row.jam_mulai.slice(0, 5) : "--:--";
      const jamSelesai = row.jam_selesai ? row.jam_selesai.slice(0, 5) : "--:--";
      const namaSiswa = row.siswa_nama || "Siswa Umum";
      const namaProgram = row.program_nama || "Program Belum Diset";

      item.innerHTML = `
        <div class="flex items-center gap-4">
           <div class="flex flex-col items-center justify-center w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
              <span class="text-sm font-bold leading-none">${jamMulai}</span>
              <span class="text-[10px] opacity-70 mt-0.5">WIB</span>
           </div>
           
           <div>
              <div class="font-bold text-slate-800 text-sm md:text-base group-hover:text-indigo-600 transition-colors">${namaSiswa}</div>
              <div class="flex items-center gap-2 mt-1">
                 <span class="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    <i class="fa-solid fa-book-open mr-1 text-slate-400"></i> ${namaProgram}
                 </span>
                 <span class="text-xs text-slate-400 flex items-center gap-1">
                    <i class="fa-regular fa-clock"></i> Sampai ${jamSelesai}
                 </span>
              </div>
           </div>
        </div>
        
        <button class="hidden sm:flex w-8 h-8 items-center justify-center rounded-full text-slate-300 hover:bg-white hover:text-indigo-600 hover:shadow-md transition-all border border-transparent hover:border-slate-100">
           <i class="fa-solid fa-chevron-right text-sm"></i>
        </button>
      `;
      list.appendChild(item);
    });
  };

  const init = async () => {
    try {
      const searchInput = document.getElementById("dashboardSearch");
      let allRows = [];

      // 1. Get User Info (Session) to display name
      const profileRes = await fetch("/api/edukator/profile", { credentials: "same-origin" });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData && profileData.success && profileData.data) {
          const fullName = profileData.data.nama || "Edukator";
          setText("userName", fullName);
        }
      }

      // 2. Get Dashboard Stats
      const res = await fetch("/api/dashboard/edukator", { credentials: "same-origin" });
      const data = await res.json();
      
      if (!data || !data.success) return;
      
      const payload = data.data;
      
      // Animate Numbers (Simple count up)
      setText("statProgram", payload.program_total || 0);
      setText("statSiswa", payload.siswa_total || 0);
      setText("statKehadiran", payload.kehadiran_bulan_ini || 0);
      setText("statJadwalHariIni", payload.jadwal_hari_ini || 0);
      
      allRows = payload.jadwal_list || [];
      renderList(allRows, searchInput?.value || "");

      if (searchInput) {
        searchInput.addEventListener("input", (event) => {
          renderList(allRows, event.target.value || "");
        });
      }
      
    } catch (err) {
      console.error("Dashboard Error:", err);
      // Optional: Show error toast here
    }
  };

  init();
})();
