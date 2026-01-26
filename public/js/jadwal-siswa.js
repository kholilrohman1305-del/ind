(() => {
  const jadwalContainer = document.getElementById("jadwalAktif");
  const jadwalEmpty = document.getElementById("jadwalAktifEmpty");
  const absensiRows = document.getElementById("absensiRows");
  const absensiEmpty = document.getElementById("absensiEmpty");
  const searchInput = document.getElementById("jadwalSearch");

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(`${dateStr}T00:00:00`);
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "-";
    return timeStr.slice(0, 5);
  };

  const renderJadwal = (rows) => {
    if (!jadwalContainer) return;
    jadwalContainer.innerHTML = "";
    if (!rows.length) {
      if (jadwalEmpty) jadwalEmpty.style.display = "block";
      return;
    }
    if (jadwalEmpty) jadwalEmpty.style.display = "none";
    rows.forEach((row) => {
      const card = document.createElement("div");
      card.className = "schedule-card";
      card.innerHTML = `
        <div class="schedule-title">${row.program_nama || "-"}</div>
        <div class="schedule-meta">${formatDate(row.tanggal)}</div>
        <div class="schedule-meta">${formatTime(row.jam_mulai)} - ${formatTime(row.jam_selesai)} · ${row.mapel_nama || "-"}</div>
        <div class="schedule-pill">${row.tipe_les === "kelas" ? "Kelas" : "Privat"}</div>
      `;
      jadwalContainer.appendChild(card);
    });
  };

  const renderAbsensi = (rows) => {
    if (!absensiRows) return;
    absensiRows.innerHTML = "";
    if (!rows.length) {
      if (absensiEmpty) absensiEmpty.style.display = "block";
      return;
    }
    if (absensiEmpty) absensiEmpty.style.display = "none";
    rows.forEach((row) => {
      const div = document.createElement("div");
      div.className = "table-row";
      div.innerHTML = `
        <div>${formatDate(row.tanggal)}</div>
        <div>${row.program_nama || "-"}</div>
        <div>${row.mapel_nama || "-"}</div>
        <div>${formatTime(row.jam_mulai)} - ${formatTime(row.jam_selesai)}</div>
        <div>${row.tipe_les === "kelas" ? "Kelas" : "Privat"}</div>
      `;
      absensiRows.appendChild(div);
    });
  };

  const loadData = async () => {
    try {
      const [privatRows, kelasRows, absensiRes] = await Promise.all([
        fetch("/api/jadwal?tipe=privat", { credentials: "same-origin" }).then((r) => r.json()),
        fetch("/api/jadwal?tipe=kelas", { credentials: "same-origin" }).then((r) => r.json()),
        fetch("/api/presensi/siswa", { credentials: "same-origin" }).then((r) => r.json()),
      ]);

      const jadwalRows = []
        .concat(privatRows?.data || [])
        .concat(kelasRows?.data || [])
        .sort((a, b) => {
          if (a.tanggal === b.tanggal) return (a.jam_mulai || "").localeCompare(b.jam_mulai || "");
          return (a.tanggal || "").localeCompare(b.tanggal || "");
        });

      renderJadwal(jadwalRows);
      renderAbsensi(absensiRes?.data || []);

      if (searchInput) {
        searchInput.addEventListener("input", () => {
          const value = searchInput.value.toLowerCase();
          const filtered = jadwalRows.filter((row) =>
            String(row.program_nama || "").toLowerCase().includes(value)
          );
          renderJadwal(filtered);
        });
      }
    } catch (err) {
      renderJadwal([]);
      renderAbsensi([]);
    }
  };

  loadData();
})();
