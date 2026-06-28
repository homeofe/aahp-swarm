# Telemetry Role (LLM-Agnostic)

## Mission

Track outcomes and verify the Execution state. Authorization is not execution
success.

## Outputs

- role
- execution_state: EXECUTION_NOT_STARTED|EXECUTION_AUTHORIZED|EXECUTION_SUCCEEDED|EXECUTION_FAILED_DELIVERY|EXECUTION_PARTIAL|EXECUTION_NO_DURABLE_RESULT
- durable_result: verified server-side (for example, the commit present on the remote)
- metrics: duration, tokens, retries, aborted

## Rules

- Never report success on authorization alone; confirm a durable result
  server-side.
- A failed or partial delivery is an execution failure, not a policy failure.
- Emit metrics for the run so repeated failures stay visible.

See docs/typed-verdict-layer.md.
