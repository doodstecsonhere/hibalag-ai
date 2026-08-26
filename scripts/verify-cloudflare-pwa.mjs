import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(root, ".output/public");
const wranglerPath = resolve(root, ".output/server/wrangler.json");

const requiredFiles = [
  "sw.js",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "maskable-icon-512.png",
];

for (const file of requiredFiles) {
  await access(resolve(publicDir, file));
}

const sw = await readFile(resolve(publicDir, "sw.js"), "utf8");
if (!/(?:url:)?["']\/["']/.test(sw)) {
  throw new Error("sw.js does not precache the SSR home document for offline navigation.");
}
const workboxMatch = sw.match(/["'](?:\.\/)?(workbox-[A-Za-z0-9_-]+)(?:\.js)?["']/);
if (!workboxMatch) {
  throw new Error("sw.js does not reference a generated Workbox runtime.");
}
await access(resolve(publicDir, `${workboxMatch[1]}.js`));

const manifest = JSON.parse(await readFile(resolve(publicDir, "manifest.webmanifest"), "utf8"));
for (const icon of manifest.icons ?? []) {
  const path = String(icon.src ?? "").replace(/^\//, "");
  if (!path) throw new Error("The web manifest contains an icon without a path.");
  await access(resolve(publicDir, path));
}

const wrangler = JSON.parse(await readFile(wranglerPath, "utf8"));
const assetDirectory = resolve(dirname(wranglerPath), wrangler.assets?.directory ?? "");
if (assetDirectory !== publicDir) {
  throw new Error(`Wrangler assets resolve to ${assetDirectory}, expected ${publicDir}.`);
}

console.log(`Cloudflare PWA artifact verified (${requiredFiles.length + 1} required files).`);
