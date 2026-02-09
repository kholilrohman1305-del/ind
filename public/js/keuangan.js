(() => {
  const tabTagihan = document.getElementById("tabTagihan");
  const tabPembayaran = document.getElementById("tabPembayaran");
  const tagihanSection = document.getElementById("tagihanSection");
  const pembayaranSection = document.getElementById("pembayaranSection");
  
  // Controls in Header
  const addTagihanBtn = document.getElementById("addTagihanBtn");
  const addPembayaranBtn = document.getElementById("addPembayaranBtn");
  const filterContainer = document.getElementById("filterContainer");

  if (!tabTagihan || !tabPembayaran || !tagihanSection || !pembayaranSection) return;

  const setActive = (active) => {
    if (active === "pembayaran") {
      // Show Pembayaran UI
      tagihanSection.classList.add("hidden");
      pembayaranSection.classList.remove("hidden");
      
      // Update Tab Styles
      tabTagihan.classList.replace("active", "inactive");
      tabPembayaran.classList.replace("inactive", "active");
      
      // Update Header Controls
      if (addTagihanBtn) addTagihanBtn.classList.add("hidden");
      if (filterContainer) filterContainer.classList.add("hidden"); // Hide tagihan-specific filters
      // Note: Pembayaran filters are inside the section itself
      if (addPembayaranBtn) addPembayaranBtn.classList.remove("hidden"); // Optional: if you want separate button
      
      return;
    }

    // Show Tagihan UI
    pembayaranSection.classList.add("hidden");
    tagihanSection.classList.remove("hidden");
    
    // Update Tab Styles
    tabPembayaran.classList.replace("active", "inactive");
    tabTagihan.classList.replace("inactive", "active");
    
    // Update Header Controls
    if (addTagihanBtn) addTagihanBtn.classList.remove("hidden");
    if (filterContainer) filterContainer.classList.remove("hidden");
    if (addPembayaranBtn) addPembayaranBtn.classList.add("hidden");
  };

  tabTagihan.addEventListener("click", () => setActive("tagihan"));
  tabPembayaran.addEventListener("click", () => setActive("pembayaran"));
  
  // Default State
  setActive("tagihan");
})();