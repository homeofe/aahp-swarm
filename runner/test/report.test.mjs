import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCadenceMarker, formatIssueTitle, formatIssueBody } from "../lib/report.mjs";

const run = {
  date: "2026-06-29",
  sha: "abcdef1",
  target: "homeofe/supply-chain-guard",
  decision_state: "HOLD_AMBIGUOUS",
  result: "hold",
  safe_to_commit: false,
  reason: "two detector bypasses need review",
  severityCounts: { critical: 0, high: 1, medium: 1, low: 0 },
  freshCount: 2,
  fresh: [{ severity: "high", title: "regex bypass", file: "src/x.ts", line: 9, detail: "crafted input evades rule R" }],
};

test("cadence marker is sanitized (counts only, no detail)", () => {
  const m = formatCadenceMarker(run);
  assert.ok(m.includes("HOLD_AMBIGUOUS"));
  assert.ok(m.includes("high:1"));
  assert.ok(!m.includes("crafted input"));
  assert.ok(!m.includes("src/x.ts"));
});

test("issue title carries the verdict and fresh count", () => {
  assert.ok(formatIssueTitle(run).includes("HOLD_AMBIGUOUS"));
  assert.ok(formatIssueTitle(run).includes("2"));
});

test("issue body carries the full finding detail", () => {
  const b = formatIssueBody(run);
  assert.ok(b.includes("crafted input evades rule R"));
  assert.ok(b.includes("src/x.ts"));
});
