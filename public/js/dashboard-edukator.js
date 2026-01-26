(() => {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const renderList = (rows) => {
    const list = document.getElementById("jadwalList");
    const empty = document.getElementById("jadwalEmpty");
    if (!list) return;
    list.innerHTML = "";
    if (!rows.length) {
      if (empty) empty.style.display = "block";
      return;
    }
    if (empty) empty.style.display = "none";
    rows.forEach((row) => {
      const item = document.createElement("div");
      item.className = "list-item";
      item.innerHTML = `
        <div>
          <div class="list-title">${row.siswa_nama || row.program_nama || "-"}</div>
          <div class="list-sub">${row.program_nama || "-"}</div>
        </div>
        <div class="list-sub">
          ${row.jam_mulai || "-"}${row.jam_selesai ? " - " + row.jam_selesai : ""}
        </div>
      `;
      list.appendChild(item);
    });
  };

  const init = async () => {
    try {
      const res = await fetch("/api/dashboard/edukator", { credentials: "same-origin" });
      const data = await res.json();
      if (!data || !data.success) return;
      const payload = data.data;
      setText("statProgram", payload.program_total || 0);
      setText("statSiswa", payload.siswa_total || 0);
      setText("statKehadiran", payload.kehadiran_bulan_ini || 0);
      setText("statJadwalHariIni", payload.jadwal_hari_ini || 0);
      renderList(payload.jadwal_list || []);
    } catch (err) {
      console.error(err);
    }
  };

  init();
})();
