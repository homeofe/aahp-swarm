import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { assemblePrompt } from "../lib/prompt.mjs";

// Build a minimal fake roles dir and target dir in a temp location.
const tmp = mkdtempSync(join(tmpdir(), "prompt-test-"));
const rolesDir = join(tmp, "roles");
const targetDir = join(tmp, "target");
const swarmDir = join(targetDir, ".ai", "swarm");

mkdirSync(rolesDir, { recursive: true });
mkdirSync(swarmDir, { recursive: true });

writeFileSync(join(rolesDir, "risk.md"), "# Risk Role\nIdentify safety risks.");
writeFileSync(join(rolesDir, "verdict.md"), "# Verdict Role\nAggregate into a typed decision.");
writeFileSync(join(swarmDir, "profile.md"), "# Swarm review profile: test-repo\n\n## Scope\nCheck correctness.");

test("assemblePrompt includes roles and profile and reports byte count", () => {
  const result = assemblePrompt({ rolesDir, targetDir });
  assert.ok(result.prompt.includes("Risk Role"), "prompt should include role heading");
  assert.ok(result.prompt.includes("Swarm review profile"), "prompt should include profile heading");
  assert.equal(typeof result.bytes, "number", "bytes should be a number");
  assert.ok(result.bytes > 0, "bytes should be positive");
  assert.equal(result.bytes, Buffer.byteLength(result.prompt, "utf8"));
});

// Cleanup after tests complete.
process.on("exit", () => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ } });
