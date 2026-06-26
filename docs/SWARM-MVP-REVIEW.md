# MVP Review Swarm

The v0.2 minimum viable swarm is a review-first workflow with no fully autonomous
implementation loop.

## Goals

- Verify repository state before or after changes.
- Make risk and test results explicit.
- Keep AAHP handoff state synchronized with changes.

## Pipeline

1. Scout discovers candidate work.
2. Reviewer checks current change set and conventions.
3. Tester executes safe verification commands.
4. Risk identifies blockers and safety issues.
5. Verdict sets overall decision.
6. Handoff manager records output and status for next run.

## Outputs

- `swarm-run` JSON with role execution order and final verdict.
- findings list with IDs and severity.
- commands + results from tester.
- required actions and follow-up tasks.

## Early implementation boundaries

- No autonomous decision making in v0.2.
- Verdict is deterministic based on strict role outputs.
- Runtime should write outputs to one location for future hub ingestion.
