let blockedDomains = new Set<string>();
let loaded = false;

export async function loadBlocklist(): Promise<void> {
  if (loaded) return;
  try {
    const url = chrome.runtime.getURL("data/blocklist.json");
    const res = await fetch(url);
    const domains: string[] = await res.json();
    blockedDomains = new Set(domains);
    loaded = true;
  } catch {
    blockedDomains = new Set();
    loaded = true;
  }
}

export function isBlocked(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return blockedDomains.has(host);
  } catch {
    return false;
  }
}