import { cp, mkdir, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, ".output");
const publicDir = resolve(outputDir, "public");
const serverDir = resolve(outputDir, "server");
const pagesDir = resolve(outputDir, "pages");
const workerDir = resolve(pagesDir, "_worker.js");
const deployRedirect = resolve(root, ".wrangler/deploy/config.json");

await rm(pagesDir, { recursive: true, force: true });
await mkdir(pagesDir, { recursive: true });
await cp(publicDir, pagesDir, { recursive: true });
await cp(serverDir, workerDir, { recursive: true });

// Pages advanced mode recognizes a directory entry at _worker.js/index.js.
// Keep Nitro's split ES modules beside it so Wrangler can bundle them.
await rename(resolve(workerDir, "index.mjs"), resolve(workerDir, "index.js"));
await rm(resolve(workerDir, "wrangler.json"), { force: true });
// Nitro's Worker preset redirects Wrangler to its generated Worker config.
// Pages commands must instead read the reviewed root Pages configuration.
await rm(deployRedirect, { force: true });

console.log("Cloudflare Pages advanced-mode package created at .output/pages.");
