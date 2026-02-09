(() => {
  const listEl = document.getElementById("tagihanList");
  const emptyEl = document.getElementById("tagihanEmpty");
  const totalEl = document.getElementById("siswaTagihanTotal");

  const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value || 0);

  const formatDate = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
  };

  const render = (rows) => {
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!rows.length) {
      if (emptyEl) emptyEl.classList.remove("hidden");
      return;
    }
    if (emptyEl) emptyEl.classList.add("hidden");

    rows.forEach((item) => {
      const totalTagihan = Number(item.total_tagihan || 0);
      const totalBayar = Number(item.total_bayar || 0);
      const sisa = Number(item.sisa_tagihan || 0);

      let statusClass = "bg-rose-100 text-rose-700";
      let statusLabel = "Belum Lunas";
      if (sisa <= 0) {
        statusClass = "bg-emerald-100 text-emerald-700";
        statusLabel = "Lunas";
      } else if (totalBayar > 0) {
        statusClass = "bg-amber-100 text-amber-700";
        statusLabel = "Cicilan";
      }

      const card = document.createElement("div");
      card.className = "bg-white rounded-3xl p-4 shadow-lg border border-slate-100";
      card.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-bold text-slate-800">${item.program_nama || "-"}</h4>
          <span class="text-[10px] uppercase font-bold px-2 py-1 rounded-full ${statusClass}">
            ${statusLabel}
          </span>
        </div>
        <div class="text-xs text-slate-500 mb-2">Jatuh tempo: ${formatDate(item.tanggal_jatuh_tempo)}</div>
        <div class="flex items-center justify-between text-sm">
          <div>
            <div class="text-[10px] text-slate-400 uppercase font-bold">Sisa</div>
            <div class="font-extrabold text-rose-600">${formatRupiah(sisa)}</div>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-slate-400 uppercase font-bold">Total</div>
            <div class="font-semibold text-slate-700">${formatRupiah(totalTagihan)}</div>
          </div>
        </div>
      `;
      listEl.appendChild(card);
    });
  };

  const load = async () => {
    try {
      const res = await fetch("/api/siswa/tagihan-summary", { credentials: "same-origin" });
      const json = await res.json();
      const summary = json?.data || {};
      const items = summary.items || [];
      if (totalEl) totalEl.textContent = formatRupiah(summary.total_sisa || 0);
      render(items);
    } catch (err) {
      render([]);
    }
  };

  load();
})();
