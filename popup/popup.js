// LeadGrid Popup Controller

document.addEventListener("DOMContentLoaded", async () => {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const exportBtn = document.getElementById("exportBtn");
  const clearBtn = document.getElementById("clearBtn");
  const maxLeadsInput = document.getElementById("maxLeadsInput");
  const enrichEmailsToggle = document.getElementById("enrichEmailsToggle");
  const gridPanToggle = document.getElementById("gridPanToggle");

  const statLeads = document.getElementById("statLeads");
  const statPhones = document.getElementById("statPhones");
  const statEmails = document.getElementById("statEmails");
  const statusLabel = document.getElementById("statusLabel");
  const statusCounter = document.getElementById("statusCounter");
  const progressFill = document.getElementById("progressFill");

  const planBadge = document.getElementById("planBadge");
  const licenseStatus = document.getElementById("licenseStatus");
  const toggleLicenseBtn = document.getElementById("toggleLicenseBtn");
  const licenseModal = document.getElementById("licenseModal");
  const licenseKeyInput = document.getElementById("licenseKeyInput");
  const activateLicenseBtn = document.getElementById("activateLicenseBtn");

  // Load existing state from storage
  const state = await chrome.storage.local.get([
    "leads",
    "isScraping",
    "isPro",
    "maxLeads",
    "enrichEmails",
    "gridPan"
  ]);

  let leads = state.leads || [];
  let isScraping = state.isScraping || false;
  let isPro = state.isPro || false;

  if (state.maxLeads) maxLeadsInput.value = state.maxLeads;
  if (state.enrichEmails !== undefined) enrichEmailsToggle.checked = state.enrichEmails;
  if (state.gridPan !== undefined) gridPanToggle.checked = state.gridPan;

  updateStats(leads);
  updateProStatus(isPro);
  updateScrapingUI(isScraping);

  // Toggle License modal
  toggleLicenseBtn.addEventListener("click", () => {
    licenseModal.style.display = licenseModal.style.display === "block" ? "none" : "block";
  });

  // Activate License Key
  activateLicenseBtn.addEventListener("click", async () => {
    const key = licenseKeyInput.value.trim();
    if (key.length >= 6) {
      await chrome.storage.local.set({ isPro: true, licenseKey: key });
      updateProStatus(true);
      licenseModal.style.display = "none";
      alert("License activated! Unlimited scraping unlocked.");
    } else {
      alert("Please enter a valid license key.");
    }
  });

  // Start Scraping
  startBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !tab.url.includes("google.com/maps")) {
      alert("Please navigate to Google Maps (e.g. search for 'Plumbers in Austin') first!");
      return;
    }

    const maxLeads = parseInt(maxLeadsInput.value, 10) || 50;
    const enrichEmails = enrichEmailsToggle.checked;
    const gridPan = gridPanToggle.checked;

    // Check free limit
    if (!isPro && maxLeads > 25) {
      alert("Free plan is limited to 25 leads. Upgrade to Pro for unlimited exports! Setting to 25.");
      maxLeadsInput.value = 25;
    }

    await chrome.storage.local.set({
      isScraping: true,
      maxLeads: parseInt(maxLeadsInput.value, 10),
      enrichEmails,
      gridPan
    });

    updateScrapingUI(true);

    chrome.tabs.sendMessage(tab.id, {
      action: "START_SCRAPING",
      maxLeads: parseInt(maxLeadsInput.value, 10),
      enrichEmails,
      gridPan
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script might need to be injected manually
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content/maps_scraper.js"]
        }, () => {
          chrome.tabs.sendMessage(tab.id, {
            action: "START_SCRAPING",
            maxLeads: parseInt(maxLeadsInput.value, 10),
            enrichEmails,
            gridPan
          });
        });
      }
    });
  });

  // Stop Scraping
  stopBtn.addEventListener("click", async () => {
    await chrome.storage.local.set({ isScraping: false });
    updateScrapingUI(false);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: "STOP_SCRAPING" });
    }
  });

  // Export to CSV
  exportBtn.addEventListener("click", async () => {
    const { leads = [] } = await chrome.storage.local.get("leads");
    if (leads.length === 0) {
      alert("No leads to export yet!");
      return;
    }

    downloadCSV(leads);
  });

  // Clear Collected Data
  clearBtn.addEventListener("click", async () => {
    if (confirm("Are you sure you want to clear all collected leads?")) {
      await chrome.storage.local.set({ leads: [], isScraping: false });
      leads = [];
      updateStats([]);
      updateScrapingUI(false);
    }
  });

  // Listen for progress messages from content script & background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "UPDATE_PROGRESS") {
      leads = message.leads || [];
      updateStats(leads);
      if (message.statusText) {
        statusLabel.textContent = message.statusText;
      }
    } else if (message.type === "SCRAPING_COMPLETED") {
      updateScrapingUI(false);
      statusLabel.textContent = "Extraction Complete!";
      progressFill.style.width = "100%";
      alert(`Scraping complete! Successfully extracted ${message.total} leads.`);
    }
  });

  function updateStats(currentLeads) {
    const total = currentLeads.length;
    const phones = currentLeads.filter(l => l.phone).length;
    const emails = currentLeads.filter(l => l.email).length;

    statLeads.textContent = total;
    statPhones.textContent = phones;
    statEmails.textContent = emails;

    const max = parseInt(maxLeadsInput.value, 10) || 50;
    statusCounter.textContent = `${total} / ${max}`;

    const percent = Math.min(100, Math.round((total / max) * 100));
    progressFill.style.width = `${percent}%`;

    exportBtn.disabled = total === 0;
  }

  function updateScrapingUI(scraping) {
    if (scraping) {
      startBtn.style.display = "none";
      stopBtn.style.display = "flex";
      statusLabel.textContent = "Extracting leads & scrolling...";
    } else {
      startBtn.style.display = "flex";
      stopBtn.style.display = "none";
      statusLabel.textContent = "Ready to extract";
    }
  }

  function updateProStatus(pro) {
    isPro = pro;
    if (pro) {
      planBadge.textContent = "PRO UNLIMITED";
      planBadge.style.background = "#10b981";
      licenseStatus.textContent = "PRO License Active. Unlimited extraction.";
      toggleLicenseBtn.style.display = "none";
    } else {
      planBadge.textContent = "FREE TIER";
      planBadge.style.background = "#3b82f6";
      licenseStatus.textContent = "Free plan limits to 25 leads.";
      toggleLicenseBtn.style.display = "inline";
    }
  }

  function downloadCSV(data) {
    const headers = [
      "Company Name",
      "Category",
      "Phone",
      "Website",
      "Email (Enriched)",
      "Facebook",
      "Instagram",
      "LinkedIn",
      "Full Address",
      "Rating",
      "Review Count",
      "Google Maps URL"
    ];

    const rows = data.map(lead => [
      escapeCSV(lead.name || ""),
      escapeCSV(lead.category || ""),
      escapeCSV(lead.phone || ""),
      escapeCSV(lead.website || ""),
      escapeCSV(lead.email || ""),
      escapeCSV(lead.facebook || ""),
      escapeCSV(lead.instagram || ""),
      escapeCSV(lead.linkedin || ""),
      escapeCSV(lead.address || ""),
      escapeCSV(lead.rating || ""),
      escapeCSV(lead.reviewsCount || ""),
      escapeCSV(lead.url || "")
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_gmaps_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function escapeCSV(str) {
    if (typeof str !== "string") str = String(str);
    return `"${str.replace(/"/g, '""')}"`;
  }
});
