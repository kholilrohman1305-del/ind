(() => {
    const programGrid = document.getElementById("programGrid");
    const categoryButtons = document.querySelectorAll(".filter-btn");
    const branchSelect = document.getElementById("branchFilter");
    const navbar = document.getElementById("navbar");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const mobileMenu = document.getElementById("mobileMenu");
    
    // State management
    let allPrograms = [];
    let currentCategory = 'all';
    let currentBranch = 'all';

    // Format Rupiah
    const formatCurrency = (value) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    // Render Cards dengan Desain Baru
    const renderPrograms = (programs) => {
        if (!programGrid) return;
        
        // Animasi fade out sebelum render ulang (opsional, tapi bagus)
        programGrid.style.opacity = '0';
        
        setTimeout(() => {
            programGrid.innerHTML = "";

            if (programs.length === 0) {
                programGrid.innerHTML = `
                    <div class="col-span-full text-center py-20">
                        <div class="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 text-4xl animate-bounce">
                            <i class="fa-solid fa-magnifying-glass"></i>
                        </div>
                        <h3 class="text-xl font-bold text-slate-800 mb-2">Oops, Program Tidak Ditemukan</h3>
                        <p class="text-slate-500">Silakan ubah filter pencarian Anda.</p>
                    </div>
                `;
            } else {
                programs.forEach((p, index) => {
                    const card = document.createElement("div");
                    // Delay animasi per kartu
                    card.style.animationDelay = `${index * 100}ms`;
                    card.className = "group relative bg-white rounded-3xl p-5 shadow-xl shadow-slate-200/40 border border-slate-100 hover:shadow-2xl hover:shadow-brand-100/50 transition-all duration-300 hover:-translate-y-2 flex flex-col h-full animate-fade-in-up";
                    
                    // Logic Warna Badge berdasarkan jenjang
                    let badgeColor = "bg-slate-100 text-slate-600";
                    let iconColor = "text-slate-400";
                    let gradientBg = "from-slate-500 to-slate-600";
                    
                    if(p.jenjang === 'SD') {
                        badgeColor = "bg-orange-100 text-orange-600";
                        iconColor = "text-orange-400";
                        gradientBg = "from-orange-400 to-amber-500";
                    } else if (p.jenjang === 'SMP') {
                        badgeColor = "bg-blue-100 text-blue-600";
                        iconColor = "text-blue-400";
                        gradientBg = "from-blue-500 to-indigo-600";
                    } else if (p.jenjang === 'SMA') {
                        badgeColor = "bg-pink-100 text-pink-600";
                        iconColor = "text-pink-400";
                        gradientBg = "from-rose-500 to-pink-600";
                    }

                    card.innerHTML = `
                        <div class="h-32 rounded-2xl bg-gradient-to-r ${gradientBg} relative overflow-hidden mb-6 group-hover:h-40 transition-all duration-500">
                            <div class="absolute inset-0 bg-white/10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30"></div>
                            <div class="absolute -bottom-6 -right-6 text-9xl text-white opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                                <i class="fa-solid fa-shapes"></i>
                            </div>
                            <div class="absolute top-3 left-3">
                                <span class="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-white text-[10px] font-black uppercase tracking-widest border border-white/20 shadow-sm">
                                    ${p.tipe_les}
                                </span>
                            </div>
                        </div>

                        <div class="flex-1 flex flex-col">
                            <div class="flex justify-between items-start mb-3">
                                <span class="px-3 py-1.5 rounded-lg text-xs font-bold ${badgeColor}">
                                    ${p.jenjang}
                                </span>
                                <div class="flex items-center gap-1 text-xs font-bold text-yellow-500">
                                    <i class="fa-solid fa-star"></i> 4.9
                                </div>
                            </div>

                            <h3 class="text-xl font-black text-slate-800 leading-tight mb-3 group-hover:text-brand-600 transition-colors">
                                ${p.nama}
                            </h3>
                            
                            <p class="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-2">
                                ${p.deskripsi || 'Kurikulum terstandarisasi dengan metode belajar interaktif dan menyenangkan.'}
                            </p>

                            <div class="grid grid-cols-2 gap-3 mb-6">
                                <div class="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                                    <i class="fa-solid fa-calendar-day ${iconColor}"></i>
                                    <div class="text-xs">
                                        <span class="block font-bold text-slate-700">${p.jumlah_pertemuan || 8}x</span>
                                        <span class="text-slate-400">Pertemuan</span>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                                    <i class="fa-solid fa-location-dot ${iconColor}"></i>
                                    <div class="text-xs">
                                        <span class="block font-bold text-slate-700 truncate max-w-[80px]">${p.cabang_nama}</span>
                                        <span class="text-slate-400">Lokasi</span>
                                    </div>
                                </div>
                            </div>

                            <div class="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase">Investasi Belajar</p>
                                    <p class="text-lg font-black text-slate-900">${formatCurrency(p.harga)}</p>
                                </div>
                                <a href="/register?role=siswa&cabang=${p.cabang_id}&program=${p.id}" 
                                   class="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-brand-600 hover:rotate-90 hover:rounded-full transition-all duration-300 shadow-lg">
                                    <i class="fa-solid fa-arrow-right"></i>
                                </a>
                            </div>
                        </div>
                    `;
                    programGrid.appendChild(card);
                });
            }
            
            // Fade in effect
            programGrid.style.opacity = '1';
        }, 300);
    };

    // Filter Logic
    const applyCombinedFilters = () => {
        const filtered = allPrograms.filter(p => {
            const matchCategory = currentCategory === 'all' 
                ? true 
                : (p.jenjang === currentCategory || p.tipe_les === currentCategory);
            const matchBranch = currentBranch === 'all'
                ? true
                : p.cabang_nama === currentBranch;
            return matchCategory && matchBranch;
        });
        renderPrograms(filtered);
    };

    // Populate Branch
    const populateBranchOptions = (programs) => {
        if (!branchSelect) return;
        const branches = [...new Set(programs.map(p => p.cabang_nama))].sort();
        branchSelect.innerHTML = '<option value="all">Semua Cabang</option>';
        branches.forEach(branchName => {
            const option = document.createElement("option");
            option.value = branchName;
            option.textContent = branchName;
            branchSelect.appendChild(option);
        });
    };

    // Fetch Data
    const fetchPrograms = async () => {
        try {
            // Simulasi Data jika API belum siap (Bisa dihapus jika API sudah ready)
            // const res = await fetch("/api/public/programs");
            // const json = await res.json();
            
            // NOTE: Gunakan ini untuk testing tampilan jika backend belum on:
            const json = { success: true, data: [
                { id: 1, nama: "Super Intensif UTBK", jenjang: "SMA", tipe_les: "Reguler", harga: 1500000, cabang_nama: "Malang", jumlah_pertemuan: 12 },
                { id: 2, nama: "Calistung Ceria", jenjang: "SD", tipe_les: "Privat", harga: 500000, cabang_nama: "Surabaya", jumlah_pertemuan: 8 },
                { id: 3, nama: "Master Matematika", jenjang: "SMP", tipe_les: "Reguler", harga: 750000, cabang_nama: "Malang", jumlah_pertemuan: 8 },
            ]}; 

            // Uncomment baris di bawah untuk live API:
             const res = await fetch("/api/public/programs");
             const apiJson = await res.json();
             if (apiJson.success) allPrograms = apiJson.data;

            // Gunakan data dummy jika fetch gagal atau kosong saat dev
            if(allPrograms.length === 0 && json.success) allPrograms = json.data;
            
            populateBranchOptions(allPrograms);
            renderPrograms(allPrograms);
        } catch (err) {
            console.error("Fetch error:", err);
            // Render dummy data on error for UI preview
             renderPrograms([]);
        }
    };

    // Event Listeners
    categoryButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            // Reset Styles
            categoryButtons.forEach(b => {
                b.classList.remove("bg-slate-900", "text-white", "shadow-lg");
                b.classList.add("bg-white", "text-slate-600");
            });
            // Active Style
            btn.classList.remove("bg-white", "text-slate-600");
            btn.classList.add("bg-slate-900", "text-white", "shadow-lg");
            
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

    // Mobile Menu Toggle
    if(mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            mobileMenu.classList.toggle('flex');
            
            // Icon Toggle
            const icon = mobileMenuBtn.querySelector('i');
            if(mobileMenu.classList.contains('hidden')) {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            } else {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            }
        });
    }

    // Navbar Scroll Effect
    window.addEventListener("scroll", () => {
        if (window.scrollY > 10) {
            navbar.classList.add("glass-nav-active");
        } else {
            navbar.classList.remove("glass-nav-active");
        }
    });

    // Init
    fetchPrograms();
})();