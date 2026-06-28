import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadState, saveState } from "../lib/state.mjs";

test("loadState returns empty defaults when the file is missing", () => {
  const s = loadState(join(tmpdir(), `swarm-absent-${process.pid}-${process.hrtime.bigint()}.json`));
  assert.deepEqual(s, { issueNumber: null, prevKeys: [] });
});

test("saveState creates the directory and round-trips", () => {
  const dir = mkdtempSync(join(tmpdir(), "swarm-state-"));
  try {
    const f = join(dir, "nested", "state.json"); // nested dir must be created
    saveState(f, { issueNumber: 42, prevKeys: ["a", "b"] });
    assert.deepEqual(loadState(f), { issueNumber: 42, prevKeys: ["a", "b"] });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadState tolerates a corrupt file", () => {
  const dir = mkdtempSync(join(tmpdir(), "swarm-state-"));
  try {
    const f = join(dir, "state.json");
    writeFileSync(f, "{ not valid json");
    assert.deepEqual(loadState(f), { issueNumber: null, prevKeys: [] });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
