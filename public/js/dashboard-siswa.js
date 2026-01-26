(() => {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(`${dateStr}T00:00:00`);
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    }).format(date);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "-";
    return timeStr.slice(0, 5);
  };

  const renderSchedule = (rows) => {
    const container = document.getElementById("jadwalList");
    const empty = document.getElementById("jadwalEmpty");
    if (!container) return;
    container.innerHTML = "";
    if (!rows || !rows.length) {
      if (empty) empty.style.display = "block";
      return;
    }
    if (empty) empty.style.display = "none";
    rows.forEach((row) => {
      const card = document.createElement("div");
      card.className = "schedule-card";
      card.innerHTML = `
        <div class="schedule-title">${row.program_nama || "-"}</div>
        <div class="schedule-meta">${formatDate(row.tanggal)} · ${formatTime(row.jam_mulai)} - ${formatTime(row.jam_selesai)}</div>
        <div class="schedule-meta">${row.mapel_nama || "-"} · ${row.tipe_les === "kelas" ? "Kelas" : "Privat"}</div>
        <div class="schedule-pill">${row.status_jadwal === "completed" ? "Selesai" : "Terjadwal"}</div>
      `;
      container.appendChild(card);
    });
  };

  const init = async () => {
    try {
      const res = await fetch("/api/dashboard/siswa", { credentials: "same-origin" });
      const payload = res.ok ? await res.json() : null;
      const data = payload?.data || {};
      setText("statProgram", data.program_total || 0);
      setText("statProgress", `${data.progress_percent || 0}%`);
      setText(
        "statProgressDetail",
        `${data.pertemuan_selesai || 0} / ${data.pertemuan_total || 0} pertemuan`
      );
      setText("statJadwal", data.jadwal_hari_ini || 0);
      renderSchedule(data.jadwal_list || []);
    } catch (err) {
      renderSchedule([]);
    }
  };

  init();
})();
