# OAuth primary-origin cutover

## Confirmed current state

- The application requests a return to its exact runtime origin for Google OAuth
  and email confirmation.
- Supabase's Google callback is
  `https://zfjehsrnsszxbtqvgbwq.supabase.co/auth/v1/callback`.
- That callback is already registered in the Google Cloud Web OAuth client.
- Google Cloud already lists `https://hibalag-ai.pages.dev` as an authorized
  JavaScript origin. Google Search Console does not control OAuth redirects.
- Supabase uses `https://hibalag-ai.pages.dev` as its Site URL. Its redirect
  allowlist includes the Pages, Worker, and retained Lovable origins.
- The owner verified Google login from Pages and Workers returns to the same
  Cloudflare origin that started the flow.

No Google Cloud client, callback, provider, or secret change was required.

## Applied Supabase configuration

1. Site URL: `https://hibalag-ai.pages.dev`.
2. Redirect URL: `https://hibalag-ai.pages.dev/**`.
3. Redirect URL: `https://hibalag-ai.doodstecson.workers.dev/**`.
4. Existing Lovable production and preview Redirect URLs retained.
5. Google provider callback, client ID, and client secret unchanged.

No Google Cloud or Search Console change is currently required.

## Verification

Google login from Pages and Workers is confirmed to return to the initiating
origin. Email confirmation and the retained Lovable journey still require a
fictional-account release-candidate test. No token is recorded here.

## Rollback

Restore the Supabase Site URL to `https://hibalag-ai.lovable.app`. Retain the
new Redirect URLs unless there is a demonstrated security reason to remove
them; removing them is a separate external configuration action. Revert the
repository commit to restore the former canonical metadata. OAuth configuration
rollback and code rollback are independent.
