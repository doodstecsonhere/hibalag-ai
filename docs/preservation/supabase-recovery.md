# Supabase recovery record

Recorded: 2026-08-26 (Asia/Manila)

Project: `zfjehsrnsszxbtqvgbwq`

This record intentionally contains no passwords, keys, connection strings,
email addresses, user rows, chat content, or other private record values.

## Confirmed preservation artifacts

The newest pre-migration recovery point is:

- Encrypted archive:
  `C:\Code\Backups\hibalag-ai\supabase-20260827-121023.7z`
- Archive SHA-256:
  `7988B21FC0A36D6975BE4DF696ECC976D6E7C4C612EF78CF9E46F41DB25F2FD1`
- DPAPI-protected archive key:
  `C:\Code\Backups\hibalag-ai\supabase-20260827-121023.7z.key.dpapi`
- The archive contains fresh roles, schema, and custom-format data exports,
  including Auth users and identities. Its encrypted archive integrity and dump
  catalog were verified before the ownership migration was applied.

The earlier independently restored recovery point remains retained:

- Encrypted archive:
  `C:\Code\Backups\hibalag-ai\supabase-20260826-222833.7z`
- Archive SHA-256:
  `AB63E56F9B6F9FF15C27336BEBC4B10E4D043A2909EBE78A3C9B555AEFC42EE8`
- DPAPI-protected archive key:
  `C:\Code\Backups\hibalag-ai\supabase-20260826-222833.7z.key.dpapi`
- DPAPI-protected final database password:
  `C:\Code\Backups\hibalag-ai\supabase-final-password.dpapi`
- Archive format: 7-Zip with AES-256 encryption and encrypted headers.
- The archive contains a roles export, schema export, and custom-format data
  export. Auth metadata is included.
- A post-rotation SSL session-pooler connection using the protected final
  password succeeded.

The DPAPI files are bound to the Windows user account that created them. They
must remain outside cloud-synchronized folders. Losing that Windows profile or
its DPAPI master keys can make the protected values unrecoverable, so a future
owner-controlled offline recovery-key copy is still advisable.

## Isolated restore verification

The application-critical `auth`, `public`, and `storage` schemas were restored
into a PostgreSQL 17 Docker container started with `--network none`. The
container was removed after verification. No production row values were shown.

Source and restored counts matched:

| Check                          | Count |
| ------------------------------ | ----: |
| Auth identities                |     2 |
| Auth users                     |     1 |
| Functions                      |    22 |
| RLS policies                   |     4 |
| RLS-enabled tables             |     4 |
| Triggers                       |     4 |
| `public.app_config` rows       |     1 |
| `public.chat_messages` rows    |     0 |
| `public.chat_threads` rows     |    14 |
| `public.schedule_context` rows |     1 |

This confirms that Auth metadata and the application schemas are present and
portable. It is not a claim that a plain PostgreSQL image can reproduce every
Supabase platform-managed extension or service. A full platform disaster
recovery should restore into a compatible Supabase environment and separately
reapply dashboard-only Auth, Storage, Edge Function, and secret configuration.

## Integrity check

Before recovery, confirm that the archive hash exactly matches the value above:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath `
  'C:\Code\Backups\hibalag-ai\supabase-20260826-222833.7z'
```

Then decrypt the archive key only in memory with Windows DPAPI and use it to run
`7z t`. Do not print the key, place it in the repository, or save a plaintext
copy. Stop if either the SHA-256 value or the archive integrity test differs.

## Recovery procedure

1. Copy the encrypted archive and its DPAPI key file to a local folder outside
   OneDrive. Keep the originals unchanged.
2. Verify the SHA-256 hash and encrypted archive integrity.
3. Start a compatible isolated Supabase/PostgreSQL recovery environment with no
   network access and no production credentials.
4. Restore roles first, schema second, and data last. Expected platform-owned
   role or extension conflicts must be reviewed individually; do not suppress
   unexplained restore errors.
5. Compare schema names, tables, functions, triggers, grants, RLS enablement,
   policies, and metadata counts. Do not display private rows.
6. Test Auth and ownership isolation only with non-production accounts after the
   database is running in an isolated Supabase-compatible environment.
