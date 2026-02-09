(() => {
  const { TIPE_LES } = window.APP_CONSTANTS;
  const requester = window.api?.request || fetch;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const normalizeText = (value) => String(value || "").toLowerCase();

  const filterRows = (rows, query) => {
    if (!query) return rows || [];
    const q = normalizeText(query);
    return (rows || []).filter((row) => {
      return (
        normalizeText(row.program_nama).includes(q) ||
        normalizeText(row.mapel_nama).includes(q) ||
        normalizeText(row.tipe_les).includes(q) ||
        normalizeText(row.jenjang).includes(q)
      );
    });
  };

  const renderRecommendations = (rows, query = "") => {
    const container = document.getElementById("programRekomendasi");
    const empty = document.getElementById("programRekomendasiEmpty");
    if (!container) return;
    container.innerHTML = "";
    const filtered = filterRows(rows || [], query);
    if (!filtered.length) {
      if (empty) empty.style.display = "block";
      return;
    }
    if (empty) empty.style.display = "none";
    filtered.forEach((row) => {
      const card = document.createElement("div");
      card.className = "schedule-card recommend-card";
      card.innerHTML = `
        <div class="schedule-title">${row.program_nama || "-"}</div>
        <div class="schedule-meta">${row.tipe_les === TIPE_LES.KELAS ? "Kelas" : "Privat"} · ${row.jenjang || "-"}</div>
        <div class="schedule-meta">${row.jumlah_pertemuan || "-"} pertemuan · Rp ${Number(row.harga || 0).toLocaleString("id-ID")}</div>
        <div class="flex items-center justify-between mt-2">
          <div class="schedule-pill">Rekomendasi</div>
          <button class="buy-program-btn text-xs font-bold text-white px-3 py-2 rounded-xl shadow-sm" data-program="${row.id}" style="background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);">Beli Paket</button>
        </div>
      `;
      container.appendChild(card);
    });
  };

  const init = async () => {
    try {
      const searchInput = document.getElementById("siswaSearch");
      let allPrograms = [];

      const profileRes = await requester("/api/siswa/profile", { credentials: "same-origin" });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData && profileData.success && profileData.data) {
          setText("siswaName", profileData.data.nama || "Siswa ILHAMI");
        }
      }

      const res = await requester("/api/dashboard/siswa", { credentials: "same-origin" });
      const payload = res.ok ? await res.json() : null;
      const data = payload?.data || {};
      setText("statProgram", data.program_total || 0);
      setText("statProgress", `${data.progress_percent || 0}%`);
      setText(
        "statProgressDetail",
        `${data.pertemuan_selesai || 0} / ${data.pertemuan_total || 0} pertemuan`
      );
      setText("statJadwal", data.jadwal_hari_ini || 0);
      const rekomendasiRes = await requester("/api/siswa/rekomendasi-programs", { credentials: "same-origin" });
      const rekomendasiPayload = rekomendasiRes.ok ? await rekomendasiRes.json() : null;
      allPrograms = rekomendasiPayload?.data || [];
      renderRecommendations(allPrograms, searchInput?.value || "");
      if (searchInput) {
        searchInput.addEventListener("input", (event) => {
          renderRecommendations(allPrograms, event.target.value || "");
        });
      }

      const container = document.getElementById("programRekomendasi");
      if (container) {
        container.addEventListener("click", async (event) => {
          const btn = event.target.closest(".buy-program-btn");
          if (!btn) return;
          const programId = btn.dataset.program;
          if (!programId) return;
          if (!confirm("Beli paket program ini?")) return;
          btn.disabled = true;
          btn.textContent = "Memproses...";
          try {
            const res = await requester("/api/siswa/renew-program", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({ program_id: Number(programId) }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || "Gagal membeli paket.");
            btn.textContent = "Berhasil";
          } catch (err) {
            alert(err.message);
            btn.disabled = false;
            btn.textContent = "Beli Paket";
          }
        });
      }
    } catch (err) {
      renderRecommendations([]);
    }
  };

  init();
})();
