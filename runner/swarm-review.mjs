#!/usr/bin/env node
/**
 * swarm-review.mjs -- Orchestration CLI for aahp-swarm reviews.
 *
 * Usage:
 *   node runner/swarm-review.mjs <owner/repo> [--dry-run]
 *
 * In dry-run mode the tool clones the target repo, assembles the prompt, and
 * prints the byte count without invoking the agent. Useful for smoke-testing
 * the prompt assembly pipeline without a live claude CLI.
 *
 * In live mode the tool:
 *   1. Clones the target repo to a temp directory.
 *   2. Assembles the swarm prompt (roles + profile).
 *   3. Calls the server-side claude CLI with the prompt piped to stdin.
 *   4. Validates the verdict JSON returned by the agent.
 *   5. Diffs findings against the previous run (deduplication).
 *   6. Writes the swarm report back to the target repo's .ai/swarm/ directory.
 *
 * Dependencies: node built-ins only (node:child_process, node:fs, node:os,
 * node:path, node:crypto). No npm packages.
 */

import { execSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { assemblePrompt } from "./lib/prompt.mjs";
import { validateVerdict } from "./lib/verdict.mjs";
import { diffFindings } from "./lib/dedupe.mjs";
import { formatCadenceMarker, formatIssueTitle, formatIssueBody } from "./lib/report.mjs";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
// The roles/ directory lives two levels up from runner/
const REPO_ROOT = resolve(__dirname, "..");
const ROLES_DIR = join(REPO_ROOT, "roles");

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const positional = args.filter((a) => !a.startsWith("--"));

if (positional.length === 0) {
  console.error("Usage: node runner/swarm-review.mjs <owner/repo> [--dry-run]");
  process.exit(1);
}

const target = positional[0]; // e.g. "homeofe/supply-chain-guard"
if (!target.includes("/")) {
  console.error(`Error: target must be in owner/repo format, got: ${target}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Clone
// ---------------------------------------------------------------------------

const workDir = mkdtempSync(join(tmpdir(), "swarm-review-"));
const cloneDir = join(workDir, "repo");

console.log(`[swarm-review] cloning https://github.com/${target} ...`);
try {
  execSync(`git clone --depth 1 https://github.com/${target} ${cloneDir}`, {
    stdio: ["ignore", "ignore", "pipe"],
  });
} catch (err) {
  console.error(`[swarm-review] clone failed: ${err.stderr?.toString().trim() ?? err.message}`);
  rmSync(workDir, { recursive: true, force: true });
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Assemble prompt
// ---------------------------------------------------------------------------

const { prompt, bytes } = assemblePrompt({ rolesDir: ROLES_DIR, targetDir: cloneDir });

if (dryRun) {
  console.log(`[dry-run] prompt assembled: ${bytes} bytes`);
  console.log(`[dry-run] would invoke agent against ${target} -- skipping`);
  rmSync(workDir, { recursive: true, force: true });
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Run agent
// ---------------------------------------------------------------------------

console.log(`[swarm-review] running agent against ${target} (${bytes} bytes prompt) ...`);

const agentResult = spawnSync("claude", ["--output-format", "json", "--print", "--verbose"], {
  input: prompt,
  encoding: "utf8",
  maxBuffer: 8 * 1024 * 1024,
});

if (agentResult.error) {
  console.error(`[swarm-review] agent invocation failed: ${agentResult.error.message}`);
  rmSync(workDir, { recursive: true, force: true });
  process.exit(1);
}

if (agentResult.status !== 0) {
  console.error(`[swarm-review] agent exited with status ${agentResult.status}`);
  console.error(agentResult.stderr);
  rmSync(workDir, { recursive: true, force: true });
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Parse + validate verdict
// ---------------------------------------------------------------------------

let verdict;
try {
  // The agent returns JSON; find the last top-level JSON object in the output.
  const output = agentResult.stdout.trim();
  const jsonMatch = output.match(/\{[\s\S]*\}(?=[^}]*$)/);
  if (!jsonMatch) throw new Error("no JSON object found in agent output");
  verdict = JSON.parse(jsonMatch[0]);
} catch (err) {
  console.error(`[swarm-review] failed to parse agent output as JSON: ${err.message}`);
  rmSync(workDir, { recursive: true, force: true });
  process.exit(1);
}

const validation = validateVerdict(verdict);
if (!validation.ok) {
  console.error("[swarm-review] verdict validation failed:");
  for (const e of validation.errors) console.error("  -", e);
  rmSync(workDir, { recursive: true, force: true });
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Deduplicate findings
// ---------------------------------------------------------------------------

const swarmStateDir = join(cloneDir, ".ai", "swarm");
const prevStateFile = join(swarmStateDir, "prev-keys.json");
let prevKeys = [];
if (existsSync(prevStateFile)) {
  try {
    prevKeys = JSON.parse(readFileSync(prevStateFile, "utf8"));
  } catch {
    prevKeys = [];
  }
}

const currentFindings = verdict.findings ?? [];
const { fresh, resolvedKeys, currentKeys } = diffFindings(prevKeys, currentFindings);

// ---------------------------------------------------------------------------
// Assemble run record for report formatters
// ---------------------------------------------------------------------------

const sha = execSync("git -C " + cloneDir + " rev-parse --short HEAD", { encoding: "utf8" }).trim();
const date = new Date().toISOString().slice(0, 10);
const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
for (const f of currentFindings) {
  const sev = (f.severity ?? "low").toLowerCase();
  if (sev in severityCounts) severityCounts[sev]++;
}

const run = {
  date,
  sha,
  target,
  decision_state: verdict.decision_state,
  result: verdict.result,
  safe_to_commit: verdict.safe_to_commit,
  reason: verdict.reason ?? "",
  severityCounts,
  freshCount: fresh.length,
  fresh,
};

// ---------------------------------------------------------------------------
// Write back
// ---------------------------------------------------------------------------

mkdirSync(swarmStateDir, { recursive: true });

// Update the previous-keys store.
writeFileSync(prevStateFile, JSON.stringify(currentKeys, null, 2) + "\n");

// Write the cadence marker (sanitized, safe-to-publish).
const markerFile = join(swarmStateDir, "last-review.txt");
writeFileSync(markerFile, formatCadenceMarker(run) + "\n");

// Write the full issue body to a private log (not committed by this script).
const logFile = join(workDir, "issue-body.md");
writeFileSync(logFile, formatIssueTitle(run) + "\n\n" + formatIssueBody(run) + "\n");

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`[swarm-review] verdict: ${verdict.decision_state} (safe_to_commit=${verdict.safe_to_commit})`);
console.log(`[swarm-review] findings: ${currentFindings.length} total, ${fresh.length} fresh, ${resolvedKeys.length} resolved`);
console.log(`[swarm-review] cadence marker: ${formatCadenceMarker(run)}`);
console.log(`[swarm-review] issue body written to: ${logFile}`);

rmSync(workDir, { recursive: true, force: true });
process.exit(verdict.safe_to_commit ? 0 : 1);
