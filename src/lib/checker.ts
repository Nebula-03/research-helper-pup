import type { CheckResponse } from "../shared/messages";

const KNOWN_SAFE_DOMAINS = [
  "google.com", "youtube.com", "github.com", "wikipedia.org",
  "stackoverflow.com", "reddit.com", "twitter.com", "x.com",
  "linkedin.com", "microsoft.com", "apple.com", "amazon.com",
];

const RISKY_TLDS = [".xyz", ".top", ".click", ".gq", ".ml", ".cf", ".tk"];

const SHORTENERS = [
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly",
  "is.gd", "buff.ly", "rebrand.ly",
];

export function runHeuristics(urlString: string): CheckResponse {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { verdict: "unknown", reason: "Could not parse URL" };
  }

  const host = url.hostname.toLowerCase();

  // Strip www
  const domain = host.startsWith("www.") ? host.slice(4) : host;

  // Known safe
  if (KNOWN_SAFE_DOMAINS.some((d) => domain === d || domain.endsWith("." + d))) {
    return { verdict: "safe", reason: "Trusted domain" };
  }

  // URL shortener — destination is hidden
  if (SHORTENERS.includes(domain)) {
    return { verdict: "unknown", reason: "URL shortener — destination hidden" };
  }

  const flags: string[] = [];

  // Not HTTPS
  if (url.protocol !== "https:") flags.push("Not HTTPS");

  // IP address host
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) flags.push("IP address host");

  // Credentials in URL
  if (url.username || url.password) flags.push("Credentials in URL");

  // Too many subdomains
  if (host.split(".").length > 4) flags.push("Too many subdomains");

  // Risky TLD
  if (RISKY_TLDS.some((tld) => domain.endsWith(tld))) flags.push("Risky TLD");

  // Very long hostname
  if (host.length > 40) flags.push("Suspiciously long hostname");

  // @ sign in URL (classic phishing trick)
  if (urlString.includes("@")) flags.push("@ sign in URL");

  if (flags.length === 0) {
    return { verdict: "safe", reason: "No red flags found" };
  }

  if (flags.length >= 2) {
    return { verdict: "unsafe", reason: flags.join(", ") };
  }

  return { verdict: "unknown", reason: flags[0] };
}