# aahp-swarm

AAHP Swarm is a role based system for review and verification workflows that
extends the AAHP protocol with dedicated agent roles.

Current status is v0.2 design draft and review-first runtime planning.

## Purpose

- Add a review safety layer to existing AI agent pipelines.
- Make work discovery, testing, risk checks, and handoff updates explicit.
- Keep outputs machine readable for future orchestration and hub dashboards.
- Run with Claude, GPT style systems, or any LLM orchestrator through neutral
  role and command contracts.

## What is included today

- v0.1 and v0.2 concept documents
- Neutral role templates in `roles/`
- Neutral command contracts in `swarm-commands/`
- `.claude` compatibility layer (optional)
- Workflow definitions for review and development modes
- JSON schemas for run output, findings, and role contracts
- Runtime module skeletons for dispatcher and role execution

## LLM compatibility

This repo is intentionally model agnostic.

- Use `roles/*.md` templates for neutral orchestration.
- Use `swarm-commands/*.md` as neutral command references.
- `.claude/*` is optional and only used when you explicitly choose Claude-specific
  wrappers.
- Runtime now resolves role definitions from `roles` first, then `.claude/agents`, then
  `.llm/agents` as fallback.

## Usage status

`aahp-swarm` is currently specification-first with runtime skeletons.
Full execution, validation, and AAHP-tool orchestration are the next step.

For practical setup and integration details:
- Read `docs/HOW-TO-USE.md`
- Read `docs/TITLE-STANDARDS.md`
- Keep `.ai/handoff/*` and `.ai/swarm/*` as the current state layer. `.ai/swarm/*` is runtime-generated and must stay outside git (`.gitignore`).

## Next step

The project can stay as a specification template at first,
or become a dedicated executable layer once runtime files are implemented.

## Quick start

1. Read `docs/AAHP-SWARM-v0.2.md`
2. Pick `docs/SWARM-MVP-REVIEW.md`
3. Read `docs/TITLE-STANDARDS.md`
4. Read `roles/scout.md` then `roles/tester.md`
5. Use `swarm-commands/review.md` for neutral orchestrators.
6. Use schemas in `schemas/` for run outputs.

## Repository layout

- `docs/` - architecture and role docs
- `roles/` - neutral role templates
- `swarm-commands/` - neutral command contracts
- `schemas/` - output contracts
- `workflows/` - runtime workflow assets
- `runtime/` - TypeScript implementation entry points

### Naming conventions

Use the shared conventions in `docs/TITLE-STANDARDS.md` for:

- Issue/task titles
- Incident IDs and titles
- Documentation headings
- Swarm and finding identifiers

## Optional Claude compatibility layer

If present, `.claude/*` can be used by Claude-native runners only.
If you remove `.claude`, the repo still remains usable because all neutral
contracts are in `roles/` and `swarm-commands/`.
