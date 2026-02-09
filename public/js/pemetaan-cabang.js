(() => {
  const mapEl = document.getElementById("map");
  const filterCabang = document.getElementById("filterCabang");
  const radiusInput = document.getElementById("radiusInput");
  const applyRadius = document.getElementById("applyRadius");
  const recommendationCount = document.getElementById("recommendationCount");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");

  let map;
  let markers = [];
  let circles = [];
  let recommendationMarkers = [];
  let recommendationCircles = [];
  let cabangData = [];
  let recommendationData = [];

  const defaultCenter = [-2.5489, 118.0149]; // Indonesia
  const defaultZoom = 5;

  const clearLayers = () => {
    markers.forEach((m) => map.removeLayer(m));
    circles.forEach((c) => map.removeLayer(c));
    recommendationMarkers.forEach((m) => map.removeLayer(m));
    recommendationCircles.forEach((c) => map.removeLayer(c));
    markers = [];
    circles = [];
    recommendationMarkers = [];
    recommendationCircles = [];
  };

  const getRadiusMeters = () => {
    const km = Number(radiusInput?.value || 3);
    return Math.max(1, km) * 1000;
  };

  const renderMap = () => {
    if (!map) return;
    clearLayers();

    const selectedId = filterCabang?.value || "";
    const rows = selectedId
      ? cabangData.filter((row) => String(row.id) === String(selectedId))
      : cabangData;

    const bounds = [];
    const radiusMeters = getRadiusMeters();

    if (!rows.length && !recommendationData.length) {
      map.setView(defaultCenter, defaultZoom);
      return;
    }

    rows.forEach((row) => {
      const lat = Number(row.latitude);
      const lng = Number(row.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(`
        <div style="min-width:180px">
          <div style="font-weight:700">${row.nama}</div>
          <div style="font-size:12px;color:#64748b">${row.alamat || "-"}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:4px">${row.telepon || ""}</div>
        </div>
      `);
      markers.push(marker);

      const circle = L.circle([lat, lng], {
        radius: radiusMeters,
        color: "#6366f1",
        weight: 1.5,
        fillColor: "#a5b4fc",
        fillOpacity: 0.25,
      }).addTo(map);
      circles.push(circle);

      bounds.push([lat, lng]);
    });

    recommendationData.forEach((row, idx) => {
      const lat = Number(row.lat);
      const lng = Number(row.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const marker = L.circleMarker([lat, lng], {
        radius: 8,
        color: "#e11d48",
        weight: 2,
        fillColor: "#fb7185",
        fillOpacity: 0.9,
      }).addTo(map);

      const scoreLabel = Number.isFinite(Number(row.score)) ? Number(row.score).toFixed(2) : "-";
      marker.bindPopup(`
        <div style="min-width:190px">
          <div style="font-weight:700">Rekomendasi #${idx + 1}</div>
          <div style="font-size:12px;color:#64748b">Skor: ${scoreLabel}</div>
          <div style="font-size:12px;color:#64748b">Coverage: ${row.coverage || 0}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:4px">Cabang terdekat: ${row.nearest_cabang || "-"}</div>
          <div style="font-size:11px;color:#94a3b8">Jarak: ${row.nearest_distance_km ?? "-"} km</div>
        </div>
      `);
      recommendationMarkers.push(marker);

      const recCircle = L.circle([lat, lng], {
        radius: radiusMeters,
        color: "#fda4af",
        weight: 1.2,
        fillColor: "#fecdd3",
        fillOpacity: 0.2,
      }).addTo(map);
      recommendationCircles.push(recCircle);

      bounds.push([lat, lng]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 12);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  const loadCabang = async () => {
    try {
      const res = await fetch("/api/cabang", { credentials: "same-origin" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal memuat cabang");
      cabangData = json.success ? json.data : json;
      if (!Array.isArray(cabangData)) cabangData = [];

      if (filterCabang) {
        filterCabang.innerHTML = `<option value="">Semua Cabang</option>` +
          cabangData.map((row) => `<option value="${row.id}">${row.nama}</option>`).join("");
      }

      renderMap();
    } catch (err) {
      console.error(err);
    }
  };

  const loadRecommendations = async () => {
    try {
      const radiusKm = Number(radiusInput?.value || 3);
      const limit = Number(recommendationCount?.value || 3);
      const query = new URLSearchParams({
        radius_km: String(Number.isFinite(radiusKm) ? radiusKm : 3),
        k: String(Number.isFinite(limit) ? limit : 3),
      });
      const res = await fetch(`/api/cabang/recommendations?${query.toString()}`, {
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal memuat rekomendasi");
      recommendationData = json.success ? json.data : json;
      if (!Array.isArray(recommendationData)) recommendationData = [];
      renderMap();
    } catch (err) {
      console.error(err);
      recommendationData = [];
      renderMap();
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (!mapEl) return;
    map = L.map(mapEl).setView(defaultCenter, defaultZoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    loadCabang();
    loadRecommendations();

    if (filterCabang) {
      filterCabang.addEventListener("change", renderMap);
    }
    if (applyRadius) {
      applyRadius.addEventListener("click", () => {
        loadRecommendations();
      });
    }
    if (recommendationCount) {
      recommendationCount.addEventListener("change", () => {
        loadRecommendations();
      });
    }

    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener("click", () => {
        sidebar.classList.toggle("hidden");
      });
    }
  });
})();
