(() => {
  // === DOM References ===
  const programGrid = document.getElementById("programGrid");
  const categoryButtons = document.querySelectorAll(".filter-btn");
  const branchSelect = document.getElementById("branchFilter");
  const navbar = document.getElementById("navbar");
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  const bannerTrack = document.getElementById("bannerTrack");
  const bannerPrev = document.getElementById("bannerPrev");
  const bannerNext = document.getElementById("bannerNext");
  const bannerDots = document.getElementById("bannerDots");
  const bannerSlider = document.getElementById("bannerSlider");
  const fallbackHero = document.getElementById("fallbackHero");
  const edukatorGrid = document.getElementById("edukatorGrid");

  // === State ===
  let allPrograms = [];
  let currentCategory = "all";
  let currentBranch = "all";
  let banners = [];
  let currentSlide = 0;
  let autoplayTimer = null;

  // === Utilities ===
  const formatCurrency = (value) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  // =====================
  // BANNER SLIDER
  // =====================
  const fetchBanners = async () => {
    try {
      const res = await fetch("/api/public/banners");
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        banners = json.data;
        renderBannerSlider();
        startAutoplay();
      } else {
        showFallbackHero();
      }
    } catch {
      showFallbackHero();
    }
  };

  const showFallbackHero = () => {
    const heroSection = document.getElementById("hero-banner");
    if (heroSection) heroSection.classList.add("hidden");
    if (fallbackHero) fallbackHero.classList.remove("hidden");
  };

  const renderBannerSlider = () => {
    if (!bannerTrack) return;
    bannerTrack.innerHTML = banners.map((b) => {
      const inner = `<img src="${b.gambar}" alt="${b.judul || 'Banner'}" class="w-full h-full object-cover" />`;
      return b.link_url
        ? `<a href="${b.link_url}" class="banner-slide block">${inner}</a>`
        : `<div class="banner-slide">${inner}</div>`;
    }).join("");

    if (banners.length > 1) {
      if (bannerPrev) bannerPrev.classList.remove("hidden");
      if (bannerNext) bannerNext.classList.remove("hidden");
    }

    if (bannerDots && banners.length > 1) {
      bannerDots.innerHTML = banners.map((_, i) =>
        `<span class="banner-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`
      ).join("");
    }
    goToSlide(0);
  };

  const goToSlide = (index) => {
    if (banners.length === 0) return;
    currentSlide = ((index % banners.length) + banners.length) % banners.length;
    if (bannerTrack) {
      bannerTrack.style.transition = "transform 0.5s ease";
      bannerTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
    if (bannerDots) {
      bannerDots.querySelectorAll(".banner-dot").forEach((dot, i) => {
        dot.classList.toggle("active", i === currentSlide);
      });
    }
  };

  const startAutoplay = () => {
    stopAutoplay();
    if (banners.length <= 1) return;
    autoplayTimer = setInterval(() => goToSlide(currentSlide + 1), 5000);
  };
  const stopAutoplay = () => { if (autoplayTimer) clearInterval(autoplayTimer); };

  if (bannerPrev) bannerPrev.addEventListener("click", () => { goToSlide(currentSlide - 1); startAutoplay(); });
  if (bannerNext) bannerNext.addEventListener("click", () => { goToSlide(currentSlide + 1); startAutoplay(); });
  if (bannerDots) bannerDots.addEventListener("click", (e) => {
    const dot = e.target.closest(".banner-dot");
    if (dot) { goToSlide(Number(dot.dataset.index)); startAutoplay(); }
  });

  // =====================
  // PROGRAMS
  // =====================
  const fetchPrograms = async () => {
    try {
      const res = await fetch("/api/public/programs");
      const json = await res.json();
      if (json.success && json.data.length > 0) allPrograms = json.data;
      if (allPrograms.length === 0) {
        allPrograms = [
          { id: 1, nama: "Super Intensif UTBK", jenjang: "SMA", tipe_les: "kelas", harga: 1500000, cabang_nama: "Malang", jumlah_pertemuan: 12 },
          { id: 2, nama: "Calistung Ceria", jenjang: "SD", tipe_les: "privat", harga: 500000, cabang_nama: "Surabaya", jumlah_pertemuan: 8 },
          { id: 3, nama: "Master Matematika", jenjang: "SMP", tipe_les: "kelas", harga: 750000, cabang_nama: "Malang", jumlah_pertemuan: 8 },
        ];
      }
      populateBranchOptions(allPrograms);
      renderPrograms(allPrograms);
    } catch {
      renderPrograms([]);
    }
  };

  const renderPrograms = (programs) => {
    if (!programGrid) return;
    programGrid.style.opacity = "0";

    setTimeout(() => {
      programGrid.innerHTML = "";
      if (programs.length === 0) {
        programGrid.innerHTML = `
          <div class="col-span-full text-center py-16">
            <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 text-3xl"><i class="fa-solid fa-magnifying-glass"></i></div>
            <h3 class="text-lg font-bold text-slate-800 mb-1">Program Tidak Ditemukan</h3>
            <p class="text-slate-500 text-sm">Coba ubah filter pencarian.</p>
          </div>`;
        programGrid.style.opacity = "1";
        return;
      }

      programs.forEach((p, index) => {
        const card = document.createElement("div");
        card.style.animationDelay = `${index * 80}ms`;
        card.className = "group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col animate-fade-in-up";

        let badgeColor = "bg-slate-100 text-slate-600";
        let gradientBg = "from-slate-400 to-slate-500";
        if (p.jenjang === "SD") { badgeColor = "bg-orange-100 text-orange-600"; gradientBg = "from-orange-400 to-amber-500"; }
        else if (p.jenjang === "SMP") { badgeColor = "bg-blue-100 text-blue-600"; gradientBg = "from-blue-500 to-indigo-600"; }
        else if (p.jenjang === "SMA") { badgeColor = "bg-rose-100 text-rose-600"; gradientBg = "from-rose-500 to-pink-600"; }

        const imageSection = p.gambar
          ? `<div class="h-40 overflow-hidden"><img src="${p.gambar}" alt="${p.nama}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>`
          : `<div class="h-32 bg-gradient-to-r ${gradientBg} relative overflow-hidden">
              <div class="absolute inset-0 bg-white/10 opacity-30"></div>
              <div class="absolute -bottom-4 -right-4 text-7xl text-white opacity-10 rotate-12"><i class="fa-solid fa-shapes"></i></div>
              <div class="absolute top-3 left-3"><span class="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-white text-[10px] font-black uppercase tracking-widest border border-white/20">${p.tipe_les || ""}</span></div>
            </div>`;

        card.innerHTML = `
          ${imageSection}
          <div class="p-4 flex-1 flex flex-col">
            <div class="flex items-center justify-between mb-2">
              <span class="px-2.5 py-1 rounded-lg text-[11px] font-bold ${badgeColor}">${p.jenjang || "-"}</span>
              <span class="text-[11px] font-bold text-slate-400">${p.cabang_nama || ""}</span>
            </div>
            <h3 class="font-bold text-slate-900 leading-snug mb-1.5 group-hover:text-indigo-600 transition-colors text-sm">${p.nama}</h3>
            <p class="text-slate-400 text-xs leading-relaxed mb-3 line-clamp-2">${p.deskripsi || "Program belajar terstruktur dengan metode interaktif."}</p>
            <div class="flex items-center gap-3 text-xs text-slate-400 mb-4">
              <span><i class="fa-solid fa-calendar-day mr-1"></i>${p.jumlah_pertemuan || 8}x Pertemuan</span>
              <span><i class="fa-solid fa-tag mr-1"></i>${p.tipe_les || "-"}</span>
            </div>
            <div class="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase">Harga Paket</p>
                <p class="text-base font-black text-slate-900">${formatCurrency(p.harga)}</p>
              </div>
              <a href="/register?role=siswa&cabang=${p.cabang_id}&program=${p.id}"
                 class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-indigo-600 transition-all shadow-md text-sm">
                <i class="fa-solid fa-arrow-right"></i>
              </a>
            </div>
          </div>`;
        programGrid.appendChild(card);
      });
      programGrid.style.opacity = "1";
    }, 200);
  };

  const applyCombinedFilters = () => {
    const filtered = allPrograms.filter((p) => {
      const matchCategory = currentCategory === "all" ? true
        : currentCategory === "privat" ? p.tipe_les === "privat"
        : currentCategory === "kelas" ? p.tipe_les === "kelas"
        : p.jenjang === currentCategory;
      const matchBranch = currentBranch === "all" ? true : p.cabang_nama === currentBranch;
      return matchCategory && matchBranch;
    });
    renderPrograms(filtered);
  };

  const populateBranchOptions = (programs) => {
    if (!branchSelect) return;
    const branches = [...new Set(programs.map((p) => p.cabang_nama))].sort();
    branchSelect.innerHTML = '<option value="all">Semua Cabang</option>';
    branches.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      branchSelect.appendChild(opt);
    });
  };

  // Filter button clicks
  categoryButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      categoryButtons.forEach((b) => {
        b.classList.remove("bg-slate-900", "text-white", "shadow");
        b.classList.add("bg-white", "text-slate-500", "border", "border-slate-200");
      });
      btn.classList.remove("bg-white", "text-slate-500", "border", "border-slate-200");
      btn.classList.add("bg-slate-900", "text-white", "shadow");
      currentCategory = btn.dataset.filter;
      applyCombinedFilters();
    });
  });

  if (branchSelect) {
    branchSelect.addEventListener("change", (e) => {
      currentBranch = e.target.value;
      applyCombinedFilters();
    });
  }

  // Quick category links
  document.querySelectorAll(".category-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const cat = link.dataset.category;
      if (cat) {
        currentCategory = cat;
        applyCombinedFilters();
        document.getElementById("programs")?.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // =====================
  // EDUCATORS
  // =====================
  const fetchEdukators = async () => {
    try {
      const res = await fetch("/api/public/edukators");
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        renderEdukators(json.data);
      } else {
        renderEdukatorsFallback();
      }
    } catch {
      renderEdukatorsFallback();
    }
  };

  const renderEdukators = (edukators) => {
    if (!edukatorGrid) return;
    edukatorGrid.innerHTML = edukators.map((e) => `
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all text-center p-5">
        <div class="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
          ${e.foto
            ? `<img src="${e.foto}" alt="${e.nama}" class="w-full h-full object-cover" />`
            : `<i class="fa-solid fa-user-tie text-2xl text-indigo-400"></i>`}
        </div>
        <h4 class="font-bold text-slate-900 text-sm mb-0.5">${e.nama}</h4>
        <p class="text-xs text-indigo-600 font-semibold mb-1">${e.mapel_nama || "Umum"}</p>
        <p class="text-[11px] text-slate-400">${e.pendidikan_terakhir || ""}</p>
        ${e.cabang_nama ? `<p class="text-[10px] text-slate-400 mt-1"><i class="fa-solid fa-map-pin mr-0.5"></i>${e.cabang_nama}</p>` : ""}
      </div>
    `).join("");
  };

  const renderEdukatorsFallback = () => {
    if (!edukatorGrid) return;
    edukatorGrid.innerHTML = `
      <div class="col-span-full text-center py-10">
        <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300 text-2xl"><i class="fa-solid fa-user-group"></i></div>
        <p class="text-slate-400 font-semibold text-sm">Data pengajar belum tersedia.</p>
      </div>`;
  };

  // =====================
  // FAQ ACCORDION
  // =====================
  document.querySelectorAll(".faq-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      const icon = btn.querySelector("i");
      const isOpen = content.classList.contains("open");

      document.querySelectorAll(".faq-content").forEach((c) => c.classList.remove("open"));
      document.querySelectorAll(".faq-toggle i").forEach((i) => { i.style.transform = ""; });

      if (!isOpen) {
        content.classList.add("open");
        if (icon) icon.style.transform = "rotate(180deg)";
      }
    });
  });

  // =====================
  // MOBILE MENU
  // =====================
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden");
      mobileMenu.classList.toggle("flex");
      const icon = mobileMenuBtn.querySelector("i");
      icon.classList.toggle("fa-bars");
      icon.classList.toggle("fa-xmark");
    });
  }

  // =====================
  // NAVBAR SCROLL
  // =====================
  window.addEventListener("scroll", () => {
    if (navbar) {
      navbar.classList.toggle("shadow-xl", window.scrollY > 10);
    }
  });

  // =====================
  // INIT
  // =====================
  fetchBanners();
  fetchPrograms();
  fetchEdukators();
})();
