# AAHP-SWARM: Current State of the Nation

> Last updated: 2026-06-28 by claude-opus-4-8
>
**Rule:** This file is rewritten at the end of every active session.

## Summary

The AAHP gate is live (scripts plus the AAHP Verify workflow and a real,
generated MANIFEST.json). The repository also now carries the AAHP Swarm
pitch deck (EN + DE) under work/elvatis-pitch-refresh-handoff/ as a finished
deliverable: HTML sources, locally bundled fonts, an image-based PDF exporter,
and the two final PDFs.

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
| Schemas | schemas | Drafts present |
| Runtime | runtime/* | Skeleton present |
| Pitch deck | work/elvatis-pitch-refresh-handoff | EN + DE final |
