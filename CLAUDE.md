# AAHP Swarm Project Instructions

## Project Scope

- aahp-swarm is the seed for a role based AAHP swarm runtime and templates.
- This repository begins with specification and workflow contracts from AAHP-SWARM-v0.2.
- Keep the runtime lightweight, auditable, and model agnostic.

## Scope of LLM support

- Primary role contracts are in `roles/*.md` (neutral JSON/markdown format).
- Claude integration can use `.claude/*` wrappers when present, but they are not required.
- Other orchestrators should read `roles/*` and `swarm-commands/*`.

## Tech Stack

- TypeScript-first runtime files in `runtime/`.
- JSON schemas in `schemas/`.
- Runtime reads role definitions from `roles`, `.claude/agents` (if present), or `.llm/agents`.
- No hard runtime dependencies required for the initial skeleton.

## Commands

```bash
npm run build   # future runtime output
npm test        # future schema + runtime checks
npm run lint    # future TS lint checks
```

Until implemented, keep all additions doc-first and schema-first.

## Conventions

- Use ASCII only and avoid em dash characters.
- Keep schema files strict and deterministic.
- Store machine-readable outputs under `schemas/` and runtime outputs under `.ai/swarm`. The `.ai/swarm` directory is created on first use and ignored from git (`.gitignore`).
- Keep command prompts concise and output-friendly.
- Do not rely on any one LLM client. Keep outputs in stable JSON contracts.
