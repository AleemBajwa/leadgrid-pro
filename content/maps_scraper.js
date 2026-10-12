// LeadGrid Google Maps In-DOM Scraper & Grid Panner
// Runs directly inside https://www.google.com/maps/*

let isScraping = false;
let maxLeads = 50;
let enrichEmails = true;
let gridPan = true;
let extractedLeads = new Map(); // Keyed by place URL / name to deduplicate

console.log("[LeadGrid] Content script loaded on Google Maps.");

// Listen for commands from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_SCRAPING") {
    maxLeads = request.maxLeads || 50;
    enrichEmails = request.enrichEmails !== false;
    gridPan = request.gridPan !== false;
    isScraping = true;
    console.log(`[LeadGrid] Starting scrape. Target: ${maxLeads} leads. Enrich: ${enrichEmails}. GridPan: ${gridPan}`);
    startScraperEngine();
    sendResponse({ status: "STARTED" });
  } else if (request.action === "STOP_SCRAPING") {
    isScraping = false;
    console.log("[LeadGrid] Stopping scrape.");
    sendResponse({ status: "STOPPED" });
  }
});

async function startScraperEngine() {
  const feed = findFeedContainer();
  if (!feed) {
    alert("Could not locate the Google Maps results list. Please perform a search (e.g. 'Dentists in Dallas') first!");
    isScraping = false;
    return;
  }

  // Load any previously saved leads
  const data = await chrome.storage.local.get("leads");
  if (data.leads && Array.isArray(data.leads)) {
    data.leads.forEach(l => extractedLeads.set(l.url || l.name, l));
  }

  let consecutiveEmptyScrolls = 0;

  while (isScraping && extractedLeads.size < maxLeads) {
    const cards = Array.from(feed.querySelectorAll('div[role="article"], div.fontHeadlineSmall, a.hfpxzc'));
    let newItemsFoundInPass = 0;

    for (const card of cards) {
      if (!isScraping || extractedLeads.size >= maxLeads) break;

      const lead = parseListingFromFeed(card);
      if (lead && lead.name && !extractedLeads.has(lead.url || lead.name)) {
        // Need deeper details? Click to open pane
        if (!lead.phone || !lead.website) {
          const fullLead = await inspectListingDetails(card, lead);
          extractedLeads.set(fullLead.url || fullLead.name, fullLead);
        } else {
          extractedLeads.set(lead.url || lead.name, lead);
        }

        newItemsFoundInPass++;
        await syncProgress();
      }
    }

    // Scroll down to load more items
    const prevHeight = feed.scrollHeight;
    feed.scrollBy(0, 1000);
    await delay(1200);

    // Check if feed is stuck or reached the 120-cap
    if (feed.scrollHeight === prevHeight || hasReachedEnd()) {
      consecutiveEmptyScrolls++;
      if (consecutiveEmptyScrolls >= 3) {
        if (gridPan && extractedLeads.size < maxLeads) {
          console.log("[LeadGrid] Reached end of current view. Triggering Grid-Pan shift...");
          updateStatusText("Auto-panning map to next grid zone...");
          await panMapAndReSearch();
          consecutiveEmptyScrolls = 0;
          await delay(2500);
        } else {
          console.log("[LeadGrid] Reached end of results list.");
          break;
        }
      }
    } else {
      consecutiveEmptyScrolls = 0;
    }
  }

  isScraping = false;
  await syncProgress(true);
  chrome.runtime.sendMessage({
    type: "SCRAPING_COMPLETED",
    total: extractedLeads.size
  });
}

function findFeedContainer() {
  return document.querySelector('div[role="feed"]') ||
         document.querySelector('div[aria-label*="Results for"]') ||
         document.querySelector('div.m6QErb.DxyBCb.kA9KIf.dS8AEf');
}

function hasReachedEnd() {
  const text = document.body.innerText;
  return text.includes("You've reached the end of the list") || text.includes("No more results");
}

function parseListingFromFeed(element) {
  // If element is the link itself (a.hfpxzc)
  const link = element.tagName === "A" && element.classList.contains("hfpxzc")
    ? element
    : element.closest('div[role="article"]')?.querySelector('a.hfpxzc') || element.querySelector('a.hfpxzc');

  if (!link) return null;

  const url = link.href || "";
  const name = link.getAttribute("aria-label") || link.innerText.trim();

  // Try extracting basic details from text snippet
  const container = link.closest('div[role="article"]') || link.parentElement;
  const fullText = container ? container.innerText : "";

  // Extract Rating (e.g. 4.8)
  const ratingMatch = fullText.match(/\b([1-5]\.[0-9])\b/);
  const rating = ratingMatch ? ratingMatch[1] : "";

  // Extract Reviews Count (e.g. (124))
  const reviewsMatch = fullText.match(/\(([0-9,]+)\)/);
  const reviewsCount = reviewsMatch ? reviewsMatch[1].replace(/,/g, "") : "";

  // Extract Phone Number Regex
  const phoneMatch = fullText.match(/(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})/);
  const phone = phoneMatch ? phoneMatch[0] : "";

  return {
    name,
    url,
    rating,
    reviewsCount,
    category: "",
    address: "",
    phone,
    website: "",
    email: "",
    facebook: "",
    instagram: "",
    linkedin: ""
  };
}

async function inspectListingDetails(anchorElement, baseLead) {
  try {
    anchorElement.click();
    await delay(700);

    // Look for details panel
    const sidePane = document.querySelector('div.m6QErb[role="main"]') || document.body;

    // Category
    const catBtn = sidePane.querySelector('button[jsaction*="category"]');
    if (catBtn) baseLead.category = catBtn.innerText.trim();

    // Address
    const addrBtn = sidePane.querySelector('button[data-item-id*="address"]');
    if (addrBtn) baseLead.address = addrBtn.innerText.replace(/[\n\r]+/g, " ").trim();

    // Phone
    const phoneBtn = sidePane.querySelector('button[data-item-id*="phone"]');
    if (phoneBtn) {
      const match = phoneBtn.innerText.match(/(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})/);
      if (match) baseLead.phone = match[0];
    }

    // Website
    const webBtn = sidePane.querySelector('a[data-item-id*="authority"]');
    if (webBtn) {
      baseLead.website = webBtn.href;
    }

    // Deep Email Enrichment (if toggled)
    if (enrichEmails && baseLead.website) {
      updateStatusText(`Enriching email for: ${baseLead.name}...`);
      const enriched = await requestBackgroundEnrichment(baseLead.website);
      if (enriched) {
        baseLead.email = enriched.email || "";
        baseLead.facebook = enriched.facebook || "";
        baseLead.instagram = enriched.instagram || "";
        baseLead.linkedin = enriched.linkedin || "";
      }
    }
  } catch (err) {
    console.error("[LeadGrid] Error inspecting card:", err);
  }

  return baseLead;
}

// Request background service worker to fetch website and extract emails/socials
function requestBackgroundEnrichment(websiteUrl) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: "ENRICH_WEBSITE",
      url: websiteUrl
    }, (response) => {
      if (chrome.runtime.lastError || !response) {
        resolve(null);
      } else {
        resolve(response.data);
      }
    });
  });
}

// Pans map canvas to trigger new search zone (bypasses 120-cap)
async function panMapAndReSearch() {
  const canvas = document.querySelector('canvas.widget-scene-canvas') || document.querySelector('#scene');
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    // Simulate drag gesture
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: startX, clientY: startY, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: startX + 200, clientY: startY + 150, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    await delay(1000);

    // Click "Search this area" button if it appears
    const searchAreaBtn = Array.from(document.querySelectorAll('button')).find(
      b => b.innerText.includes("Search this area") || b.getAttribute("aria-label")?.includes("Search this area")
    );

    if (searchAreaBtn) {
      searchAreaBtn.click();
      console.log("[LeadGrid] Clicked 'Search this area'.");
    }
  }
}

async function syncProgress(isDone = false) {
  const leadArray = Array.from(extractedLeads.values());
  await chrome.storage.local.set({ leads: leadArray, isScraping: !isDone });

  chrome.runtime.sendMessage({
    type: "UPDATE_PROGRESS",
    leads: leadArray,
    statusText: isDone ? "Finished" : `Scraped ${leadArray.length} of ${maxLeads} leads...`
  });
}

function updateStatusText(text) {
  chrome.runtime.sendMessage({
    type: "UPDATE_PROGRESS",
    leads: Array.from(extractedLeads.values()),
    statusText: text
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
