# AAHP-SWARM: Current State of the Nation

> Last updated: 2026-06-28 by claude-opus-4-8
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
