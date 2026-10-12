// Client-Side Deep Email & Social Link Enricher
// Fetches business websites directly from the browser, bypassing third-party API costs.

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const IGNORED_DOMAINS = [
  "sentry.io", "wixpress.com", "example.com", "domain.com", "wix.com",
  "googleapis.com", "schema.org", "cloudflare.com", "2x.png", "jpg", "png"
];

const SOCIAL_PATTERNS = {
  facebook: /https?:\/\/(www\.)?facebook\.com\/([A-Za-z0-9_.-]+)/i,
  instagram: /https?:\/\/(www\.)?instagram\.com\/([A-Za-z0-9_.-]+)/i,
  linkedin: /https?:\/\/(www\.)?linkedin\.com\/(company|in)\/([A-Za-z0-9_.-]+)/i
};

async function fetchWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "text/html,application/xhtml+xml",
        "User-Agent": navigator.userAgent
      }
    });
    clearTimeout(id);
    if (!response.ok) return null;
    return await response.text();
  } catch (err) {
    clearTimeout(id);
    return null;
  }
}

function extractEmails(html) {
  if (!html) return [];
  const found = html.match(EMAIL_REGEX) || [];
  const clean = [];

  for (const email of found) {
    const lower = email.toLowerCase();
    const parts = lower.split("@");
    if (parts.length !== 2) continue;
    const domain = parts[1];

    // Filter common junk
    if (IGNORED_DOMAINS.some(d => domain.includes(d))) continue;
    if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".webp")) continue;

    if (!clean.includes(lower)) {
      clean.push(lower);
    }
  }

  return clean;
}

function extractSocials(html) {
  const socials = { facebook: "", instagram: "", linkedin: "" };
  if (!html) return socials;

  for (const [platform, regex] of Object.entries(SOCIAL_PATTERNS)) {
    const match = html.match(regex);
    if (match && match[0]) {
      socials[platform] = match[0];
    }
  }

  return socials;
}

export async function enrichLeadContactInfo(websiteUrl) {
  const result = {
    email: "",
    facebook: "",
    instagram: "",
    linkedin: ""
  };

  if (!websiteUrl || !websiteUrl.startsWith("http")) {
    return result;
  }

  try {
    const parsedUrl = new URL(websiteUrl);
    const origin = parsedUrl.origin;

    // 1. Fetch homepage
    let html = await fetchWithTimeout(websiteUrl);
    let emails = extractEmails(html);
    let socials = extractSocials(html);

    // 2. If no email on homepage, probe /contact or /about
    if (emails.length === 0) {
      const contactUrl = `${origin}/contact`;
      const contactHtml = await fetchWithTimeout(contactUrl);
      if (contactHtml) {
        emails = extractEmails(contactHtml);
        if (!socials.facebook || !socials.instagram || !socials.linkedin) {
          const contactSocials = extractSocials(contactHtml);
          socials.facebook = socials.facebook || contactSocials.facebook;
          socials.instagram = socials.instagram || contactSocials.instagram;
          socials.linkedin = socials.linkedin || contactSocials.linkedin;
        }
      }
    }

    if (emails.length > 0) {
      // Prioritize info@, contact@, hello@ or first valid email
      const priorityEmail = emails.find(e =>
        e.startsWith("info@") || e.startsWith("contact@") || e.startsWith("hello@") || e.startsWith("sales@")
      );
      result.email = priorityEmail || emails[0];
    }

    result.facebook = socials.facebook;
    result.instagram = socials.instagram;
    result.linkedin = socials.linkedin;

  } catch (e) {
    // Graceful fallback on network/cross-origin errors
  }

  return result;
}
