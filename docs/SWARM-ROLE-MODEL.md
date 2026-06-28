# Swarm Role Model

AAHP Swarm adds explicit roles to make agent pipelines explicit and auditable.

## Core roles

- Scout
  - Input: manifest, handoff state, issue queue, and repo changes.
  - Output: ready/blocked candidate list and priority ranking.
- Architect / Implementer / Reviewer / Handoff Manager
  - Reused from existing `improvements` workflow.
- Tester
  - Runs concrete verification commands and reports verified vs assumed outcomes.
- Risk
  - Checks security, PII, drift, dependency risk, and policy violations.
- Verdict
  - Aggregates all role outputs and decides `pass`, `warning`, `fail`, `block`, or `hold` via the Typed Verdict Layer (docs/typed-verdict-layer.md): an unknown never collapses to pass or block.
- Controller
  - Orchestrates the pipeline, prevents loops, and compresses repeated findings.
- Telemetry
  - Tracks outcomes and verifies the execution state (authorization is not success).

## Minimum viable flow

1. Scout
2. Reviewer
3. Tester
4. Risk
5. Verdict
6. Handoff Manager

## Decision policy (MVP)

- Any blocking risk => `block`.
- Failed required tests => `fail`.
- Missing optional checks => `warning`.
- Clean review + tests + no blocking risk => `pass`.
- Unclassifiable change or missing handoff metadata => `hold` (Typed Verdict Layer), never a silent pass.
