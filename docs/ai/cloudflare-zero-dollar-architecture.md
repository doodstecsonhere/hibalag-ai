# Cloudflare zero-dollar live AI architecture

This is an approval-ready design, not deployed configuration. No Cloudflare
resource, binding, secret, model call, or paid feature is created by this
document.

## Confirmed platform boundaries

- Workers AI on Workers Free has a shared allocation of 10,000 Neurons per day,
  resetting at 00:00 UTC. Further inference fails after the allowance; using
  more requires Workers Paid. Some listed models require payment and are
  excluded from this design. See [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).
- Workers Free has a 100,000-request daily limit. Further operations fail after
  the free limit. See [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).
- SQLite Durable Objects are available on Workers Free. The free allowance is
  100,000 requests, 5 million rows read, and 100,000 rows written per day, with
  5 GB total storage. Further operations fail after a free limit. See
  [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/).
- Cloudflare's Rate Limiting binding is local to each Cloudflare location,
  permissive, and eventually consistent. Cloudflare says it is not accurate
  accounting, so it cannot enforce the required global ceiling. See
  [Rate Limiting accuracy](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/#accuracy).
- Pages cannot define a Durable Object class. It can bind to a namespace
  exported by a Worker. See [Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/#durable-objects).

## Proposed shared architecture

1. Export one SQLite Durable Object class from the existing `hibalag-ai` Worker.
2. Bind both the Worker and Pages Function to that same namespace as
   `AI_QUOTA` and always address the single object named `global-ai-quota`.
3. Bind Workers AI as `AI` on both deployments. Do not enable AI Gateway unified
   billing or prepaid credits.
4. Use `@cf/meta/llama-3.1-8b-instruct-fp8-fast`, subject to a final read-only
   availability check immediately before approval. It is not on Cloudflare's
   current paid-only model list.
5. Preserve the existing Hibalag system prompt. The provider/model change must
   be identified in release notes.

The single Durable Object serializes quota decisions across both public URLs.
It records only counters and expiry timestamps, never prompts or responses.

## Proposed hard application limits

- Authenticated identity: 5 requests per minute and 20 per UTC day.
- Guest/IP identity: 3 requests per minute and 10 per UTC day.
- Global across Pages and Worker: 50 accepted requests per UTC day.
- Existing route limits: 64 KiB body, 24 messages, 8 KiB per message, 32,000
  schedule characters, 800 output tokens, and 15-second timeout.

The provider's own 10,000-Neuron free ceiling remains the final hard cost stop.
The application request ceiling provides headroom but is not presented as an
exact Neuron calculation because actual inference usage varies.

## Identity and privacy

- The browser sends its current Supabase bearer token when signed in. The server
  validates it with Supabase Auth before treating the request as authenticated.
- Guest requests remain possible but use the stricter IP allowance.
- Counter keys use HMAC-SHA-256 with a server-only `AI_RATE_LIMIT_PEPPER` secret
  so the Durable Object never stores a raw user ID or IP address.
- Logs contain status codes, coarse latency, quota outcome, and provider error
  category only. They exclude tokens, identifiers, prompts, responses, schedule
  text, and conversations.

Creating the pepper and production bindings requires explicit approval. Values
must never enter Git, build output, logs, PR text, or documentation.

## Failure behavior

- `AI_ENABLED=false`, a missing binding, failed Auth validation, failed quota
  storage, exhausted application quota, exhausted Workers AI allowance, model
  capacity error, timeout, or malformed output all fail closed without another
  provider or paid fallback.
- The client distinguishes quota exhaustion or live-AI unavailability from a
  genuinely offline browser and offers the deterministic cached-schedule answer.
- The Durable Object updates counters atomically before inference. Failed model
  calls remain counted, preventing retry abuse.

## Deployment sequence after approval

1. Test the Durable Object and Workers AI adapter locally with mocks only.
2. Review and merge the focused implementation PR with an expected-head guard.
3. Create the Worker-exported SQLite namespace and bindings without billing.
4. Deploy an isolated version/preview with AI disabled; verify failure paths.
5. Enable AI only for one approved fictional request, verify quota accounting,
   privacy-conscious logs, model identity, and zero-dollar usage.
6. Roll out Pages first, then Worker, retaining their prior versions.

## Rollback

Set `AI_ENABLED=false`, restore the prior Pages and Worker versions, and remove
the `AI` and `AI_QUOTA` bindings only after both rollbacks are verified. The
Durable Object namespace may remain unused at zero traffic; deleting it is a
separate destructive action. Code rollback does not alter Supabase or chat data.
