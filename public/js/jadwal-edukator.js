(() => {
  const state = {
    privat: [],
    kelas: [],
    currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedDate: null,
  };

  const fetchJson = async (url) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Permintaan gagal.");
    }
    return data && data.success ? data.data : data;
  };

  const formatTime = (row) => {
    if (!row.jam_mulai) return "-";
    return row.jam_selesai ? `${row.jam_mulai} - ${row.jam_selesai}` : row.jam_mulai;
  };

  const buildTitle = (row) => {
    if (row.siswa_nama) {
      return `${row.siswa_nama} - ${row.mapel_nama || row.program_nama || "-"}`;
    }
    return `${row.kelas_nama || row.program_nama || "-"} - ${row.mapel_nama || "-"}`;
  };

  const toDateKey = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null;
      return value.toISOString().slice(0, 10);
    }
    const raw = String(value);
    const normalized = raw.includes("T") ? raw.split("T")[0] : raw;
    const parsed = new Date(`${normalized}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  };

  const toMonthKey = (date) => `${date.getFullYear()}-${date.getMonth() + 1}`;

  const formatMonthLabel = (date) =>
    new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(date);

  const buildCalendarHeader = () => {
    const header = document.getElementById("calendarHeader");
    if (!header) return;
    const names = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
    header.innerHTML = names.map((name) => `<div>${name}</div>`).join("");
  };

  const buildScheduleMap = () => {
    const map = new Map();
    const addRow = (row, type) => {
      const key = toDateKey(row.tanggal);
      if (!key) return;
      const entry = map.get(key) || { privat: [], kelas: [] };
      entry[type].push({ ...row, _type: type });
      map.set(key, entry);
    };
    state.privat.forEach((row) => addRow(row, "privat"));
    state.kelas.forEach((row) => addRow(row, "kelas"));
    return map;
  };

  const renderCalendar = () => {
    const grid = document.getElementById("calendarGrid");
    const label = document.getElementById("calendarLabel");
    const empty = document.getElementById("jadwalEmpty");
    if (!grid) return;

    const month = state.currentMonth;
    const scheduleMap = buildScheduleMap();
    const monthKey = toMonthKey(month);

    if (label) label.textContent = formatMonthLabel(month);

    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - startOffset);

    const cells = [];
    let hasAny = false;
    for (let i = 0; i < 42; i += 1) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);
      const key = toDateKey(cellDate);
      const isCurrentMonth = cellDate.getMonth() === month.getMonth();
      const isToday = toDateKey(new Date().toISOString().slice(0, 10)) === key;
      const isSelected = state.selectedDate === key;
      const entry = scheduleMap.get(key);
      const privatCount = entry ? entry.privat.length : 0;
      const kelasCount = entry ? entry.kelas.length : 0;

      if (isCurrentMonth && (privatCount || kelasCount)) {
        hasAny = true;
      }

      const dotPrivat = privatCount ? `<span class="calendar-dot privat"></span>` : "";
      const dotKelas = kelasCount ? `<span class="calendar-dot kelas"></span>` : "";

      const hasPrivat = privatCount > 0;
      const hasKelas = kelasCount > 0;
      const eventClass = hasPrivat && hasKelas ? " has-both" : hasPrivat ? " has-privat" : hasKelas ? " has-kelas" : "";

      cells.push(`
        <button
          type="button"
          class="calendar-cell${isCurrentMonth ? "" : " is-out"}${isToday ? " is-today" : ""}${
        isSelected ? " is-selected" : ""
      }${isCurrentMonth ? eventClass : ""}"
          data-date="${key}"
          ${isCurrentMonth ? "" : "disabled"}
        >
          <div class="calendar-day">${cellDate.getDate()}</div>
          <div class="calendar-dots">${dotPrivat}${dotKelas}</div>
        </button>
      `);
    }

    grid.innerHTML = cells.join("");
    if (empty) {
      empty.style.display = hasAny ? "none" : "block";
    }
  };

  const renderList = (dateKey) => {
    const list = document.getElementById("calendarList");
    const empty = document.getElementById("calendarEmpty");
    const label = document.getElementById("selectedDateLabel");
    if (!list || !empty || !label) return;

    if (!dateKey) {
      list.innerHTML = "";
      empty.style.display = "block";
      label.textContent = "Pilih tanggal pada kalender.";
      return;
    }

    const scheduleMap = buildScheduleMap();
    const entry = scheduleMap.get(dateKey);
    const rows = entry ? [...entry.privat, ...entry.kelas] : [];
    rows.sort((a, b) => {
      const aKey = `${a.tanggal || ""} ${a.jam_mulai || ""}`;
      const bKey = `${b.tanggal || ""} ${b.jam_mulai || ""}`;
      return aKey.localeCompare(bKey);
    });

    const parsed = new Date(`${dateKey}T00:00:00`);
    label.textContent = Number.isNaN(parsed.getTime())
      ? dateKey
      : new Intl.DateTimeFormat("id-ID", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        }).format(parsed);

    if (!rows.length) {
      list.innerHTML = "";
      empty.style.display = "block";
      return;
    }

    empty.style.display = "none";
    list.innerHTML = rows
      .map((row) => {
        const isDone = row.status_jadwal === "completed";
        const pertemuan = row.pertemuan_ke ? `Pertemuan ${row.pertemuan_ke}` : "Pertemuan -";
        const typeLabel = row._type === "kelas" ? "Kelas" : "Privat";
        return `
          <div class="list-item">
            <div>
              <div class="list-title">${buildTitle(row)}</div>
              <div class="list-sub">Jam: ${formatTime(row)} · ${pertemuan}</div>
            </div>
            <div class="action-group">
              <span class="status-pill ${row._type}">${typeLabel}</span>
              <span class="status-pill ${isDone ? "done" : ""}">${isDone ? "Selesai" : "Belum"}</span>
            </div>
          </div>
        `;
      })
      .join("");
  };

  const load = async () => {
    const [privat, kelas] = await Promise.all([
      fetchJson("/api/jadwal?tipe=privat"),
      fetchJson("/api/jadwal?tipe=kelas"),
    ]);
    const sortRows = (rows) =>
      (rows || [])
        .filter((row) => row.tanggal)
        .sort((a, b) => {
          const aKey = `${a.tanggal || ""} ${a.jam_mulai || ""}`;
          const bKey = `${b.tanggal || ""} ${b.jam_mulai || ""}`;
          return aKey.localeCompare(bKey);
        });

    state.privat = sortRows(privat);
    state.kelas = sortRows(kelas);
    const todayKey = toDateKey(new Date());
    state.selectedDate = todayKey;
    renderCalendar();
    renderList(state.selectedDate);
  };

  const init = async () => {
    buildCalendarHeader();
    const prevBtn = document.getElementById("calendarPrev");
    const nextBtn = document.getElementById("calendarNext");
    const grid = document.getElementById("calendarGrid");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        state.currentMonth = new Date(
          state.currentMonth.getFullYear(),
          state.currentMonth.getMonth() - 1,
          1
        );
        renderCalendar();
        renderList(state.selectedDate);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        state.currentMonth = new Date(
          state.currentMonth.getFullYear(),
          state.currentMonth.getMonth() + 1,
          1
        );
        renderCalendar();
        renderList(state.selectedDate);
      });
    }

    if (grid) {
      grid.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-date]");
        if (!button || button.disabled) return;
        state.selectedDate = button.dataset.date;
        renderCalendar();
        renderList(state.selectedDate);
      });
    }

    try {
      await load();
    } catch (err) {
      console.error(err);
      const empty = document.getElementById("jadwalEmpty");
      if (empty) empty.style.display = "block";
    }
  };

  init();
})();
