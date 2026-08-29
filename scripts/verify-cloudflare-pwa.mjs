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
if ("pages_build_output_dir" in wrangler) {
  throw new Error("Worker Wrangler config must not contain the Pages-only build output field.");
}
const assetDirectory = resolve(dirname(wranglerPath), wrangler.assets?.directory ?? "");
if (assetDirectory !== publicDir) {
  throw new Error(`Wrangler assets resolve to ${assetDirectory}, expected ${publicDir}.`);
}
if (wrangler.ai?.binding !== "AI") throw new Error("Worker AI binding is missing.");
const quotaBinding = wrangler.durable_objects?.bindings?.find(
  (binding) => binding.name === "AI_QUOTA",
);
if (quotaBinding?.class_name !== "HibalagAiQuota") {
  throw new Error("Worker quota Durable Object binding is missing.");
}
if (wrangler.vars?.AI_ENABLED !== "false") {
  throw new Error("Worker AI must be packaged disabled by default.");
}
await access(resolve(dirname(wranglerPath), "hibalag-ai-quota.mjs"));
const workerEntry = await readFile(resolve(dirname(wranglerPath), "index.mjs"), "utf8");
if (!workerEntry.includes('export { HibalagAiQuota } from "./hibalag-ai-quota.mjs";')) {
  throw new Error("Worker entry does not export the quota Durable Object.");
}

console.log(
  `Cloudflare PWA and disabled-AI artifact verified (${requiredFiles.length + 2} required files).`,
);
