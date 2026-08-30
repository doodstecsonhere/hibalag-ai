# Cloudflare hosting and rollback record

Last verified: 2026-08-31

## Deployment governance

This designation is documentation only; it does not redirect traffic, change DNS, or alter either deployment.

| Role               | URL                                                                              | Reviewed source                            | Deployment identity                                                              |
| ------------------ | -------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| Primary            | [hibalag-ai.pages.dev](https://hibalag-ai.pages.dev)                             | `fe31fe826336f9d5e2bade37cb323a5d08194e45` | Pages `9df6dea7-0dab-43a1-b391-e1dc381dc399`                                     |
| Secondary rollback | [hibalag-ai.doodstecson.workers.dev](https://hibalag-ai.doodstecson.workers.dev) | `fe31fe826336f9d5e2bade37cb323a5d08194e45` | Worker version `25158ead-cc24-437d-93d7-56baf8b1e741` at 100% production traffic |

GitHub `doodstecsonhere/hibalag-ai` is authoritative. Lovable is retained only as a historical fallback.

## Verified behavior

Pages passed server rendering, home-page and schedule browsing, deterministic chat fallback, controlled missing-live-AI handling, online cached reload, and PWA asset checks. Its package contains `_worker.js`, imported server modules, the manifest, service worker, Workbox runtime, and static assets without `LOVABLE_API_KEY` or private data.

Both deployments use the reviewed Cloudflare Workers AI model and one shared
SQLite Durable Object quota namespace. Each passed exactly one approved
fictional, schedule-grounded production AI request. The secondary Worker's home
page and PWA assets respond successfully, and its manifest, service worker, and
Workbox runtime match Pages.

A genuine network-blocked production Pages test could not be performed without changing system networking or affecting unrelated applications. The identical artifact passed locally while hard offline, and the Worker previously passed production hard-offline verification.

## Zero-dollar boundaries

Current Free-plan documentation lists:

- Pages: 500 builds per month, 100 projects per account, 20,000 files per site, and 25 MiB per file; static asset requests are free and unlimited.
- Pages Functions share the Workers Free allowance.
- Workers Free: 100,000 requests per day, 10 ms CPU per invocation, 128 MB memory, 50 subrequests per invocation, and 3 MB compressed Worker size.

Both deployments share one Cloudflare account and its Workers Free quota. The Worker protects against a faulty Pages package or release, not an account-wide outage, suspension, or exhausted shared quota. Workers AI Free includes 10,000 Neurons per day, and SQLite Durable Objects have separate hard Free-plan limits. No card, trial, paid feature, overage setting, domain, or DNS change was enabled. The AI pepper is stored only as an encrypted platform secret.

Recheck the official [Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/), and [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) before future usage or billing decisions.

## Health checks and failover

1. Request `/`, `/manifest.webmanifest`, `/sw.js`, and the referenced Workbox runtime and expect HTTP 200.
2. Browse the schedule and test a fictional prompt covered by deterministic fallback; do not invoke live AI.
3. Confirm missing live AI produces the documented controlled error.
4. Inspect Cloudflare deployment status, errors, requests, and CPU without changing configuration.
5. If Pages fails while the Worker remains healthy, communicate and use the Worker URL temporarily. Restore Pages from a reviewed commit before designating it primary again.

## Redeployment and rollback

Deployment rollback or repair:

1. Leave the secondary Worker unchanged.
2. Build the chosen reviewed Git commit with `LOVABLE_API_KEY` absent.
3. Run the Pages package verification.
4. Deploy `.output/pages` through Wrangler's standard bundled Pages path to project `hibalag-ai`, production branch `main`, only after deployment approval.
5. Verify Pages before restoring its primary designation.

Code rollback:

1. Revert the faulty shared commit with a new commit; never rewrite published history.
2. Review and merge the revert pull request after approval.
3. Deploy the reviewed revert only after separate approval.

Database rollback is migration-specific and separate from code or deployment rollback. Data recovery requires the encrypted backup; neither Git nor Cloudflare restores database records.

## Residual limitations

- Production Pages lacks a genuine network-blocked browser run; local hard-offline and Worker production evidence cover the same artifacts.
- Both URLs share one Cloudflare account and Workers Free quota.
- Pages uses Direct Upload, so updates require an intentional reviewed Wrangler upload rather than automatic Git deployment.
- Application canonical metadata and `robots.txt` use the Pages origin. OAuth
  return URLs preserve the initiating Pages, Worker, or Lovable origin.
- Cloudflare limits and terms can change.
