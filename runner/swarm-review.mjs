#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { validateVerdict } from "./lib/verdict.mjs";
import { diffFindings } from "./lib/dedupe.mjs";
import { assemblePrompt } from "./lib/prompt.mjs";
import { loadState, saveState } from "./lib/state.mjs";
import { formatCadenceMarker, formatRollingTitle, formatRollingBody, formatDeltaComment } from "./lib/report.mjs";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && i + 1 < process.argv.length && !process.argv[i + 1].startsWith("--")) {
    return process.argv[i + 1];
  }
  if (process.argv.includes(`--${name}`)) return true;
  return fallback;
}

function git(args, opts = {}) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...opts });
}

function readRoles(rolesDir) {
  return ["scout", "tester", "risk", "verdict"]
    .map((r) => `### ${r}\n` + readFileSync(join(rolesDir, `${r}.md`), "utf8"))
    .join("\n\n");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const targetRepo = arg("target-repo", "https://github.com/homeofe/supply-chain-guard");
const sinkRepo = arg("sink-repo", "elvatis/ideabase");
const rolesDir = arg("roles-dir", join(process.cwd(), "..", "roles"));
const profilePath = arg("profile-path", ".ai/swarm/profile.md");
const stateFile = arg(
  "state-file",
  join(homedir(), ".swarm", targetRepo.replace("https://github.com/", "").replace(/[^A-Za-z0-9._-]/g, "_") + "-state.json"),
);
const dryRun = Boolean(arg("dry-run", false));

const work = mkdtempSync(join(tmpdir(), "swarm-"));
const checkout = join(work, "repo");
git(["clone", "--depth", "1", targetRepo, checkout]);
const sha = git(["-C", checkout, "rev-parse", "--short", "HEAD"]).trim();

const profile = existsSync(join(checkout, profilePath))
  ? readFileSync(join(checkout, profilePath), "utf8")
  : "(no profile found in target; review against the role contracts only)";
const repoTree = readdirSync(join(checkout, "src"), { recursive: true })
  .filter((p) => typeof p === "string" && p.endsWith(".ts"))
  .map((p) => `src/${p}`)
  .join("\n");

const prompt = assemblePrompt({ roles: readRoles(rolesDir), profile, repoTree });

if (dryRun) {
  console.log(`[dry-run] target=${targetRepo}@${sha} sink=${sinkRepo}`);
  console.log(`[dry-run] prompt bytes=${prompt.length}`);
  process.exit(0);
}

// The authenticated claude CLI runs the prompt in headless print mode with its
// working directory set to the checkout, so it can read the target's source with
// read-only tools (Read, Grep, Glob). The prompt is passed on stdin to avoid the
// command-line length limit. No API key is passed here; auth is the environment's
// existing claude session. On Windows the npm launcher is claude.cmd, which Node
// cannot exec directly, so it is routed through cmd.exe with fixed, safe args.
const agentFlags = ["-p", "--output-format", "text", "--allowedTools", "Read", "Grep", "Glob"];
const agentOpts = { cwd: checkout, input: prompt, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 };
const raw = process.platform === "win32"
  ? execFileSync("cmd.exe", ["/d", "/s", "/c", "claude", ...agentFlags], agentOpts)
  : execFileSync("claude", agentFlags, agentOpts);

const match = raw.match(/\{[\s\S]*\}/);
if (!match) {
  console.error("no JSON object found in agent output");
  process.exit(2);
}
const parsed = JSON.parse(match[0]);
const verdict = validateVerdict(parsed);
if (!verdict.ok) {
  console.error("verdict failed validation: " + verdict.errors.join("; "));
  process.exit(3);
}

const findings = Array.isArray(parsed.findings) ? parsed.findings : [];
const state = loadState(stateFile);
const diff = diffFindings(state.prevKeys, findings);

const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
for (const f of findings) {
  if (severityCounts[f.severity] !== undefined) severityCounts[f.severity] += 1;
}
const run = {
  date: today(),
  sha,
  target: targetRepo.replace("https://github.com/", ""),
  decision_state: parsed.decision_state,
  result: parsed.result,
  safe_to_commit: parsed.safe_to_commit,
  reason: parsed.reason,
  severityCounts,
  freshCount: diff.fresh.length,
  fresh: diff.fresh,
};

// Private sink: one rolling tracking issue per target. The body always reflects
// the latest run; a comment is posted only when findings changed since the last
// run, so unchanged findings are not re-filed week after week.
function gh(ghArgs) {
  return execFileSync("gh", ghArgs, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
}

const body = formatRollingBody(run, findings);
let issueNumber = state.issueNumber;
let updatedExisting = false;
if (issueNumber != null) {
  try {
    gh(["issue", "edit", String(issueNumber), "--repo", sinkRepo, "--body", body]);
    updatedExisting = true;
  } catch {
    // The tracking issue is gone (deleted); fall back to creating a new one.
    issueNumber = null;
  }
}
if (issueNumber == null) {
  const out = gh(["issue", "create", "--repo", sinkRepo, "--title", formatRollingTitle(run), "--body", body, "--label", "swarm-review"]);
  const m = out.match(/\/issues\/(\d+)/);
  issueNumber = m ? Number(m[1]) : null;
  console.log("created rolling issue: " + out.trim());
}
if (updatedExisting) {
  if (diff.fresh.length > 0 || diff.resolvedKeys.length > 0) {
    gh(["issue", "comment", String(issueNumber), "--repo", sinkRepo, "--body", formatDeltaComment(run, diff.fresh, diff.resolvedKeys.length)]);
    console.log(`issue #${issueNumber}: ${diff.fresh.length} new, ${diff.resolvedKeys.length} resolved (comment posted)`);
  } else {
    console.log(`issue #${issueNumber}: no change since last run (body refreshed)`);
  }
}

saveState(stateFile, { issueNumber, prevKeys: diff.currentKeys });
console.log("swarm review complete: " + formatCadenceMarker(run));
