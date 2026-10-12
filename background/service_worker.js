// LeadGrid Background Service Worker (Manifest V3)
// Handles website fetching & contact enrichment without CORS restrictions.

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const IGNORED_DOMAINS = [
  "sentry.io", "wixpress.com", "example.com", "domain.com", "wix.com",
  "googleapis.com", "schema.org", "cloudflare.com", "2x.png", "jpg", "png", "webp"
];

const SOCIAL_PATTERNS = {
  facebook: /https?:\/\/(www\.)?facebook\.com\/([A-Za-z0-9_.-]+)/i,
  instagram: /https?:\/\/(www\.)?instagram\.com\/([A-Za-z0-9_.-]+)/i,
  linkedin: /https?:\/\/(www\.)?linkedin\.com\/(company|in)\/([A-Za-z0-9_.-]+)/i
};

chrome.runtime.onInstalled.addListener(() => {
  console.log("[LeadGrid] Service Worker Installed.");
  chrome.storage.local.get(["leads", "isPro"], (res) => {
    if (!res.leads) chrome.storage.local.set({ leads: [] });
    if (res.isPro === undefined) chrome.storage.local.set({ isPro: false });
  });
});

// Message hub
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ENRICH_WEBSITE") {
    enrichWebsite(request.url).then((data) => {
      sendResponse({ status: "OK", data });
    }).catch(() => {
      sendResponse({ status: "ERROR", data: null });
    });
    return true; // Keep channel open for async response
  }
});

async function enrichWebsite(url) {
  const result = { email: "", facebook: "", instagram: "", linkedin: "" };
  if (!url || !url.startsWith("http")) return result;

  try {
    const origin = new URL(url).origin;

    // 1. Fetch homepage
    let html = await safeFetch(url, 4500);
    let emails = extractEmails(html);
    let socials = extractSocials(html);

    // 2. If no email, check /contact or /about
    if (emails.length === 0) {
      const contactHtml = await safeFetch(`${origin}/contact`, 4000);
      if (contactHtml) {
        emails = extractEmails(contactHtml);
        const contactSocials = extractSocials(contactHtml);
        socials.facebook = socials.facebook || contactSocials.facebook;
        socials.instagram = socials.instagram || contactSocials.instagram;
        socials.linkedin = socials.linkedin || contactSocials.linkedin;
      }
    }

    if (emails.length > 0) {
      const priority = emails.find(e =>
        e.startsWith("info@") || e.startsWith("contact@") || e.startsWith("hello@") || e.startsWith("sales@")
      );
      result.email = priority || emails[0];
    }

    result.facebook = socials.facebook || "";
    result.instagram = socials.instagram || "";
    result.linkedin = socials.linkedin || "";

  } catch (err) {
    // Fail silently on unreachable sites
  }

  return result;
}

async function safeFetch(targetUrl, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "Accept": "text/html,application/xhtml+xml"
      }
    });
    clearTimeout(id);
    if (!resp.ok) return null;
    return await resp.text();
  } catch (e) {
    clearTimeout(id);
    return null;
  }
}

function extractEmails(html) {
  if (!html) return [];
  const matches = html.match(EMAIL_REGEX) || [];
  const clean = [];

  for (const m of matches) {
    const lower = m.toLowerCase();
    const domain = lower.split("@")[1];
    if (!domain) continue;

    if (IGNORED_DOMAINS.some(d => domain.includes(d))) continue;
    if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) continue;

    if (!clean.includes(lower)) {
      clean.push(lower);
    }
  }

  return clean;
}

function extractSocials(html) {
  const socials = { facebook: "", instagram: "", linkedin: "" };
  if (!html) return socials;

  for (const [key, regex] of Object.entries(SOCIAL_PATTERNS)) {
    const match = html.match(regex);
    if (match && match[0]) {
      socials[key] = match[0];
    }
  }

  return socials;
}
