import { test } from "node:test";
import assert from "node:assert/strict";
import { extractVerdict } from "../lib/extract.mjs";

test("extracts a bare verdict object", () => {
  const v = extractVerdict('{"role":"verdict","decision_state":"ALLOW","safe_to_commit":true}');
  assert.equal(v.decision_state, "ALLOW");
});

test("ignores prose with stray braces before the verdict", () => {
  const raw =
    "It uses `${org}` via execSync.\nHere is the result:\n" +
    '{"role":"verdict","decision_state":"HOLD_AMBIGUOUS","safe_to_commit":false}';
  assert.equal(extractVerdict(raw).decision_state, "HOLD_AMBIGUOUS");
});

test("handles braces inside string values", () => {
  const raw =
    "prose {x}\n" +
    '{"decision_state":"DENY_POLICY","reason":"matches a {t} pattern","safe_to_commit":false}';
  assert.equal(extractVerdict(raw).decision_state, "DENY_POLICY");
});

test("extracts a verdict wrapped in a json code fence", () => {
  const raw = '```json\n{"decision_state":"ALLOW","safe_to_commit":true}\n```';
  assert.equal(extractVerdict(raw).decision_state, "ALLOW");
});

test("prefers the verdict object over an earlier non-verdict object", () => {
  const raw =
    '{"note":"scratch"}\n{"decision_state":"ESCALATE_REVIEW","safe_to_commit":false}';
  assert.equal(extractVerdict(raw).decision_state, "ESCALATE_REVIEW");
});

test("returns null when no JSON object is present", () => {
  assert.equal(extractVerdict("no json here at all"), null);
});
