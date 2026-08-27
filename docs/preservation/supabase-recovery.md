# Supabase recovery record

Recorded: 2026-08-26 (Asia/Manila)

Project: `zfjehsrnsszxbtqvgbwq`

This record intentionally contains no passwords, keys, connection strings,
email addresses, user rows, chat content, or other private record values.

## Confirmed preservation artifacts

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

| Check | Count |
| --- | ---: |
| Auth identities | 2 |
| Auth users | 1 |
| Functions | 22 |
| RLS policies | 4 |
| RLS-enabled tables | 4 |
| Triggers | 4 |
| `public.app_config` rows | 1 |
| `public.chat_messages` rows | 0 |
| `public.chat_threads` rows | 14 |
| `public.schedule_context` rows | 1 |

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

One integrity gap remains: the `chat_messages` policy checks only
`auth.uid() = user_id`. A user can therefore create their own message row with
the `thread_id` of another user's thread. RLS keeps that row invisible to the
thread owner, but the foreign-key relationship contains mixed ownership and a
thread deletion can cascade to a row owned by the other user.

Before disconnecting Lovable, add and test an approved migration that enforces
same-owner thread/message relationships, verify the application Auth journey
with fictional accounts, review recovery access to the DPAPI-protected files,
and obtain one explicit final approval for the disconnection itself.
