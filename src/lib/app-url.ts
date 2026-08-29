const PRIMARY_PUBLIC_URL = "https://hibalag-ai.pages.dev";

/**
 * Override this only for an explicitly approved environment-specific canonical URL.
 */
export const PUBLIC_APP_URL = (import.meta.env?.VITE_PUBLIC_APP_URL || PRIMARY_PUBLIC_URL).replace(
  /\/$/,
  "",
);

export function authRedirectUrl(origin: string) {
  return new URL(origin).origin;
}

export function appUrl(path = "/") {
  return new URL(path, `${PUBLIC_APP_URL}/`).toString();
}
