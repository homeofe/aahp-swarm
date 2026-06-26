# AAHP-SWARM Naming Standards

These rules make artifacts easy to find and avoid vague titles.

## 1) Issues / Task titles

Use this format for task IDs and issue titles:

- Issue ID: `T-001`, `T-014`, ...
- Finding ID: `F-001`, `F-014`, ...
- Title format: `[AAHP-SWARM] [<priority>] <scope>: <clear action>`

Rules:

- `<scope>` is a short noun phrase (`review`, `runtime`, `handoff`, `docs`).
- The action is imperative and specific.
- Avoid generic titles like "Fix stuff" or "Bug".

Good examples:

- `[AAHP-SWARM] [P1] reviewer: Add schema validation before commit`
- `[AAHP-SWARM] [P2] docs: Clarify issue and incident naming`
- `[AAHP-SWARM] [P3] runtime: Add output path constants`

## 2) Incident titles

Use this format whenever an incident is opened:

- Incident ID: `INC-20260626-001`
- Incident title format: `INC-20260626-001: [scope] [severity] <short summary>`

Rules:

- Incident title must include the cause and impact in one sentence.
- Keep summary <= 12 words when possible.

Good examples:

- `INC-20260626-001: [runtime] [high] Schema validator rejects malformed finding id`
- `INC-20260626-002: [handoff] [medium] Trust file not updated after review run`

## 3) Documentation titles

All docs in this project should start with a clear header:

- v0.x docs: `# AAHP-SWARM v0.2 - <topic>`
- Runtime docs: `# AAHP-SWARM Runtime - <topic>`

Good examples:

- `# AAHP-SWARM v0.2 - LLM Interoperability`
- `# AAHP-SWARM Runtime - Role Routing`
- `# AAHP-SWARM v0.2 - Naming Standards`

## 4) Swarm run naming (optional)

Use deterministic run titles in machine output:

- `AAHP-SWARM <mode> run for <repo>@<short-commit>`
- `AAHP-SWARM review run for aahp-swarm@c1a9`

## 5) Artifact output fields (recommended)

To keep results uniform across orchestrators:

- Findings should include a `title` field (short and specific).
- Roles that emit issues should include both `id` and `title`.
- Incident outputs should include `incident_id` and `incident_title`.
