(() => {
    const requester = window.api?.request || fetch;
    // --- DOM Cache ---
    const els = {
        role: document.getElementById("role"),
        btnSiswa: document.getElementById("btnSiswa"),
        btnEdukator: document.getElementById("btnEdukator"),
        siswaFields: document.getElementById("siswaFields"),
        edukatorFields: document.getElementById("edukatorFields"),
        detailLabel: document.getElementById("detailLabel"),
        form: document.getElementById("registerForm"),
        submitBtn: document.getElementById("submitBtn"),
        togglePass: document.getElementById("togglePass"),
        passInput: document.getElementById("password"),
        toast: document.getElementById("toast"),

        // Inputs
        cabang: document.getElementById("cabang_id"),
        eduCabang: document.getElementById("edu_cabang_id"),
        mapelContainer: document.getElementById("mapelContainer"),
        // Siswa specific inputs
        siswaMapelContainer: document.getElementById("siswaMapelContainer"),
        tanggalMulaiBelajar: document.getElementById("tanggal_mulai_belajar"),
        jamBelajar: document.getElementById("jam_belajar"),
        // Program from landing page
        programId: document.getElementById("program_id"),
        selectedProgramInfo: document.getElementById("selectedProgramInfo"),
        selectedProgramName: document.getElementById("selectedProgramName")
    };

    // State
    let dataCache = { branches: [], programs: [], mapels: [] };
    let selectedProgram = null;

    // --- Toast Notification System ---
    const showToast = (title, message, type = 'success') => {
        const iconContainer = els.toast.querySelector('#toastIcon');
        const tTitle = els.toast.querySelector('#toastTitle');
        const tMsg = els.toast.querySelector('#toastMessage');
        const toastEl = els.toast.querySelector('.glass-panel');

        tTitle.textContent = title;
        tMsg.textContent = message;

        if (type === 'success') {
            toastEl.style.borderColor = '#10b981'; // Emerald
            iconContainer.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400 text-lg"></i>';
        } else {
            toastEl.style.borderColor = '#f43f5e'; // Rose
            iconContainer.innerHTML = '<i class="fa-solid fa-circle-xmark text-rose-500 text-lg"></i>';
        }

        // Animation In
        els.toast.classList.remove('translate-y-[-200%]', 'opacity-0');
        
        // Auto Hide
        setTimeout(() => {
            els.toast.classList.add('translate-y-[-200%]', 'opacity-0');
        }, 4000);
    };

    // --- Tab Switcher Logic ---
    window.setRole = (role) => {
        els.role.value = role;
        
        // CSS Classes for Active vs Inactive Buttons
        const activeClasses = ['bg-primary-600', 'text-white', 'shadow-lg'];
        const inactiveClasses = ['text-slate-400', 'hover:text-white', 'hover:bg-white/5'];

        if (role === 'siswa') {
            // Update Buttons
            els.btnSiswa.classList.add(...activeClasses);
            els.btnSiswa.classList.remove(...inactiveClasses);
            
            els.btnEdukator.classList.remove(...activeClasses);
            els.btnEdukator.classList.add(...inactiveClasses);

            // Toggle Fields
            els.siswaFields.classList.remove('hidden');
            els.edukatorFields.classList.add('hidden');
            els.detailLabel.textContent = "Data Akademik Siswa";
            
            // Required Attributes Management
            els.cabang.required = true;
            els.eduCabang.required = false;
            if (els.tanggalMulaiBelajar) els.tanggalMulaiBelajar.required = true;
            if (els.jamBelajar) els.jamBelajar.required = true;

        } else {
            // Update Buttons
            els.btnEdukator.classList.add(...activeClasses);
            els.btnEdukator.classList.remove(...inactiveClasses);
            
            els.btnSiswa.classList.remove(...activeClasses);
            els.btnSiswa.classList.add(...inactiveClasses);

            // Toggle Fields
            els.edukatorFields.classList.remove('hidden');
            els.siswaFields.classList.add('hidden');
            els.detailLabel.textContent = "Kualifikasi Pengajar";

            // Required Attributes Management
            els.cabang.required = false;
            els.eduCabang.required = true;
            if (els.tanggalMulaiBelajar) {
                els.tanggalMulaiBelajar.required = false;
                els.tanggalMulaiBelajar.setCustomValidity("");
            }
            if (els.jamBelajar) {
                els.jamBelajar.required = false;
                els.jamBelajar.setCustomValidity("");
            }
        }
    };

    // --- Data Logic: Fetch & Render ---
    const loadData = async () => {
        try {
            const res = await requester("/api/public/options");
            const json = await res.json();
            if (json.success) {
                dataCache = {
                    branches: json.data.cabang || [],
                    programs: json.data.program || [],
                    mapels: json.data.mapel || []
                };
                renderOptions();
            }
        } catch (e) {
            console.error(e);
            showToast('Koneksi Gagal', 'Gagal memuat data opsi dari server.', 'error');
        }
    };

    const renderOptions = () => {
        // Render Branches
        const branchOptions = `<option value="" class="bg-slate-900">-- Pilih Cabang --</option>` +
            dataCache.branches.map(b => `<option value="${b.id}" class="bg-slate-900">${b.nama}</option>`).join("");

        els.cabang.innerHTML = branchOptions;
        els.eduCabang.innerHTML = branchOptions;

        // Render Mapels for Edukator (Styled Chips)
        if (els.mapelContainer) {
            els.mapelContainer.innerHTML = dataCache.mapels.map(m => `
                <label class="cursor-pointer select-none group">
                    <input type="checkbox" name="mapel_ids" value="${m.id}" class="mapel-checkbox sr-only">
                    <div class="px-3 py-1.5 rounded-lg border border-white/10 bg-slate-800 text-slate-400 text-xs font-bold transition-all hover:border-primary-500/50 hover:text-white">
                        ${m.nama}
                    </div>
                </label>
            `).join("");
        }

        // Render Mapels for Siswa (Styled Chips)
        if (els.siswaMapelContainer) {
            els.siswaMapelContainer.innerHTML = dataCache.mapels.map(m => `
                <label class="cursor-pointer select-none group">
                    <input type="checkbox" name="siswa_mapel_ids" value="${m.id}" class="mapel-checkbox sr-only">
                    <div class="px-3 py-1.5 rounded-lg border border-white/10 bg-slate-800 text-slate-400 text-xs font-bold transition-all hover:border-primary-500/50 hover:text-white">
                        ${m.nama}
                    </div>
                </label>
            `).join("");
        }

        // Set minimum date for tanggal_mulai_belajar to today
        if (els.tanggalMulaiBelajar) {
            const today = new Date().toISOString().split('T')[0];
            els.tanggalMulaiBelajar.setAttribute('min', today);
            els.tanggalMulaiBelajar.value = today; // Default to today
        }
    };

    // Note: Program selection removed for siswa - now uses mapel selection instead

    // --- Event: Password Toggle ---
    if(els.togglePass) {
        els.togglePass.addEventListener('click', () => {
            const isPass = els.passInput.type === 'password';
            els.passInput.type = isPass ? 'text' : 'password';
            els.togglePass.innerHTML = isPass ? '<i class="fa-regular fa-eye-slash text-primary-400"></i>' : '<i class="fa-regular fa-eye"></i>';
        });
    }

    // --- Event: Submit Form ---
    els.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Button Loading State
        const originalContent = els.submitBtn.innerHTML;
        els.submitBtn.disabled = true;
        els.submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-lg"></i> <span class="ml-2">Memproses...</span>`;
        els.submitBtn.classList.add('opacity-75', 'cursor-not-allowed');

        const role = els.role.value;
        
        // Base Payload
        const payload = {
            nama: document.getElementById("nama").value,
            telepon: document.getElementById("telepon").value,
            alamat: document.getElementById("alamat").value,
            email: document.getElementById("email").value,
            password: document.getElementById("password").value,
        };

        const url = role === 'siswa' ? "/api/public/register/siswa" : "/api/public/register/edukator";

        // Role Specific Logic
        if (role === 'siswa') {
            payload.cabang_id = els.cabang.value;
            payload.jenjang = document.getElementById("jenjang").value;
            payload.sekolah_asal = document.getElementById("sekolah_asal").value;
            payload.kelas = document.getElementById("kelas").value;
            payload.tanggal_lahir = document.getElementById("tanggal_lahir").value;

            // Program from landing page (if selected)
            payload.program_id = els.programId.value || null;

            // New fields for siswa registration
            payload.mapel_ids = Array.from(document.querySelectorAll('input[name="siswa_mapel_ids"]:checked')).map(cb => cb.value);
            payload.preferred_days = Array.from(document.querySelectorAll('input[name="preferred_days"]:checked')).map(cb => cb.value);
            payload.jam_belajar = els.jamBelajar.value;
            payload.tanggal_mulai_belajar = els.tanggalMulaiBelajar.value;

            // Validations - program wajib dipilih
            if (!payload.program_id) {
                showToast("Validasi", "Pilih program terlebih dahulu.", "error");
                resetButton(originalContent);
                return;
            }
            if (payload.preferred_days.length === 0) {
                showToast("Validasi", "Pilih minimal satu hari belajar.", "error");
                resetButton(originalContent);
                return;
            }
            if (!payload.jam_belajar) {
                showToast("Validasi", "Pilih jam belajar.", "error");
                resetButton(originalContent);
                return;
            }
            if (!payload.tanggal_mulai_belajar) {
                showToast("Validasi", "Pilih tanggal mulai belajar.", "error");
                resetButton(originalContent);
                return;
            }
        } else {
            payload.cabang_id = els.eduCabang.value;
            payload.pendidikan_terakhir = document.getElementById("pendidikan_terakhir").value;
            payload.mapel_ids = Array.from(document.querySelectorAll('input[name="mapel_ids"]:checked')).map(cb => cb.value);
            
            if (payload.mapel_ids.length === 0) {
                showToast("Validasi", "Pilih minimal satu mata pelajaran/keahlian.", "error");
                resetButton(originalContent);
                return;
            }
        }

        try {
            // Simulasi delay agar animasi terlihat (opsional)
            // await new Promise(r => setTimeout(r, 1000));

            const res = await requester(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const json = await res.json();

            if (json.success) {
                showToast("Berhasil!", "Akun dibuat. Mengalihkan ke login...", "success");
                els.submitBtn.innerHTML = `<i class="fa-solid fa-check text-lg"></i> <span class="ml-2">Sukses!</span>`;
                els.submitBtn.classList.replace('from-primary-600', 'from-emerald-600');
                els.submitBtn.classList.replace('to-indigo-600', 'to-emerald-500');
                
                setTimeout(() => window.location.href = "/login", 1500);
            } else {
                throw new Error(json.message || "Gagal mendaftar.");
            }
        } catch (err) {
            showToast("Gagal", err.message || "Terjadi kesalahan sistem.", "error");
            resetButton(originalContent);
        }
    });

    const resetButton = (originalContent) => {
        els.submitBtn.disabled = false;
        els.submitBtn.innerHTML = originalContent;
        els.submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
    };

    // --- URL Params Logic (Auto Fill) ---
    const getUrlParameter = (name) => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    };

    const autoFillForm = async () => {
        const cabangParam = getUrlParameter('cabang');
        const programParam = getUrlParameter('program');
        const jenjangParam = getUrlParameter('jenjang');

        if(cabangParam || programParam || jenjangParam) {
            setRole('siswa');
        }

        // Wait a tick for UI update
        await new Promise(r => setTimeout(r, 100));

        // Set cabang
        if(cabangParam && els.cabang) {
            const optionExists = Array.from(els.cabang.options).some(o => o.value === cabangParam);
            if(optionExists) {
                els.cabang.value = cabangParam;
            }
        }

        // Set jenjang
        if(jenjangParam) {
            const jenjangEl = document.getElementById('jenjang');
            if(jenjangEl) jenjangEl.value = jenjangParam;
        }

        // Set program (from landing page)
        if(programParam && els.programId) {
            els.programId.value = programParam;

            // Find program in cache and display info
            const program = dataCache.programs.find(p => String(p.id) === programParam);
            if(program && els.selectedProgramInfo && els.selectedProgramName) {
                selectedProgram = program;
                els.selectedProgramName.textContent = `${program.nama} (${program.jenjang})`;
                els.selectedProgramInfo.classList.remove('hidden');

                // Auto-select mapel based on program's mapel_id if available
                if(program.mapel_id && els.siswaMapelContainer) {
                    const mapelCheckbox = els.siswaMapelContainer.querySelector(`input[value="${program.mapel_id}"]`);
                    if(mapelCheckbox) {
                        mapelCheckbox.checked = true;
                        // Trigger visual update
                        mapelCheckbox.dispatchEvent(new Event('change'));
                    }
                }
            }
        }
    };

    // Init
    const initApp = async () => {
        await loadData();
        await autoFillForm();
    };

    initApp();
})();
