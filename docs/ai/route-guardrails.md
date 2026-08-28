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
- Provider output is limited to 800 tokens and the request is aborted after 15
  seconds.

These checks apply to the existing Lovable gateway route without changing its
provider, `google/gemini-3.6-flash` model, system prompt, or secret name.

## Still required before Cloudflare live AI

Hard per-user, per-IP, and global daily limits cannot be guaranteed with
per-process memory because Cloudflare may run multiple isolates. The production
design therefore still requires an approved durable zero-dollar counter or
rate-limiting binding, an emergency-off configuration, and verified
quota-exhaustion behavior. No binding, provider, model, secret, or external
resource is created by this change.

Routine tests use fictional messages and run without `LOVABLE_API_KEY`; they do
not invoke live AI.

## Rollback

Revert the guardrail commit to restore the previous request handling. Reverting
application code does not change provider credentials, bindings, usage, or
stored chat data.
