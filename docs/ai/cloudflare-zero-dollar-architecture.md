# Cloudflare zero-dollar live AI architecture

This branch implements and mock-tests the approval-ready design. Its checked-in
Cloudflare configuration keeps `AI_ENABLED=false`; no Cloudflare resource,
binding, secret, model call, deployment, or paid feature has been created.

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
4. Use `@cf/meta/llama-3.1-8b-instruct-fp8`. The 2026-08-29 official model and
   pricing catalogs list it, and it is not on Cloudflare's current paid-only
   model list.
5. Preserve the existing Hibalag system prompt. The provider/model change must
   be identified in release notes.

The single Durable Object serializes quota decisions across both public URLs.
It records only counters and expiry timestamps, never prompts or responses.

## Proposed hard application limits

- Authenticated identity: 5 requests per minute and 20 per UTC day.
- Guest/IP identity: 3 requests per minute and 10 per UTC day.
- Global across Pages and Worker: 20 accepted requests per UTC day.
- Existing route limits: 64 KiB body, 24 messages, 8 KiB per message, 32,000
  schedule characters, 800 output tokens, and a 15-second application response
  timeout.

The timeout limits how long Hibalag waits; it does not guarantee cancellation
of an already accepted inference. Cloudflare's current `env.AI.run()` binding
does not document an application-controlled cancellation signal. A timed-out
inference may therefore continue consuming free Neurons. Its quota reservation
remains counted, and Hibalag does not retry or select another model.

Cloudflare lists 13,778 Neurons per million input tokens and 26,128 Neurons per
million output tokens for this model. A deliberately conservative bound of the
full 32,000-token context as input plus the route's full 800-token output is
about 461.8 Neurons per accepted request, or about 9,236 Neurons for 20
requests. This leaves roughly 764 Neurons of application-level headroom when
Hibalag is the only Workers AI consumer in the account. Actual tokenization and
inference usage vary, and other account-level Workers AI usage consumes the
same allowance. Cloudflare's own 10,000-Neuron free ceiling remains the final
fail-closed cost stop.

## Model terms and data handling

- **Built with Llama.** [Meta's Llama 3.1 model card](https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/MODEL_CARD.md)
  describes commercial and research use as intended uses. Its Community
  License is royalty-free for the
  normal use contemplated here, subject to its Acceptable Use Policy and the
  special license requirement for organizations above 700 million monthly
  active users. Hibalag must retain this attribution in product or release
  documentation.
- Cloudflare receives the bounded system prompt, the user's bounded chat
  history, and the generated response to perform inference. Hibalag does not
  send email addresses, Supabase user IDs, IP addresses, database records, or
  credentials to the model.
- [Cloudflare says Workers AI Customer Content](https://developers.cloudflare.com/workers-ai/platform/data-usage/)
  is not shared with other
  Cloudflare customers and is not used to train models or improve Cloudflare or
  third-party services without explicit consent. Hibalag does not add R2, KV,
  Vectorize, AI Gateway logging, or another prompt-storage service.
- The SQLite Durable Object stores only HMAC-pseudonymized counter keys, counts,
  and expiry timestamps. It never stores prompts, responses, schedule text,
  raw user IDs, raw IP addresses, tokens, or secrets.

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

The reviewed binding names are `AI`, `AI_QUOTA`, `AI_ENABLED`, and the secret
`AI_RATE_LIMIT_PEPPER`. Worker and Pages packages are generated with
`AI_ENABLED=false`; Pages references the quota class exported by the
`hibalag-ai` Worker so both URLs use the single `global-ai-quota` object.

## Failure behavior

- `AI_ENABLED=false`, a missing binding, failed Auth validation, failed quota
  storage, exhausted application quota, exhausted Workers AI allowance, model
  capacity error, timeout, or malformed output all fail closed without another
  provider or paid fallback.
- The client distinguishes quota exhaustion or live-AI unavailability from a
  genuinely offline browser and offers the deterministic cached-schedule answer.
- The Durable Object updates counters atomically before inference. Failed model
  calls and timeouts remain counted, preventing retry abuse. Each accepted
  request makes at most one inference call.
- `AI_ENABLED=false` immediately rejects new application requests. It cannot
  cancel an inference that Cloudflare has already accepted.

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
