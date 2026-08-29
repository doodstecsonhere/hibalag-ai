# Lovable independence checkpoint

Status: independent Cloudflare production, Supabase recovery, ownership, and
database hardening are verified. GitHub is authoritative; Lovable is retained
as a stale historical fallback.

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
- The backup workflow itself changed no rows, Auth configuration, Storage, Edge
  Functions, billing, AI configuration, DNS, or Lovable connection. The later
  reviewed ownership migration changed only the two documented constraints.
- The reviewed message/thread ownership migration is now recorded in Supabase
  migration history and verified in production. Its rollback-only fictional
  verification left no test accounts or rows.

## Unknown

- Browser-level application signup, confirmation, login, logout, recovery, and
  redirect behavior against a non-production Supabase environment. The direct
  local Auth lifecycle passed, but the application currently points at the
  production project.
- A full platform-level restore of Supabase-managed schemas and extensions. The
  portable database export is complete, while the isolated verification focused
  on the application-critical `auth`, `public`, and `storage` schemas because a
  plain PostgreSQL image does not contain every Supabase-managed extension.
- No custom domain or DNS cutover exists. The independent Pages and Worker
  hostnames are the public deployment and rollback paths.
- Whether any external client previously used the removed public MCP endpoints. No application code referenced them.

## 2026-08-28 independent release readiness

- Primary: [hibalag-ai.pages.dev](https://hibalag-ai.pages.dev), source
  `0e273f4186f3530f53fc96cdb84d9538ac72d0a6`, deployment
  `e3375360-7bb8-4f4d-85df-2ea288509d31`.
- Secondary rollback:
  [hibalag-ai.doodstecson.workers.dev](https://hibalag-ai.doodstecson.workers.dev),
  Worker version `643389ce-7798-4332-b5ca-bbe655ccf903`.
- The reviewed ownership and database-hardening migrations are applied.
  External roles cannot execute `public.rls_auto_enable()`; its `postgres`
  ownership and enabled event trigger remain intact, and the covering index
  exists. Supabase advisors no longer report the privileged-function warnings.
- Both deployments work with live AI disabled and deterministic fallback
  available. They share one Cloudflare account and Workers Free quota.
- The owner reports that Lovable GitHub synchronization is no longer active.
  Available Lovable metadata confirms its retained copy is behind GitHub, but
  does not independently expose the integration switch.

Residual manual items are production email-based Auth journeys, the accepted
Supabase leaked-password-protection warning, a genuine network-blocked Pages
production run, a full managed-platform restore exercise, and updating the
application canonical metadata that still names Lovable. These are documented
limitations rather than demonstrated failures. Publishing `v1.0.0` requires a
separate approval but no deployment or external-service change.

## Intentionally retained Lovable references

- `LOVABLE_API_KEY`, the Lovable AI gateway URL, run-ID headers, provider name, model, and prompt remain unchanged. They are current production AI behavior and require separate approval to replace.
- `src/lib/pwa.ts` still recognizes Lovable preview hosts so it does not register a service worker inside the connected editor preview.
- `https://hibalag-ai.pages.dev` is the approved primary canonical URL. The
  Worker and retained Lovable URLs remain compatibility and rollback origins;
  `VITE_PUBLIC_APP_URL` supports an explicitly approved environment override.
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
6. The local Auth lifecycle, production ownership migration, principal RLS
   isolation, application-query behavior, and cleanup checks are complete.
   Apply the reviewed final privileged-function hardening before disconnection.
7. Stop at the final gate. Disconnect Lovable only after the owner gives
   explicit final approval.

## Final database hardening rollback

The pending hardening migration revokes direct Data API execution of
`public.rls_auto_enable()` while leaving its PostgreSQL event trigger enabled,
and creates `public.chat_messages_thread_owner_idx` for the composite foreign
key. Its structural rollback is:

```sql
begin;

drop index if exists public.chat_messages_thread_owner_idx;
grant execute on function public.rls_auto_enable() to public;

commit;
```

Granting execution back to `public` restores the original externally callable
state and should be used only if the hardening causes a verified compatibility
failure. Neither direction changes application rows.

## Rollback

To roll back these documentation changes after sharing, revert their commit and
push the revert; do not reset, force-push, rebase, or rewrite published history.
Documentation rollback does not alter Supabase or restore data. For database
recovery, follow the separate encrypted-backup procedure rather than reverting
application code.
