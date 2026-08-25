const CURRENT_PUBLIC_URL = "https://hibalag-ai.lovable.app";

/**
 * Set VITE_PUBLIC_APP_URL when an independent public domain is approved.
 * Until then, canonical metadata must continue to point at the live site.
 */
export const PUBLIC_APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL || CURRENT_PUBLIC_URL).replace(
  /\/$/,
  "",
);

export function appUrl(path = "/") {
  return new URL(path, `${PUBLIC_APP_URL}/`).toString();
}
