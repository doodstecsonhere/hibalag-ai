<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Hibalag AI project instructions

## Communicate clearly with the owner

The owner is learning software development. Use plain language and finish each
task with a short, non-technical summary that explains:

- what changed;
- what was tested and what was not tested;
- any effect on cost, user data, privacy, or availability;
- anything that still needs the owner's approval; and
- the exact rollback procedure.

Clearly label facts, assumptions, and items that still require verification.

## Authoritative repository and original platform

The private GitHub repository `doodstecsonhere/hibalag-ai` is the authoritative
source for future Hibalag AI development. Treat older repositories and Lovable
copies as historical or temporary recovery sources, not development targets.

The repository is still connected to Lovable. Before pushing, verify the target
branch and whether it is connected to Lovable. Do not send changes to Lovable,
change synchronization, or disconnect Lovable unless the owner explicitly
approves that exact action.

Never rewrite published history. Do not force-push, rebase, amend, or squash
commits that have already been pushed to a shared or Lovable-connected branch.

## Strict zero-dollar budget

The current project budget is exactly zero dollars.

Without the owner's explicit approval, never:

- add or request a payment method;
- activate a trial, subscription, paid plan, paid add-on, or paid service;
- enable pay-as-you-go billing, overages, automatic top-ups, or usage-based
  charges;
- disable a spending cap or hard usage limit;
- create a paid project, database, branch, deployment, domain, or account;
- invoke an AI model or external API that might consume paid credits; or
- select a paid model or silently fall back to one.

Prefer services that stop, pause, or disable a feature when their free allowance
is exhausted. Before proposing a service, explain whether its free offering is
permanent or a trial, whether commercial use is allowed, whether a payment card
is required, its hard limits, its overage behavior, and what would require
payment later.

## Git and pull-request workflow

For each feature or fix:

1. Verify the repository, current branch, remote, and working-tree status.
2. Create one focused `codex/<topic>` branch. Do not mix unrelated work.
3. Preserve unrelated user changes.
4. Make small commits with understandable messages.
5. Run appropriate safe checks and preview the change locally before asking for
   approval, unless the task is documentation-only or local preview is unsafe or
   impossible. Explain any check that could not be run.
6. Review the final diff for secrets, private data, unrelated files, and
   accidental generated output.
7. When the task authorizes GitHub writes, push the feature branch to the active
   private repository for cloud backup and prepare a draft pull request. If that
   authority was not given, ask before pushing or creating the pull request.
8. Never merge without the owner's explicit approval.
9. After every implemented task, provide the exact code, deployment, and data
   rollback procedure that applies.

Use a revert commit for changes that have already been shared. Never use a
destructive reset or rewrite shared history.

## Approval boundaries

When a future implementation request authorizes the work, Codex may inspect
files and safe metadata, edit authorized local files, run safe local checks,
create a feature branch, and make small local commits.

Always obtain explicit owner approval before:

- merging a pull request;
- publishing a tag or GitHub Release;
- deploying a public preview or production version;
- changing hosting, DNS, or domains;
- applying a Supabase or other database migration;
- changing Row Level Security, grants, database functions, or triggers;
- changing production data or exporting private production records;
- deploying an Edge Function;
- changing authentication providers, redirects, templates, or email delivery;
- changing storage buckets or access policies;
- changing production environment variables or secrets;
- changing AI providers, models, prompts, or production usage limits;
- enabling billing, trials, overages, payment methods, or paid services; or
- disconnecting Lovable, Supabase, or another original production dependency.

Do not interpret approval for one action as approval for another. A request to
prepare a deployment or Release does not authorize publishing it.

## Secrets and private data

Never commit, print, copy into a pull request, or expose secret values or private
user data.

A Supabase publishable browser key is not a service-role secret, but it is safe
only when Row Level Security is correct. Never expose Supabase secret or
service-role keys, database passwords or connection strings, AI-provider keys,
Lovable credentials, OAuth client secrets, SMTP credentials, or deployment
tokens.

Document variable names and use obvious placeholders in example files. Ensure
`.env`, `.env.*`, `.dev.vars`, local override files, and platform secret files
are ignored, while explicitly allowing only reviewed example templates.

Before committing or pushing, inspect the diff for credentials, database dumps,
logs, user records, conversations, uploaded files, and other private data. If a
credential may have been exposed, report only its path and type. Do not display,
validate, or rotate it without approval.

## Supabase, authentication, and production data

GitHub does not back up database records, Auth users, sessions, storage files,
secrets, dashboard configuration, logs, or service backups.

Keep version-controlled migrations for every approved schema, policy, grant,
trigger, function, extension, and storage-policy change. Before any production
database change:

- verify an appropriate backup and recovery method;
- review both the migration and the data-recovery or rollback plan;
- test against a development environment;
- run relevant security and performance checks; and
- obtain explicit owner approval.

