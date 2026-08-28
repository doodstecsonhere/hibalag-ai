import assert from "node:assert/strict";
import test from "node:test";

import { authRedirectUrl, appUrl, PUBLIC_APP_URL } from "./app-url.ts";

test("Pages is the default canonical public origin", () => {
  assert.equal(PUBLIC_APP_URL, "https://hibalag-ai.pages.dev");
  assert.equal(
    appUrl("/chat/fictional-thread"),
    "https://hibalag-ai.pages.dev/chat/fictional-thread",
  );
});

test("OAuth returns to the exact environment origin without carrying a route", () => {
  assert.equal(
    authRedirectUrl("https://hibalag-ai.pages.dev/chat/fictional"),
    "https://hibalag-ai.pages.dev",
  );
  assert.equal(
    authRedirectUrl("https://hibalag-ai.doodstecson.workers.dev/"),
    "https://hibalag-ai.doodstecson.workers.dev",
  );
  assert.equal(
    authRedirectUrl("https://hibalag-ai.lovable.app/"),
    "https://hibalag-ai.lovable.app",
  );
});
