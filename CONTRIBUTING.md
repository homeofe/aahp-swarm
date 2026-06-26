# Contributing to AAHP Swarm

Thanks for your interest in contributing. AAHP Swarm is a model-agnostic,
role-based review and verification layer that extends the AAHP protocol. The
project is specification-first: the role contracts, command contracts, and JSON
schemas are the source of truth, and the runtime is built to match them.

## Getting started

1. Fork the repository and create a feature branch from `main`.
2. Read the concept documents in `docs/` (`AAHP-SWARM-v0.2.md`,
   `SWARM-ROLE-MODEL.md`, `LLM-INTEROP.md`) before changing contracts.
3. Keep changes focused and small.

## Repository layout

- `roles/` neutral, LLM-agnostic role templates (scout, tester, risk, verdict).
- `swarm-commands/` neutral command contracts (review, status).
- `schemas/` JSON schemas for run output, findings, role contracts, verdict.
- `workflows/` review and development mode definitions.
- `runtime/` dispatcher and role-execution modules.
- `hub/` integration surface for AAHP Hub dashboards.
- `.claude/` optional Claude compatibility layer.

## Contribution rules

- **Keep contracts model-agnostic.** `roles/*.md` and `swarm-commands/*.md` must
  not be Claude-specific or tied to any single LLM. Vendor-specific wrappers
  belong only in the optional `.claude/` layer. The runtime resolves roles from
  `roles/` first, then `.claude/agents`, then `.llm/agents`.
- **Schemas are the contract.** If you change a role or command output, update
  the matching schema in `schemas/` in the same change, and make sure example
  outputs still validate.
- **Keep outputs machine readable.** Run results are written to
  `.ai/swarm/latest-run.json` and `.ai/swarm/findings.jsonl`; preserve that
  shape so AAHP Hub and downstream tooling can consume them.
- **No em dashes** in code, comments, or documentation. Use a regular hyphen or
  restructure the sentence.

## Pull request process

1. Open a Pull Request against `main` with a clear description.
2. Link any relevant issues and label the role or area you touched
   (`role: scout`, `area: schema`, and so on).
3. Update the affected schema, role, command, or doc in the same PR.
4. Confirm no secrets are in the commit history.

For major changes (new roles, new commands, schema-breaking changes), open an
issue first to discuss design and scope.

## License

By contributing, you agree that your contributions are licensed under the
[Apache License 2.0](LICENSE).
