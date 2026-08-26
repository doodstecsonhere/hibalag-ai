import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * A Lovable-independent build path kept alongside the existing Lovable config.
 * It deliberately does not load Lovable's Vite wrapper, MCP route generator,
 * preview bridge, telemetry, or asset proxy. Committed MCP routes remain part
 * of the app until their removal is separately reviewed.
 */
export default defineConfig(({ command }) => ({
  css: { transformer: "lightningcss" },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  server: { host: "::", port: 8080 },
  plugins: [
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      server: { entry: "server" },
    }),
    ...(command === "build"
      ? [
          nitro({
            defaultPreset: "cloudflare-module",
            compatibilityDate: "2026-08-26",
            cloudflare: {
              deployConfig: true,
              nodeCompat: true,
              wrangler: {
                name: "hibalag-ai",
                workers_dev: true,
                preview_urls: true,
              },
            },
          }),
        ]
      : []),
    react(),
    {
      name: "hibalag-tanstack-basepath",
      enforce: "pre",
      transform(code, id) {
        if (id.includes("@tanstack/start-client-core") && id.includes("hydrateStart.js")) {
          return code.replaceAll("process.env.TSS_ROUTER_BASEPATH", JSON.stringify("/"));
        }
        return null;
      },
    },
    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      injectRegister: null,
      devOptions: { enabled: false },
      filename: "sw.js",
      outDir: ".output/public",
      manifest: {
        id: "/",
        name: "Hibalag AI",
        short_name: "Hibalag AI",
        description:
          "Your Bisaya-speaking guide to Silliman University's 125th Founders Day and the Hibalag Festival, August 2026.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#990000",
        background_color: "#990000",
        categories: ["education", "events", "lifestyle"],
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "/maskable-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        additionalManifestEntries: [{ url: "/", revision: null }],
        globPatterns: [
          "**/*.{js,css,html,svg,png,ico,jpg,jpeg,webp,woff,woff2,json,webmanifest,txt}",
        ],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: undefined,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "hibalag-pages",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 },
              plugins: [
                {
                  handlerDidError: async () => {
                    const cache = await caches.open("hibalag-pages");
                    return (
                      (await cache.match("/", { ignoreSearch: true })) ??
                      (await cache.match(new Request("/"), { ignoreSearch: true })) ??
                      Response.error()
                    );
                  },
                },
              ],
            },
          },
          {
            urlPattern: ({ url }: { url: URL }) =>
              url.origin === self.location.origin &&
              /\.(?:js|css|woff2|png|svg|ico)$/.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "hibalag-assets",
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }: { url: URL }) =>
              url.hostname.endsWith(".supabase.co") && url.pathname.includes("schedule_context"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "hibalag-schedule",
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }: { url: URL }) => url.hostname === "fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "hibalag-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
}));
