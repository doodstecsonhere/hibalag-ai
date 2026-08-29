import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "src/lib/ai-quota-do.ts");
const serverDir = resolve(root, ".output/server");
const modulePath = resolve(serverDir, "hibalag-ai-quota.mjs");
const entryPath = resolve(serverDir, "index.mjs");
const configPath = resolve(serverDir, "wrangler.json");

const source = await readFile(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    verbatimModuleSyntax: true,
  },
  fileName: sourcePath,
  reportDiagnostics: true,
});
if (
  compiled.diagnostics?.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
) {
  throw new Error("Cloudflare Durable Object source did not transpile cleanly.");
}
await writeFile(
  modulePath,
  `// Generated from src/lib/ai-quota-do.ts; do not edit this artifact.\n${compiled.outputText}`,
  "utf8",
);

let entry = await readFile(entryPath, "utf8");
const quotaExport = 'export { HibalagAiQuota } from "./hibalag-ai-quota.mjs";';
if (!entry.includes(quotaExport)) entry = `${entry.trimEnd()}\n${quotaExport}\n`;
await writeFile(entryPath, entry, "utf8");

const config = JSON.parse(await readFile(configPath, "utf8"));
config.ai = { binding: "AI" };
config.durable_objects = {
  bindings: [{ name: "AI_QUOTA", class_name: "HibalagAiQuota" }],
};
config.migrations = [{ tag: "hibalag-ai-quota-v1", new_sqlite_classes: ["HibalagAiQuota"] }];
config.vars = { ...(config.vars ?? {}), AI_ENABLED: "false" };
await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

console.log("Cloudflare AI Worker and fail-closed quota configuration packaged.");
