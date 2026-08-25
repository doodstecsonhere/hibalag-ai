# Cloudflare hosting readiness

This document records the zero-dollar, pre-deployment hosting plan for Hibalag AI. It does not authorize creating a Cloudflare resource, uploading a Worker version, changing DNS, or adding production secrets.

## Confirmed

- The independent build targets Nitro's recommended `cloudflare-module` Worker output.
- The generated Wrangler configuration has the stable Worker name `hibalag-ai`, a pinned compatibility date, Node.js compatibility, static assets, `workers.dev`, and version preview URLs enabled.
- The repository contains no Cloudflare account identifier, API token, route, custom domain, or production secret.
- A local development-server smoke test returned the home page successfully with `LOVABLE_API_KEY` absent. The chat API returned its expected missing-key failure without calling live AI.
- The Cloudflare Workers Free plan is the default zero-dollar plan. Its relevant limits include 100,000 requests per day, 10 ms CPU time per invocation, 128 MB memory, 50 subrequests per request, 3 MB compressed Worker size, 20,000 static files, and 25 MiB per static asset. Static-asset requests are free and unlimited under the current pricing documentation.
- Free-plan limits fail closed instead of creating metered overage charges. The paid plan is separate and must not be enabled for this project.
- A non-production branch can upload a Worker version and receive a preview URL without promoting that version to production. Preview URLs are public to anyone who has the URL unless Cloudflare Access is separately configured.
- Custom domains require an active Cloudflare zone and a DNS/certificate change. That is a later, approval-gated production action.
- Cloudflare can roll a Worker deployment back to one of its 100 most recent versions. A code rollback does not undo changes to external storage, databases, secrets, or other resources.

## Probable

- The existing Cloudflare account is the best zero-dollar hosting candidate because it is already active and has substantial unused Free-plan request capacity.
- The current application should fit the Free plan because most frontend files are static assets and the server route can keep live AI disabled when its runtime secret is absent. Actual CPU usage must be measured on the first approved preview.
- A private GitHub repository can be connected to Workers Builds, but the least invasive first preview is a version-only upload so no production deployment or DNS route is created.

## Unknown

- Cloudflare's public pricing and documentation reviewed on 2026-08-26 do not explicitly state whether a payment card is always unnecessary during Worker creation. Stop if the dashboard asks for one.
- The public documentation does not provide a simple explicit statement granting commercial use of the Free plan. Commercial use must remain subject to Cloudflare's current self-serve terms and any service-specific terms.
- Real Worker CPU time, cold-start behavior, Auth redirects, Supabase authorization, and end-to-end browser behavior cannot be confirmed until an isolated preview is approved and tested.
- Nitro's generated message suggests `vite preview`, but the current TanStack preview plugin looks for a Node output file that the Cloudflare-module build does not produce. Use a version preview through Wrangler for the approved Cloudflare artifact; continue using the independent Vite development server for local interface checks.
- The generated build currently relies on Cloudflare's build environment or an explicitly pinned Wrangler invocation; Wrangler is not a direct repository dependency. Do not install or upgrade it without a reviewed dependency change.

## Requires external access and approval

- Creating the `hibalag-ai` Worker or connecting its private GitHub repository.
- Uploading the first preview version, even though it is not a production deployment.
- Adding Cloudflare Access if an authenticated preview is required.
- Adding runtime secrets or changing build/runtime variables.
- Promoting a version to production, attaching a custom domain, changing DNS, or enabling any paid plan.

## Environment variables

| Name                  | Scope                                                      | First preview                                                                              |
| --------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `VITE_PUBLIC_APP_URL` | Public build-time canonical URL                            | Set to the approved preview URL only if required by the build; never treat it as a secret. |
| `LOVABLE_API_KEY`     | Server-only runtime secret for the unchanged live-AI route | Omit. Its absence keeps live AI disabled. Never add it to build variables or preview logs. |

The current Supabase URL and publishable browser key are application configuration, not Cloudflare secrets. Do not add a database password, service-role key, Supabase secret key, or AI credential to a preview.

## Isolated preview plan

1. Obtain one consolidated approval for creating a zero-dollar Worker and uploading a version-only preview.
2. Confirm the dashboard still shows the Free plan and stop if it requests a card, trial, paid plan, or billing change.
3. Build from the reviewed commit with `LOVABLE_API_KEY` absent.
4. Upload a version only; do not promote it to production, attach routes, connect a custom domain, or alter DNS.
5. Test static pages, offline schedule/chat behavior, PWA assets, errors, and the disabled-live-AI response using only non-production test data.
6. Record request/CPU usage and remove the preview version if the test exposes data, calls live AI, or approaches a hard limit.

The version preview URL is not private by default. If URL secrecy is insufficient, stop and separately approve a zero-dollar Cloudflare Access configuration before sharing it.

## Custom-domain path

After the preview and independent production candidate pass, add the domain through **Workers & Pages > Worker > Settings > Domains & Routes > Add > Custom Domain**. Cloudflare then creates the required DNS record and certificate. Preserve the Lovable deployment and existing DNS until the independent deployment is verified and the owner approves the cutover.

## Rollback

- Before production: delete or stop using the preview version; no DNS or production traffic changes are needed.
- After an approved production deployment: use Cloudflare's deployment rollback to promote the previous known-good Worker version, then verify the public site.
- If a Git commit has been shared, create a revert commit and a new pull request; never rewrite published history.
- Keep Lovable connected and retain its known-good deployment until the independent production release, Auth/RLS checks, backup requirements, and final disconnect gate all pass.

## Official sources checked

- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Workers platform limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Workers build branches and preview URLs](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)
- [Worker versions and deployments](https://developers.cloudflare.com/workers/versions-and-deployments/)
- [Worker rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
- [Worker custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Pages limits](https://developers.cloudflare.com/pages/platform/limits/) and [Pages preview isolation](https://developers.cloudflare.com/pages/configuration/preview-deployments/) for comparison
