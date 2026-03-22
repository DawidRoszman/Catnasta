const defaultApiUrl = "https://catnasta-api.dawidroszman.eu";

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL ?? defaultApiUrl;
  }
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? defaultApiUrl;
}

export const api = getApiBaseUrl();
