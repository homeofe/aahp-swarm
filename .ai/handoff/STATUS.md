# AAHP-SWARM: Current State of the Nation

> Last updated: 2026-06-28 by claude-opus-4-8
>
> Note (2026-06-28): security fix for three verified findings in hub/server.js.
> (1) Command injection: replaced spawn(cmd, {shell:true}) with spawn(executable,
> args, {shell:false}) after splitting argv and validating with SAFE_COMMAND_RE +
> SHELL_META_RE + FLAG_INJECT_RE allowlists so no shell ever parses user input.
> (2) Missing auth: added checkApiAuth() guard at the top of handleApi() using a
> constant-time Bearer-token comparison; AAHP_HUB_TOKEN env var enables it. Also
> restricted CORS to loopback origins and bound the listener to 127.0.0.1 only.
> (3) SSRF: normalizeProviderUrl() now parses the URL and rejects any scheme that
> is not http: or https: (blocks file://, gopher://, data:, ftp:, etc.).
> 30 new regression tests added in runner/test/hub-security.test.mjs (57 total,
> all pass).
>
> Note (2026-06-28): hardened verdict extraction (lib/extract.mjs). The first
> chef-linux run failed because the agent wrapped its JSON in prose with stray
> braces and the old greedy regex grabbed the wrong span. Now a string-aware
> balanced-brace scan picks the last verdict-shaped object; a failed parse dumps
> the first 800 chars for diagnosis. Prompt output contract tightened. 29 tests.
>
> Note (2026-06-28): runner gained persistent state + a single rolling tracking
> issue per target (lib/state.mjs; report.mjs formatRollingTitle/Body and
> formatDeltaComment), so unattended weekly runs update one issue and only comment
> when findings change instead of re-filing. New --state-file flag (default
> ~/.swarm/<target>-state.json). The deferred public TRUST marker write was removed
> for now. 23 runner tests pass. Prepares the chef-linux weekly cron (Task 5).
>
> Note (2026-06-28): runner tuning validated by a real run against
> supply-chain-guard (issue filed to elvatis/ideabase#23, verdict ESCALATE_REVIEW
> with 5 grounded findings). The agent now runs with cwd set to the checkout and
> read-only tools (Read, Grep, Glob) so it reads the target's actual source; the
> prompt is passed on stdin to avoid the command-line length limit; the agent exec
> is cross-platform (cmd.exe wrapper on Windows for the claude.cmd launcher).
>
> Note (2026-06-28): runner: replaced swarm-review.mjs with the prescribed execFileSync (shell-free) orchestration and aligned assemblePrompt to {roles, profile, repoTree}. The prior inferred version used execSync with shell-interpolated target argument (command injection). All 15 tests pass; dry-run verified.
>
> Note (2026-06-28): added orchestration CLI runner/swarm-review.mjs and the
> prompt assembler runner/lib/prompt.mjs. The CLI clones a target repo, assembles
> the swarm prompt from roles/ and the target's .ai/swarm/profile.md, invokes the
> claude agent (or prints [dry-run] lines and exits 0 in --dry-run mode), validates
> the typed verdict, deduplicates findings, and writes the cadence marker back to
> the target repo. Tests grow from 14 to 15 (all pass).
>
> Note (2026-06-28): runner: hardened findingKey against separator collisions,
> short-circuited the ambiguity check on invalid states, aligned issue-body count.
> findingKey now uses JSON.stringify so a pipe character in file/rule fields cannot
> collide two distinct findings; the ambiguity guard only fires for a recognized
> DECISION_STATES member; formatIssueBody uses freshCount with a fresh.length
> fallback. Tests grow from 11 to 14 (all pass).
>
> Note (2026-06-28): added runner/ -- the reference swarm review runner with
> pure, unit-tested logic: verdict validation (runner/lib/verdict.mjs), finding
> dedupe (runner/lib/dedupe.mjs), and report formatters (runner/lib/report.mjs).
> Tests live in runner/test/ (11 tests, all pass). No external npm dependencies;
> uses only node:crypto and node:test.
>
> Note (2026-06-28): synced pre-existing handoff edits (NEXT_ACTIONS issue links
> for T-001..T-007) and added `.ai/logs/` to .gitignore. Workspace prep ahead of
> adding the reference runner under runner/.
>
**Rule:** This file is rewritten at the end of every active session.

## Summary

The AAHP gate is live (scripts plus the AAHP Verify workflow and a real,
generated MANIFEST.json). The repository also now carries the AAHP Swarm
pitch deck (EN + DE) under work/elvatis-pitch-refresh-handoff/ as a finished
deliverable: HTML sources, locally bundled fonts, an image-based PDF exporter,
and the two final PDFs. The Verdict and Risk roles now carry the Typed Verdict
Layer (docs/typed-verdict-layer.md): ambiguity is a first-class HOLD state, never
a silent pass or block.

## [2026-06-28] Typed Verdict Layer (TVL)

**Agent:** claude-opus-4-8
**Phase:** implementation

### What was done

- Added docs/typed-verdict-layer.md: a code-review-framed design spec for typed
  ambiguity governance (derived from a production policy-bypass finding). Core
  rule: an unknown classification never collapses to pass or block; it resolves to
  a typed HOLD, ESCALATE, or FAIL state with an owner and an expiry.
- Extended schemas/verdict.schema.json with decision_state (ALLOW, DENY_POLICY,
  HOLD_AMBIGUOUS, HOLD_METADATA_REQUIRED, ESCALATE_REVIEW, FAIL_CONFIGURATION), an
  ambiguity object (five state dimensions plus owner), result `hold`, and the
  invariant that safe_to_commit is true only when decision_state == ALLOW.
- Updated roles/verdict.md and roles/risk.md for the typed states and ambiguity
  detection; added roles/controller.md (loop prevention, repetition compression)
  and roles/telemetry.md (execution-state verification, authorization is not
  success).
- Updated docs/SWARM-ROLE-MODEL.md for the hold verdict and the two new roles.

## [2026-06-28] Pitch deck (EN + DE) added

**Agent:** claude-opus-4-8
**Phase:** implementation

### What was done

- Added the AAHP Swarm Elvatis pitch deck under
  work/elvatis-pitch-refresh-handoff/: index.html (EN) and index-de.html (DE)
  source decks, the assets/ font bundle, and the two final image-based PDFs
  (EN _fixed.pdf, DE _DE.pdf).
- Added export-pdf.mjs (image-based exporter that rasterizes each slide so the
  PDF renders identically in every viewer, avoiding type-1 shading artifacts)
  and render-check.mjs (verifier).
- Fixed three DE-only slide-1 layout issues (Erkenntnis label overflow, hero
  headline wrapping to a 4th line, Problem-bullet box overflow) by measuring the
  rendered widths and tuning index-de.html only; the EN deck was untouched.
- A local .gitignore keeps the regenerable QA render folders out of the repo.

## [2026-06-27] AAHP onboarding

**Agent:** claude-opus-4-8
**Phase:** implementation

### What was done

- Added the AAHP toolchain verbatim from homeofe/AAHP: scripts/_aahp-lib.sh,
  scripts/aahp-manifest.sh, scripts/verify-handoff.sh, scripts/lint-handoff.sh,
  scripts/validate-pii-allowlist.py, scripts/aahp-archive.sh.
- Added .github/workflows/aahp-verify.yml (runs aahp verify --level ci).
- Added the canonical .ai/handoff/pii-allowlist.json (empty allowlist).
- Regenerated .ai/handoff/MANIFEST.json with real checksums and a HEAD commit
  pointer, replacing the placeholder bootstrap manifest.
- Added the AAHP Verify badge to README.md.

## Build Health

| Check | Result | Notes |
|-------|--------|-------|
| `bootstrap` | OK | Scaffolded repository structure |

## Components

| Component | Path | State |
|-----------|------|-------|
| Roles | .claude/agents | Drafts present |
| Commands | .claude/commands | Drafts present |
| Workflows | .claude/workflows | Drafts present |
| Schemas | schemas | verdict.schema typed (TVL) |
| Typed Verdict Layer | docs/typed-verdict-layer.md, roles/ | Design v0.1 |
| Runtime | runtime/* | Skeleton present |
| Pitch deck | work/elvatis-pitch-refresh-handoff | EN + DE final |

> 2026-06-30 ci: add Dependabot config (per-repo ecosystems) + exempt Dependabot from the aahp-verify handoff gate.
