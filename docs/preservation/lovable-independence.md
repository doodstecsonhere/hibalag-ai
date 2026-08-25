# Lovable independence checkpoint

Status: local preparation only. Lovable and Supabase remain connected.

## Confirmed

- GitHub repository `doodstecsonhere/hibalag-ai` is the development source of truth.
- The default `vite.config.ts` now forwards to the provider-neutral `vite.independent.config.ts`.
- Neither build path loads Lovable's Vite wrapper, preview bridge, telemetry, asset proxy, or MCP route generator.
- The independent build uses only dependencies already pinned in the repository lockfile. No package was downloaded, installed, or upgraded; only the two unused Lovable direct dependency declarations were removed.
- Lovable's Vite wrapper, MCP package, generated MCP endpoints/tools, and editor-only error telemetry have been removed from the application and direct dependency lists.
- The browser app contains a deterministic cached-schedule assistant. It does not require a live AI request when the browser is offline or the live gateway fails.
- Supabase project identity is `zfjehsrnsszxbtqvgbwq`. No database, Auth, Storage, Edge Function, billing, or dashboard setting was changed during this checkpoint.

## Probable

- A future independent host can use the generated Nitro/Cloudflare output, subject to an isolated preview test and the host's current free-plan limits.

## Unknown

- Production-record export and isolated database restore integrity. Direct database and pooler authentication are currently unavailable; this work is explicitly deferred.
- Full Auth journey and cross-user ownership isolation outside Lovable.
- Independent cloud-preview behavior, production environment variables, domain cutover, and DNS rollback.
- Whether any external client previously used the removed public MCP endpoints. No application code referenced them.

## Intentionally retained Lovable references

- `LOVABLE_API_KEY`, the Lovable AI gateway URL, run-ID headers, provider name, model, and prompt remain unchanged. They are current production AI behavior and require separate approval to replace.
- `src/lib/pwa.ts` still recognizes Lovable preview hosts so it does not register a service worker inside the connected editor preview.
- The current Lovable public URL remains the fallback canonical URL and in `public/robots.txt` until an independent domain is approved. `VITE_PUBLIC_APP_URL` centralizes the future cutover.
- Historical migration wording in `README.md`, this preservation record, and governance instructions remains intentionally descriptive.
- Some resolved package tarball URLs in `bun.lock` point at Lovable's npm cache. They record package provenance and are not runtime calls or direct Lovable dependencies; rewriting the entire lock without an approved reinstall would add unrelated risk.

## Requires external access or approval

- Exporting private production records.
- Rotating the database password after a verified backup.
- Creating or changing any cloud preview, deployment, environment variable, Supabase setting, DNS record, or billing state.
- Pushing this branch if the GitHub integration may sync it into Lovable.
- Merging, deploying, or disconnecting Lovable.

## Zero-cost local commands

Use the repository-installed tools; no network access is required after dependencies are present:

```powershell
.\node_modules\.bin\vite.exe build --config vite.independent.config.ts
.\node_modules\.bin\tsc.exe --noEmit
```

Do not provide `LOVABLE_API_KEY` during routine tests. That prevents accidental live AI use. The local interface and cached-schedule behavior should be tested without paid AI.

## Approval-gated preservation sequence

1. Verify the independent build locally and perform a local browser smoke test with live AI unavailable.
2. Review the diff for secrets, private records, generated output, and unrelated files.
3. Obtain approval before pushing if the branch could sync to Lovable; then push only the focused branch and create a draft pull request.
4. Later, regain read-only database export access, make an encrypted backup outside OneDrive, and verify an isolated restore without exposing records.
5. Rotate the potentially exposed database password and recheck application connectivity only after the verified backup and explicit approval.
6. Test Auth/RLS isolation, AI-disabled/quota behavior, independent preview, production deployment, and rollback.
7. Stop at the final gate. Disconnect Lovable only after the owner gives explicit final approval.

## Rollback

These changes are local and do not affect production. Before sharing, discard only the focused files or delete the local branch. After sharing, create a revert commit for the checkpoint commit. Do not reset, force-push, rebase, or rewrite published history. Code rollback does not restore database data.
