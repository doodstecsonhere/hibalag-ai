# OAuth primary-origin cutover

## Confirmed current state

- The application requests a return to its exact runtime origin for Google OAuth
  and email confirmation.
- Supabase's Google callback is
  `https://zfjehsrnsszxbtqvgbwq.supabase.co/auth/v1/callback`.
- That callback is already registered in the Google Cloud Web OAuth client.
- Google Cloud already lists `https://hibalag-ai.pages.dev` as an authorized
  JavaScript origin. Google Search Console does not control OAuth redirects.
- Supabase still uses the Lovable deployment as its Site URL and currently
  allows only Lovable production and preview returns. Supabase therefore falls
  back to Lovable when Pages requests an unlisted return URL.

No external setting was changed while preparing this document.

## Approval-gated Supabase change

1. Change the Supabase Site URL to `https://hibalag-ai.pages.dev`.
2. Add `https://hibalag-ai.pages.dev/**` to Redirect URLs.
3. Add `https://hibalag-ai.doodstecson.workers.dev/**` to Redirect URLs.
4. Retain the existing Lovable production and preview Redirect URLs.
5. Do not change the Google provider callback, client ID, or client secret.

No Google Cloud or Search Console change is currently required.

## Verification

Using fictional accounts only, test Google login and email confirmation from
Pages, Worker, and Lovable. Each journey must return to the same origin that
started it. Confirm that an unlisted fictional origin still falls back to the
Pages Site URL and that no token appears in logs or documentation.

## Rollback

Restore the Supabase Site URL to `https://hibalag-ai.lovable.app`. Retain the
new Redirect URLs unless there is a demonstrated security reason to remove
them; removing them is a separate external configuration action. Revert the
repository commit to restore the former canonical metadata. OAuth configuration
rollback and code rollback are independent.
