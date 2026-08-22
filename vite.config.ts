// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
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
      // mcp-js 0.26.2 compares Vite's normalized root (`C:/...`) with a
      // Windows-native route path (`C:\\...`) and aborts startup. The generated
      // MCP routes are committed, so Windows previews can safely use them
      // without running the route generator. Lovable/Linux behavior is unchanged.
      ...(process.platform === "win32" ? [] : [mcpPlugin()]),
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        // The guarded wrapper in src/lib/pwa.ts is the only registrar.
        injectRegister: null,
        devOptions: { enabled: false },
        filename: "sw.js",
        // TanStack Start emits the browser build into dist/client; without this the
        // worker and its precache manifest land in the wrong directory.
        outDir: "dist/client",
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
          globPatterns: [
            "**/*.{js,css,html,svg,png,ico,jpg,jpeg,webp,woff,woff2,json,webmanifest,txt}",
          ],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          // No prerendered HTML exists to precache (SSR), so navigations are
          // handled by the NetworkFirst route below with an app-shell fallback.
          navigateFallback: undefined,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // HTML navigations must never be served cache-first.
              urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "hibalag-pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 },
                plugins: [
                  {
                    // Offline navigation to any route falls back to the cached
                    // app shell so the SPA router can render it locally.
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
                url.origin === self.location.origin && /\.(?:js|css|woff2|png|svg|ico)$/.test(url.pathname),
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
  },
});
