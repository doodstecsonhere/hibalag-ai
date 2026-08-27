import { access, readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pagesDir = resolve(root, ".output/pages");
const workerDir = resolve(pagesDir, "_worker.js");
const workerEntry = resolve(workerDir, "index.js");

const requiredFiles = [
  "_worker.js/index.js",
  "sw.js",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "maskable-icon-512.png",
];

for (const file of requiredFiles) await access(resolve(pagesDir, file));

try {
  await access(resolve(root, ".wrangler/deploy/config.json"));
  throw new Error("Nitro's Worker deployment redirect must be removed for Pages commands.");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const configText = await readFile(resolve(root, "wrangler.jsonc"), "utf8");
const config = JSON.parse(configText.replace(/,\s*([}\]])/g, "$1"));
if (config.name !== "hibalag-ai") throw new Error("Unexpected Pages project name.");
if (config.pages_build_output_dir !== "./.output/pages") {
  throw new Error("Pages output directory is not .output/pages.");
}
if (!config.compatibility_flags?.includes("nodejs_compat")) {
  throw new Error("Pages must preserve Nitro's nodejs_compat runtime flag.");
}
if (config.vars || config.ai || config.services || config.d1_databases || config.kv_namespaces) {
  throw new Error("Pages configuration must not add variables, AI, services, or data bindings.");
}
if (/LOVABLE_API_KEY\s*[:=]\s*["'][^"']+["']/.test(configText)) {
  throw new Error("Pages configuration contains a LOVABLE_API_KEY value.");
}

const worker = await readFile(workerEntry, "utf8");
if (!/export\s*\{[^}]*default/s.test(worker)) {
  throw new Error("Pages Worker entry does not export a default handler.");
}
if (!/env\.ASSETS/.test(worker)) {
  throw new Error("Pages Worker entry does not forward static assets through ASSETS.");
}

const imports = [...worker.matchAll(/(?:from\s*|import\s*\()["'](\.[^"']+)["']/g)].map(
  ([, path]) => path,
);
for (const imported of imports) await access(resolve(workerDir, imported));

const sw = await readFile(resolve(pagesDir, "sw.js"), "utf8");
if (!/(?:url:)?["']\/["']/.test(sw)) {
  throw new Error("Pages service worker does not precache the SSR home document.");
}
const workboxMatch = sw.match(/["'](?:\.\/)?(workbox-[A-Za-z0-9_-]+)(?:\.js)?["']/);
if (!workboxMatch) throw new Error("Pages service worker has no Workbox runtime reference.");
await access(resolve(pagesDir, `${workboxMatch[1]}.js`));

const manifest = JSON.parse(await readFile(resolve(pagesDir, "manifest.webmanifest"), "utf8"));
for (const icon of manifest.icons ?? []) {
  const path = String(icon.src ?? "").replace(/^\//, "");
  if (!path) throw new Error("The web manifest contains an icon without a path.");
  await access(resolve(pagesDir, path));
}

let fileCount = 0;
let largestFile = { path: "", size: 0 };
async function inspectTree(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await inspectTree(path);
      continue;
    }
    fileCount += 1;
    const { size } = await stat(path);
    if (size > largestFile.size) largestFile = { path, size };
    if (size > 25 * 1024 * 1024) throw new Error(`Pages file exceeds 25 MiB: ${path}`);
    if ([".env", ".vars"].includes(extname(path))) {
      throw new Error(`Credential-like file was packaged: ${path}`);
    }
  }
}
await inspectTree(pagesDir);
if (fileCount > 20_000)
  throw new Error(`Pages package has ${fileCount} files; Free allows 20,000.`);

console.log(
  `Cloudflare Pages package verified (${fileCount} files; largest ${Math.ceil(largestFile.size / 1024)} KiB; no runtime bindings or LOVABLE_API_KEY value).`,
);
