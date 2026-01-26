(() => {
  const tabTagihan = document.getElementById("tabTagihan");
  const tabPembayaran = document.getElementById("tabPembayaran");
  const tagihanSection = document.getElementById("tagihanSection");
  const pembayaranSection = document.getElementById("pembayaranSection");
  const addTagihanBtn = document.getElementById("addTagihanBtn");
  const addPembayaranBtn = document.getElementById("addPembayaranBtn");
  const tagihanSearch = document.getElementById("tagihanSearch");
  const tagihanFilter = document.getElementById("tagihanFilter");

  if (!tabTagihan || !tabPembayaran || !tagihanSection || !pembayaranSection) return;

  const setActive = (active) => {
    if (active === "pembayaran") {
      tagihanSection.classList.add("hidden");
      pembayaranSection.classList.remove("hidden");
      tabTagihan.className = "icon-button";
      tabPembayaran.className = "primary-button";
      tabTagihan.style.padding = "6px 14px";
      tabPembayaran.style.padding = "6px 14px";
      tabPembayaran.style.fontSize = "12px";
      tabTagihan.style.fontSize = "12px";
      if (addTagihanBtn) addTagihanBtn.classList.add("hidden");
      if (tagihanSearch) tagihanSearch.parentElement.classList.add("hidden");
      if (tagihanFilter) tagihanFilter.classList.add("hidden");
      if (addPembayaranBtn) addPembayaranBtn.classList.remove("hidden");
      return;
    }
    pembayaranSection.classList.add("hidden");
    tagihanSection.classList.remove("hidden");
    tabPembayaran.className = "icon-button";
    tabTagihan.className = "primary-button";
    tabTagihan.style.padding = "6px 14px";
    tabPembayaran.style.padding = "6px 14px";
    tabPembayaran.style.fontSize = "12px";
    tabTagihan.style.fontSize = "12px";
    if (addTagihanBtn) addTagihanBtn.classList.remove("hidden");
    if (tagihanSearch) tagihanSearch.parentElement.classList.remove("hidden");
    if (tagihanFilter) tagihanFilter.classList.remove("hidden");
    if (addPembayaranBtn) addPembayaranBtn.classList.add("hidden");
  };

  tabTagihan.addEventListener("click", () => setActive("tagihan"));
  tabPembayaran.addEventListener("click", () => setActive("pembayaran"));
  setActive("tagihan");
})();
