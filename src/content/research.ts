export interface ResearchResult {
  url: string;
}

export interface ResearchPage {
  results: ResearchResult[];
}

function isGoogleHost(host: string): boolean {
  const normalized = host.toLowerCase().replace(/^www\./, "");
  return normalized === "google.com" || /^google\.[a-z]{2,3}(?:\.[a-z]{2})?$/.test(normalized);
}

function unwrapResultUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl, location.href);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (isGoogleHost(host) && url.pathname === "/url") {
      const destination = url.searchParams.get("q") ?? url.searchParams.get("url");
      return destination ? new URL(destination).href : null;
    }
    if (host === "duckduckgo.com" && url.pathname === "/l/") {
      const destination = url.searchParams.get("uddg");
      return destination ? new URL(destination).href : null;
    }
    if (host === "bing.com" && url.pathname.startsWith("/ck/")) {
      const destination = url.searchParams.get("url");
      return destination ? new URL(destination).href : null;
    }

    if (isGoogleHost(host) || host === "bing.com" || host === "duckduckgo.com") return null;
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.href;
  } catch {
    return null;
  }
}

function resultFromCard(card: HTMLElement): ResearchResult | null {
  // Use the result heading only to locate its destination; never read its text.
  const heading = card.querySelector("h2, h3, a[data-testid='result-title-a']");
  const anchor = (heading instanceof HTMLAnchorElement ? heading : heading?.closest("a[href]")) ??
    card.querySelector("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;

  const url = unwrapResultUrl(anchor.href);
  return url ? { url } : null;
}

/** Read only destination URLs from supported search-result cards. */
export function readResearchPage(): ResearchPage | null {
  const pageUrl = new URL(location.href);
  const host = pageUrl.hostname.toLowerCase().replace(/^www\./, "");
  let cards: NodeListOf<HTMLElement> | null = null;

  if (isGoogleHost(host) && pageUrl.pathname === "/search" && pageUrl.searchParams.has("q")) {
    cards = document.querySelectorAll<HTMLElement>("#search .MjjYud, #search .g");
  } else if (host === "bing.com" && pageUrl.pathname === "/search" && pageUrl.searchParams.has("q")) {
    cards = document.querySelectorAll<HTMLElement>("#b_results li.b_algo");
  } else if (host === "duckduckgo.com" && pageUrl.searchParams.has("q")) {
    cards = document.querySelectorAll<HTMLElement>("[data-testid='result'], .result.results_links");
  }

  if (!cards?.length) return null;
  const results = [...cards]
    .map(resultFromCard)
    .filter((result): result is ResearchResult => result !== null);
  return results.length > 0 ? { results } : null;
}
