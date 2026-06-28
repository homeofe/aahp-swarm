import { test } from "node:test";
import assert from "node:assert/strict";
import { validateVerdict } from "../lib/verdict.mjs";

test("accepts a clean ALLOW verdict", () => {
  const v = { role: "verdict", result: "pass", decision_state: "ALLOW", blocking: false, safe_to_commit: true };
  assert.deepEqual(validateVerdict(v), { ok: true, errors: [] });
});

test("rejects an unknown result", () => {
  const v = { role: "verdict", result: "maybe", decision_state: "ALLOW", blocking: false, safe_to_commit: true };
  assert.equal(validateVerdict(v).ok, false);
});

test("rejects safe_to_commit true on a HOLD state", () => {
  const v = { role: "verdict", result: "hold", decision_state: "HOLD_AMBIGUOUS", blocking: true, safe_to_commit: true, ambiguity: {} };
  const r = validateVerdict(v);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("safe_to_commit")));
});

test("requires an ambiguity object on a non-ALLOW non-DENY state", () => {
  const v = { role: "verdict", result: "hold", decision_state: "ESCALATE_REVIEW", blocking: true, safe_to_commit: false };
  const r = validateVerdict(v);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("ambiguity")));
});

test("rejects a non-object", () => {
  assert.equal(validateVerdict(null).ok, false);
});

test("an invalid decision_state does not also demand ambiguity", () => {
  const v = { role: "verdict", result: "hold", decision_state: "UNKNOWN", blocking: true, safe_to_commit: false };
  const r = validateVerdict(v);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("decision_state")));
  assert.ok(!r.errors.some((e) => e.includes("ambiguity")));
});
