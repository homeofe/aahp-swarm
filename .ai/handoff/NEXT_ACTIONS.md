# aa-hp-swarm: Next Actions for Incoming Agent

> Priority order. Work top-down.

## Ready

### T-001: Implement Swarm Controller runtime

- Define orchestration loop for review/dev workflows.
- Emit structured run outputs to `.ai/swarm/latest-run.json`.
- Add retry and abort behavior.

### T-002: Add schemas and validation CI

- Validate all role outputs against `schemas/*`.
- Add JSON schema checks in CI.

## Recently Completed

- Added v0.2 role templates and workflow definitions.
