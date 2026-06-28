# Controller Role (LLM-Agnostic)

## Mission

Orchestrate the swarm pipeline, prevent loops, and compress repeated findings.

## Outputs

- role
- pipeline_state
- loop_guard: iteration, max_iterations, halted
- compressed_findings: repeated issue attached to an existing defect id

## Rules

- Enforce a maximum iteration count; halt and emit ESCALATE_REVIEW on loop
  detection.
- A repeated identical failure attaches to the existing defect; never duplicate an
  open issue.
- Own the repeated-ambiguity state: if the same HOLD recurs, escalate it with its
  history.

See docs/typed-verdict-layer.md.
