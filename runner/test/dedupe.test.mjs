import { test } from "node:test";
import assert from "node:assert/strict";
import { findingKey, diffFindings } from "../lib/dedupe.mjs";

test("findingKey is stable for the same finding", () => {
  const f = { file: "src/scanner.ts", rule: "shell-exec", line: 42 };
  assert.equal(findingKey(f), findingKey({ ...f }));
});

test("findingKey differs by file or line", () => {
  const a = { file: "a.ts", rule: "r", line: 1 };
  const b = { file: "b.ts", rule: "r", line: 1 };
  assert.notEqual(findingKey(a), findingKey(b));
});

test("diffFindings reports fresh and resolved", () => {
  const prevKeys = [findingKey({ file: "old.ts", rule: "r", line: 1 })];
  const current = [{ file: "new.ts", rule: "r", line: 2 }];
  const out = diffFindings(prevKeys, current);
  assert.equal(out.fresh.length, 1);
  assert.equal(out.resolvedKeys.length, 1);
  assert.equal(out.currentKeys.length, 1);
});
