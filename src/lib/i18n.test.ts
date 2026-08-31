import assert from "node:assert/strict";
import test from "node:test";

import { LANGUAGES, translate } from "./i18n.ts";

test("the optional login action is consistently labeled as beta", () => {
  for (const language of LANGUAGES) {
    assert.equal(translate(language, "threads.login"), "Log in (Beta)");
  }
});
