import type { CheckResponse } from "../shared/messages";

const cache = new Map<string, CheckResponse>();

export function getCached(url: string): CheckResponse | undefined {
  return cache.get(url);
}

export function setCached(url: string, result: CheckResponse): void {
  cache.set(url, result);
}