# AI route guardrails

## Enforced before any provider call

- Request bodies are limited to 64 KiB, including streamed bodies without a
  `Content-Length` header.
- Chat history is limited to 24 user/assistant messages.
- Each serialized message is limited to 8 KiB.
- The final message must come from the user; client-supplied system messages are
  rejected.
- Only the supported language choices are accepted.
- Client-supplied schedule context is ignored. The server obtains schedule
  context from the public, RLS-protected Supabase schedule view.
- Server-supplied schedule context is limited to 32,000 characters.
- Provider output is limited to 800 tokens and the request is aborted after 15
  seconds.

These checks apply to the existing Lovable gateway route without changing its
provider, `google/gemini-3.6-flash` model, system prompt, or secret name.

## Cloudflare live-AI path (implemented, not enabled)

- `AI_ENABLED` must be exactly `true`; missing or false fails closed.
- Signed-in requests send the current Supabase bearer token to the same-origin
  route. The route validates it with Supabase Auth before using the account's
  opaque ID for quota identity. Invalid tokens never degrade to guest access.
- Guest requests require Cloudflare's `CF-Connecting-IP` and receive the
  stricter guest quota. Raw IDs and addresses are HMAC-pseudonymized before the
  shared SQLite Durable Object sees them.
- The shared hard limits are 5/minute and 20/day per signed-in user, 3/minute
  and 10/day per guest IP, and 20/day globally across Pages and Worker.
- A quota-storage error, missing binding or pepper, exhausted limit, provider
  error, malformed output, or timeout returns an unavailable or quota status
  and the client uses the deterministic schedule fallback. Failed inference
  attempts stay counted and there are no automatic retries or alternate-model
  fallbacks.
- The model is `@cf/meta/llama-3.1-8b-instruct-fp8`. The existing system
  prompt and schedule-grounding rules remain unchanged. The retained Lovable
  route continues to use its existing gateway, provider, model, prompt, and
  server-side credential when it is not running in Cloudflare.
- Application logs do not intentionally include tokens, identities, prompts,
  conversations, schedule text, responses, or secrets.

Creating the production bindings and pepper, enabling AI, and invoking the
model remain approval-gated external changes. No resource or secret is created
by this implementation branch.

Routine tests use fictional messages and run without `LOVABLE_API_KEY`; they do
not invoke live AI.

## Rollback

Revert the guardrail commit to restore the previous request handling. Reverting
application code does not change provider credentials, bindings, usage, or
stored chat data.