7. Destroy the isolated environment and securely remove plaintext exports after
   verification. Retain the encrypted archive and protected keys.
8. Any production restore requires a fresh backup, a written impact review, and
   separate owner approval. Application rollback does not restore database data.

## Cleanup evidence

- The temporary plaintext dump directory was removed after the encrypted
  archive passed a second integrity test.
- The temporary DPAPI-protected database password was removed.
- The isolated restore container was removed; the unrelated `n8n_app` container
  was left running and unchanged.
- The Windows clipboard was emptied after the final password was verified.
- Lovable remains connected.

## Remaining gate

### Production ownership verification

Migration `20260827041201_enforce_chat_message_thread_ownership` was applied on
2026-08-27 only after the fresh encrypted backup passed and a read-only
ownership-conflict count returned zero.

Production verification confirmed the composite owner constraint, owner CRUD,
application-style queries, cross-user and anonymous isolation, cascade
behavior, and Auth-user preservation. The verification used two fictional
principals inside a transaction that ended with `ROLLBACK`. Follow-up counts
confirmed that zero fictional users, threads, or messages remained and that
the ownership-conflict count remained zero.

The full signup, confirmation, login, logout, recovery, and expiry lifecycle
remains verified in the isolated local GoTrue environment. A production signup
using a reserved invalid domain was rejected without creating an account; it
was not retried with a deliverable address because that could send external
email.

### Local Auth verification

On 2026-08-27, the official GoTrue `v2.195.0`, PostgreSQL 17, and Mailpit
images were run on a dedicated localhost-only Docker network. All accounts,
passwords, messages, and email addresses were fictional and disposable. No
email left the computer and no production database connection was used.

The following direct Auth API checks passed:

- signup withheld a session until email confirmation;
- login before confirmation was rejected;
- local Mailpit confirmation completed and password login succeeded;
- the authenticated user endpoint accepted a valid session;
- logout revoked the refresh token;
- password recovery issued a local recovery session, allowed a new password,
  rejected the old password, and accepted the new password;
- an expired, correctly signed local JWT was rejected with `bad_jwt`; and
- a second independent fictional account confirmed and signed in.

This verifies the Auth service lifecycle in isolation. It does not verify the
production dashboard's provider, redirect, SMTP, or template configuration,
and it does not replace a browser-level application journey.

### Local RLS verification

The recovered `chat_threads` and `chat_messages` definitions, grants, and RLS
policies were recreated in the disposable database. Tests as two fictional
authenticated users plus the anonymous role confirmed:

- owners can insert and read their own threads and messages;
- another user cannot read, update, delete, or claim ownership of the owner's
  thread or message rows;
- anonymous reads return no private chat rows and anonymous writes fail; and
- the application query path continues to show each user only their own
  message rows.

The earlier mixed-ownership integrity gap is resolved by the reviewed composite
foreign key. Production verification confirmed owner CRUD, application-style
queries, cross-user and anonymous isolation, cascade behavior, and zero
remaining ownership conflicts using disposable fictional principals.

## 2026-08-31 readiness recheck

The newest encrypted archive, its DPAPI-protected key, and the protected final
database credential remain present outside OneDrive. Its recorded SHA-256 still
matches; the archive was not decrypted and no records or protected values were
displayed. The preceding archive remains the end-to-end isolated-restore
evidence.

Production records the ownership and hardening migrations as versions
`20260827041201` and `20260827074437`; the repository retains their reviewed
files under the original local version names. Read-only metadata checks confirm
the ownership constraints, covering index, four RLS-enabled application tables,
four policies, `postgres` ownership of `public.rls_auto_enable()`, its enabled
event trigger, and denied execution for `PUBLIC`, `anon`, `authenticated`, and
`service_role`. Supabase is healthy and its advisors no longer report
privileged-function warnings.

Residual recovery limits:

- The latest archive has integrity and catalog evidence, while the preceding
  archive is the one restored end to end.
- A database archive does not capture dashboard secrets, every managed Auth
  setting, logs, or all service configuration.
- Full production email-based Auth journeys remain manual; isolated fictional
  lifecycle and RLS tests passed and retained no test users or rows.
- Leaked-password protection remains disabled and was not changed.
