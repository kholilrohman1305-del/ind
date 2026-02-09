(() => {
    // --- Config & Theme (Light Mode) ---
    Chart.defaults.color = '#64748b'; // Slate-500
    Chart.defaults.borderColor = '#f1f5f9'; // Slate-100
    Chart.defaults.font.family = '"Plus Jakarta Sans", sans-serif';

    // --- DOM Elements ---
    const els = {
        total: document.getElementById("totalFeedback"),
        positive: document.getElementById("positiveCount"),
        neutral: document.getElementById("neutralCount"),
        negative: document.getElementById("negativeCount"),
        tableBody: document.getElementById("feedbackTableBody"),
        search: document.getElementById("searchFeedback"),
        filterPeriode: document.getElementById("filterPeriode"),
        filterPeriodeSummary: document.getElementById("filterPeriodeSummary"),
        chartTotal: document.getElementById("chartTotal"),
        // Elements for sidebar toggle logic
        sidebarToggle: document.getElementById("sidebarToggle"),
        sidebar: document.getElementById("sidebar")
    };
    
    // --- Charts ---
    let charts = { sentiment: null, rating: null };
  
    // --- Helper Functions ---
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(date);
    };
  
    // Badge Sentimen: Menggunakan warna pastel background + teks gelap
    const getSentimentBadge = (sentiment, score) => {
        const config = {
            positif: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'fa-thumbs-up', label: 'Positif' },
            negatif: { bg: 'bg-rose-100', text: 'text-rose-700', icon: 'fa-triangle-exclamation', label: 'Negatif' },
            netral: { bg: 'bg-slate-100', text: 'text-slate-600', icon: 'fa-minus', label: 'Netral' }
        };
        const s = config[sentiment?.toLowerCase()] || config.netral;
        const percent = (score * 100).toFixed(0);
        
        return `
            <div class="flex flex-col items-start gap-1">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${s.bg} ${s.text}">
                    <i class="fa-solid ${s.icon} text-[10px]"></i> ${s.label}
                </span>
                <span class="text-[10px] text-slate-400 font-mono pl-1">Conf: ${percent}%</span>
            </div>
        `;
    };

    const getStarRating = (rating) => {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                // Kuning emas solid
                stars += '<i class="fa-solid fa-star text-yellow-400 text-sm"></i>';
            } else {
                // Abu-abu terang
                stars += '<i class="fa-solid fa-star text-slate-200 text-sm"></i>';
            }
        }
        return `<div class="flex gap-0.5">${stars}</div>`;
    };
  
    // --- Render Table ---
    const renderTable = (feedbacks) => {
        if (!els.tableBody) return;
        
        if (!feedbacks || feedbacks.length === 0) {
            els.tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-10 text-slate-400">
                        <div class="flex flex-col items-center justify-center gap-2">
                            <i class="fa-regular fa-folder-open text-2xl opacity-50"></i>
                            <span>Belum ada data feedback</span>
                        </div>
                    </td>
                </tr>`;
            return;
        }
  
        els.tableBody.innerHTML = feedbacks.map(fb => `
            <tr class="hover:bg-slate-50 transition-colors group">
                <td>
                    <div class="flex items-center gap-3">
                        <div class="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 uppercase">
                            ${fb.user_nama ? fb.user_nama.substring(0, 2) : '??'}
                        </div>
                        <div class="flex flex-col">
                            <span class="text-slate-700 font-semibold text-sm group-hover:text-brand-600 transition-colors">${fb.user_nama || 'Anonim'}</span>
                            <span class="text-[10px] text-slate-400">ID: #${fb.id}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="text-xs font-medium px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        ${fb.program_nama || 'Umum'}
                    </span>
                </td>
                <td>${getStarRating(fb.rating)}</td>
                <td>${getSentimentBadge(fb.hasil_sentimen, fb.confidence_score)}</td>
                <td class="max-w-xs">
                    <p class="text-sm text-slate-600 line-clamp-2" title="${fb.komentar}">
                        "${fb.komentar || '-'}"
                    </p>
                </td>
                <td class="text-xs text-slate-500 whitespace-nowrap">${formatDate(fb.created_at)}</td>
            </tr>
        `).join('');
    };
  
    // --- Init Charts ---
    const initCharts = (data) => {
        // Doughnut: Sentiment
        const sCtx = document.getElementById('sentimentChart')?.getContext('2d');
        if (sCtx) {
            if (charts.sentiment) charts.sentiment.destroy();
            charts.sentiment = new Chart(sCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Positif', 'Negatif', 'Netral'],
                    datasets: [{
                        data: [data.positif_count || 0, data.negatif_count || 0, data.netral_count || 0],
                        backgroundColor: ['#10b981', '#f43f5e', '#cbd5e1'], // Emerald-500, Rose-500, Slate-300
                        borderWidth: 2,
                        borderColor: '#ffffff', // Putih agar terpisah bersih
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
                    }
                }
            });
            
            // Update center text total percentage (dummy logic, or use real total count)
            if(els.chartTotal) els.chartTotal.innerText = (data.positif_count + data.negatif_count + data.netral_count);
        }
  
        // Bar Chart: Rating
        const rCtx = document.getElementById('ratingChart')?.getContext('2d');
        if (rCtx) {
            if (charts.rating) charts.rating.destroy();

            const ratingLabels = ['Kualitas Materi', 'Kemampuan Edukator', 'Fasilitas', 'Pelayanan'];
            const ratingData = [
                parseFloat(data.materi_avg) || 0,
                parseFloat(data.aspek_edukator_avg ?? data.edukator_avg) || 0,
                parseFloat(data.fasilitas_avg) || 0,
                parseFloat(data.pelayanan_avg) || 0
            ];

            // Fallback jika aspek kosong, pakai kategori lama
            const hasAspect = ratingData.some(v => v > 0);
            if (!hasAspect) {
                ratingLabels[0] = 'Umum';
                ratingLabels[1] = 'Program';
                ratingLabels[2] = 'Edukator';
                ratingLabels[3] = 'Testimonial';
                ratingData[0] = parseFloat(data.umum_avg_rating) || 0;
                ratingData[1] = parseFloat(data.program_avg_rating) || 0;
                ratingData[2] = parseFloat(data.edukator_avg_rating) || 0;
                ratingData[3] = parseFloat(data.testimonial_avg_rating) || 0;
            }

            charts.rating = new Chart(rCtx, {
                type: 'bar',
                data: {
                    labels: ratingLabels,
                    datasets: [{
                        label: 'Rating Rata-rata',
                        data: ratingData,
                        backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6'],
                        borderRadius: 6,
                        barThickness: 40
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 5,
                            grid: { borderDash: [2, 4], color: '#f1f5f9' },
                            ticks: { stepSize: 1 }
                        },
                        x: {
                            grid: { display: false }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
    };
  
    // --- Data Loading ---
    const getPeriode = () => els.filterPeriode?.value || "this_month";

    const syncPeriodeSelect = (value) => {
        if (els.filterPeriode && els.filterPeriode.value !== value) {
            els.filterPeriode.value = value;
        }
        if (els.filterPeriodeSummary && els.filterPeriodeSummary.value !== value) {
            els.filterPeriodeSummary.value = value;
        }
    };

    const loadData = async () => {
        try {
            const periode = getPeriode();
            const [statsRes, recentRes, chartsRes] = await Promise.all([
                fetch(`/api/feedback/stats?periode=${encodeURIComponent(periode)}`, { credentials: "same-origin" }),
                fetch(`/api/feedback/recent?limit=10&periode=${encodeURIComponent(periode)}`, { credentials: "same-origin" }),
                fetch(`/api/analysis/sentiment-data?periode=${encodeURIComponent(periode)}`, { credentials: "same-origin" })
            ]);

            // Load stats
            if (statsRes.ok) {
                const json = await statsRes.json();
                if (json.success && json.data) {
                    const s = json.data;
                    if(els.total) els.total.textContent = s.total_feedback || 0;
                    if(els.positive) els.positive.textContent = s.positif_count || 0;
                    if(els.neutral) els.neutral.textContent = s.netral_count || 0;
                    if(els.negative) els.negative.textContent = s.negatif_count || 0;
                }
            }

            // Load recent feedback table
            if (recentRes.ok) {
                const json = await recentRes.json();
                if (json.success) {
                    renderTable(json.data || []);
                } else {
                    console.error("Recent feedback error:", json.message);
                    renderTable([]);
                }
            } else {
                console.error("Recent feedback fetch failed:", recentRes.status);
                renderTable([]);
            }

            // Load charts data
            if (chartsRes.ok) {
                const json = await chartsRes.json();
                if (json.success && json.data) {
                    initCharts(json.data);
                } else {
                    console.error("Charts data error:", json.message);
                    initCharts({ positif_count: 0, negatif_count: 0, netral_count: 0 });
                }
            } else {
                console.error("Charts fetch failed:", chartsRes.status);
                initCharts({ positif_count: 0, negatif_count: 0, netral_count: 0 });
            }

        } catch (err) {
            console.error("Data load failed:", err);
            renderTable([]);
        }
    };
  
    // --- Search Logic ---
    let searchTimeout;
    if (els.search) {
        els.search.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                try {
                    const q = encodeURIComponent(e.target.value);
                    const periode = getPeriode();
                    const res = await fetch(`/api/feedback/recent?limit=20&periode=${encodeURIComponent(periode)}&q=${q}`, { credentials: "same-origin" });
                    if (res.ok) {
                        const json = await res.json();
                        if (json.success) renderTable(json.data);
                    }
                } catch (err) { console.error(err); }
            }, 500);
        });
    }

    const handleFilterChange = (value) => {
        syncPeriodeSelect(value);
        loadData();
    };

    if (els.filterPeriode) {
        els.filterPeriode.addEventListener("change", (e) => handleFilterChange(e.target.value));
    }
    if (els.filterPeriodeSummary) {
        els.filterPeriodeSummary.addEventListener("change", (e) => handleFilterChange(e.target.value));
    }

    // --- Sidebar Toggle (Mobile) ---
    // Di desktop sidebar statis, di mobile kita perlu toggle
    if(els.sidebarToggle && els.sidebar) {
        els.sidebarToggle.addEventListener('click', () => {
            els.sidebar.classList.toggle('hidden');
            // Menambahkan background overlay logic jika diperlukan
        });
    }

    // --- Init ---
    document.addEventListener("DOMContentLoaded", () => {
        syncPeriodeSelect(getPeriode());
        loadData();
        setInterval(loadData, 30000);
    });
})();
