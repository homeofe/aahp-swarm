import { test } from "node:test";
import assert from "node:assert/strict";
import { assemblePrompt } from "../lib/prompt.mjs";

test("prompt embeds roles, profile, and repo tree and demands JSON-only output", () => {
  const p = assemblePrompt({
    roles: "SCOUT ROLE TEXT",
    profile: "PROFILE TEXT",
    repoTree: "src/scanner.ts\nsrc/cli.ts",
  });
  assert.ok(p.includes("SCOUT ROLE TEXT"));
  assert.ok(p.includes("PROFILE TEXT"));
  assert.ok(p.includes("src/scanner.ts"));
  assert.ok(/json/i.test(p));
});
