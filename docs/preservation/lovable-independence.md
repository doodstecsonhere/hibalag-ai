# Lovable independence checkpoint

Status: independent Cloudflare production is verified, Supabase preservation is
complete, and Lovable and Supabase remain connected.

## Confirmed

- GitHub repository `doodstecsonhere/hibalag-ai` is the development source of truth.
- The default `vite.config.ts` now forwards to the provider-neutral `vite.independent.config.ts`.
- Neither build path loads Lovable's Vite wrapper, preview bridge, telemetry, asset proxy, or MCP route generator.
- The independent build uses only dependencies already pinned in the repository lockfile. No package was downloaded, installed, or upgraded; only the two unused Lovable direct dependency declarations were removed.
- Lovable's Vite wrapper, MCP package, generated MCP endpoints/tools, and editor-only error telemetry have been removed from the application and direct dependency lists.
- The browser app contains a deterministic cached-schedule assistant. It does not require a live AI request when the browser is offline or the live gateway fails.
- Supabase project identity is `zfjehsrnsszxbtqvgbwq`.
- A complete encrypted database export, including Auth metadata, was created
  outside OneDrive and its integrity was verified. See
  [Supabase recovery record](supabase-recovery.md).
- The export's `auth`, `public`, and `storage` schemas were restored into an
  isolated PostgreSQL 17 container with networking disabled. Schema metadata,
  RLS policy, trigger, Auth user/identity, and application-table counts matched
  the source without displaying records.
- SSL enforcement remains enabled. The temporary database password was replaced
  by a different final password, which was verified through the SSL session
  pooler and retained only in a Windows DPAPI-protected file outside OneDrive.
- Temporary database access, temporary login roles, and temporary personal
  access tokens used during earlier recovery attempts were disabled, expired,
  or revoked. Transient plaintext credentials and dumps were removed.
- No database rows, schema objects, RLS policies, Auth configuration, Storage,
  Edge Functions, billing, AI configuration, DNS, or Lovable connection were
  changed by the preservation workflow.

## Unknown

- Browser-level application signup, confirmation, login, logout, recovery, and
  redirect behavior against a non-production Supabase environment. The direct
  local Auth lifecycle passed, but the application currently points at the
  production project.
- Remediation of the locally confirmed mixed-ownership integrity gap between
  `chat_messages.user_id` and the owner of its referenced `chat_threads` row.
- A full platform-level restore of Supabase-managed schemas and extensions. The
  portable database export is complete, while the isolated verification focused
  on the application-critical `auth`, `public`, and `storage` schemas because a
  plain PostgreSQL image does not contain every Supabase-managed extension.
- Domain cutover and DNS rollback. The independent Workers deployment does not
  yet replace any custom production domain.
- Whether any external client previously used the removed public MCP endpoints. No application code referenced them.

## Intentionally retained Lovable references

- `LOVABLE_API_KEY`, the Lovable AI gateway URL, run-ID headers, provider name, model, and prompt remain unchanged. They are current production AI behavior and require separate approval to replace.
- `src/lib/pwa.ts` still recognizes Lovable preview hosts so it does not register a service worker inside the connected editor preview.
- The current Lovable public URL remains the fallback canonical URL and in `public/robots.txt` until an independent domain is approved. `VITE_PUBLIC_APP_URL` centralizes the future cutover.
- Historical migration wording in `README.md`, this preservation record, and governance instructions remains intentionally descriptive.
- Some resolved package tarball URLs in `bun.lock` point at Lovable's npm cache. They record package provenance and are not runtime calls or direct Lovable dependencies; rewriting the entire lock without an approved reinstall would add unrelated risk.

## Requires external access or approval

- Applying and verifying an approved RLS/data-integrity migration that prevents
  a user from attaching their message row to another user's thread.
- Running the remaining browser-level application Auth journey against a
  non-production environment.
- Creating or changing any cloud preview, deployment, environment variable,
  Supabase setting, DNS record, or billing state.
- Merging this preservation documentation pull request.
- Disconnecting Lovable. Keep it connected until the owner approves that exact
  final action after reviewing the remaining verification gaps.

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
4. Preserve the Supabase database in an encrypted backup outside OneDrive and
   verify an isolated restore without exposing records. **Complete.**
5. Rotate the database password, retain the final credential only under DPAPI,
   and remove transient credentials. **Complete.**
6. The direct local Auth lifecycle and principal RLS isolation tests are
   complete. Remediate the documented cross-owner message/thread integrity gap,
   then run the remaining browser-level application Auth journey.
7. Stop at the final gate. Disconnect Lovable only after the owner gives
   explicit final approval.

## Rollback

To roll back these documentation changes after sharing, revert their commit and
push the revert; do not reset, force-push, rebase, or rewrite published history.
Documentation rollback does not alter Supabase or restore data. For database
recovery, follow the separate encrypted-backup procedure rather than reverting
application code.
