import { test } from "node:test";
import assert from "node:assert/strict";
import { formatRollingTitle, formatRollingBody, formatDeltaComment } from "../lib/report.mjs";

const run = {
  date: "2026-06-29",
  sha: "abc1234",
  target: "homeofe/supply-chain-guard",
  decision_state: "HOLD_AMBIGUOUS",
  result: "hold",
  safe_to_commit: false,
  reason: "two items",
  severityCounts: { critical: 0, high: 1, medium: 1, low: 0 },
};
const findings = [
  { severity: "high", title: "A", file: "a.ts", line: 1, detail: "da" },
  { severity: "medium", title: "B", file: "b.ts", line: 2, detail: "db" },
];

test("rolling title is stable per target (no per-run data)", () => {
  const t = formatRollingTitle(run);
  assert.ok(t.includes("homeofe/supply-chain-guard"));
  assert.ok(!t.includes("2026-06-29"));
});

test("rolling body lists ALL current findings + the verdict", () => {
  const b = formatRollingBody(run, findings);
  assert.ok(b.includes("HOLD_AMBIGUOUS"));
  assert.ok(b.includes("Current findings (2)"));
  assert.ok(b.includes("a.ts") && b.includes("b.ts"));
  assert.ok(b.includes("abc1234"));
});

test("rolling body says None when there are no findings", () => {
  const b = formatRollingBody(run, []);
  assert.ok(b.includes("Current findings (0)"));
  assert.ok(b.includes("None."));
});

test("delta comment lists only the fresh findings", () => {
  const c = formatDeltaComment(run, [findings[0]], 1);
  assert.ok(c.includes("1 new, 1 resolved"));
  assert.ok(c.includes("a.ts"));
  assert.ok(!c.includes("b.ts"));
});

test("delta comment with no fresh findings has no findings section", () => {
  const c = formatDeltaComment(run, [], 0);
  assert.ok(c.includes("0 new, 0 resolved"));
  assert.ok(!c.includes("### New findings"));
});
