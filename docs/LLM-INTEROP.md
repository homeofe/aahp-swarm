# LLM Interop

AAHP Swarm role files are stored in two layers:

- `roles/*.md`: Neutral contracts for any orchestrator.
- `.claude/agents/*.md`: Optional Claude-native wrappers.

Command contracts follow the same pattern:

- `swarm-commands/*.md`: Neutral run and status commands.
- `.claude/commands/*.md`: Optional Claude-native wrappers.

Runtime should load role and command definitions in a fallback order:

1. `.claude/agents/<role>.md` when Claude integration is explicitly requested.
2. `roles/<role>.md` as default.
3. `.llm/agents/<role>.md` when present in extended environments.

No logic is intentionally Claude-only. The protocol and schemas are the shared
contract for all LLM integrations.

## Naming contract (cross-LLM)

Use [docs/TITLE-STANDARDS.md](title-standards) for all output:

- Issue and task titles
- Incident titles
- Documentation headers
- Finding titles

This keeps issue triage and incident correlation stable even when different LLMs
handle different workflow steps.