Enable Row Level Security on exposed tables. Policies must enforce actual
record ownership; authentication alone is not authorization. Avoid privileged
`SECURITY DEFINER` functions. If one is genuinely necessary, restrict where it
lives and who may execute it, validate the caller, use a safe search path, and
document the reason.

Treat account identifiers, sessions, email addresses, prompts, conversations,
AI responses, feedback, and moderation records as private. Never use production
users or production records for development testing.

Test signup, confirmation, login, logout, recovery, session expiry, redirect
URLs, anonymous access, and ownership isolation using non-production accounts.
Include user-facing edit and deletion behavior in real-user-journey testing.

Reverting application code does not reverse a database migration or restore
deleted or changed records. Database and data recovery must have separate plans.

## AI safety, privacy, and cost

Generative AI must remain optional. Schedule browsing and the deterministic
offline assistant should continue to work when live AI is disabled, fails, or
uses all of its free allowance.

Every production AI route must have:

- server-side credentials only;
- authentication before expensive operations;
- hard per-user and per-IP limits;
- a hard global daily request or token limit;
- request-body, message-history, and output-size limits;
- timeouts and controlled retries;
- bot protection where appropriate;
- a global emergency-off switch;
- a clear no-cost fallback and quota-exhausted message;
- no silent paid-model fallback; and
- privacy-conscious logs that avoid full conversations by default.

Do not send unnecessary identity information, private records, or conversation
history to an AI provider. Document the provider, model, data recipients,
retention settings, prompt location, expected cost, and failure behavior.

Treat user input, schedule data, retrieved content, and model output as
untrusted. Test prompt injection, harmful output, hallucination, malformed
responses, timeouts, quota exhaustion, and attempts to expose another user's
information.

Changes to the AI provider, model, system prompt, usage limits, paid capability,
or privacy behavior require owner approval and must appear in release notes.

## Dependencies

Do not install, remove, or upgrade dependencies unless the task authorizes it.
Keep the lockfile committed and prefer pinned, reviewed versions. Before adding
a dependency, explain its purpose, license, maintenance status, supply-chain
risk, application-size impact, and possible cost.

Do not bypass the Bun minimum-release-age protection without owner approval.

## Testing and verification

Do not claim that a feature works merely because it builds. Clearly distinguish:

- compilation, lint, type-check, and automated-test success;
- whether the interface looks correct;
- mobile and accessibility behavior;
- Supabase authentication and authorization behavior;
- whether an AI request technically completes;
- whether an AI response is useful and safe; and
- whether a real user journey works from beginning to end.

Use zero-cost tests that do not call live AI by default. Mock the AI provider for
routine tests. Minimum relevant coverage should include schedule parsing and
filtering, localization, offline answers, guest chat storage, signed-in record
ownership, loading and empty states, failures, offline behavior, timeouts,
quota exhaustion, request limits, mobile layouts, keyboard navigation, focus,
labels, contrast, and reduced motion.

For application changes, complete a local preview before asking for merge or
deployment approval. Test production-like behavior only against explicitly
approved non-production services.

## Local, cloud-preview, and production separation

Keep these environments distinct:

- local interface preview: live AI off, with cached or mock schedule data where
  practical;
- local integration preview: development services only;
- cloud preview: isolated or restricted test services and no paid AI; and
- production: real services and only explicitly approved AI configuration.

A preview must not write production user data, use production-only secrets, or
consume paid AI by default. Do not expose production secrets to pull-request
previews.

## Releases, deployment, and rollback

Normal commits and preview deployments do not require GitHub Releases.

Use `legacy-lovable-baseline` for a verified final Lovable-era marker and
`v1.0.0` for the first verified Lovable-independent production release. Use
patch versions for compatible fixes, minor versions for compatible features,
and major versions for breaking changes.

Release notes must identify database migrations, Edge Functions, Auth and RLS
changes, AI provider/model/prompt changes, required environment-variable names,
backup prerequisites, verification evidence, and rollback steps.

Codex may prepare draft release notes when requested. Publishing a Release,
deploying to production, or changing the production domain always requires
explicit approval. Retain the previous known-good deployment until the new one
has been verified.

Every completed implementation summary must explain how to roll back the code
and deployment and, when relevant, separately recover database structure and
data. Never imply that a Git revert restores production data.

## Do not disconnect original services early

Do not disconnect, delete, archive, or materially change the Lovable project
until all of the following are true:

- GitHub completeness is verified;
- Supabase structure and configuration are documented;
- required production data is backed up;
- the independent local build and cloud preview pass;
- Auth and Row Level Security are tested;
- AI-disabled and quota-exhausted modes work;
- an independent production deployment is verified;
- DNS and deployment rollback are documented; and
- the owner gives explicit final approval.

Do not disconnect Supabase until a replacement has been fully verified and its
data, Auth, storage, functions, configuration, backup, and rollback procedures
are complete.
