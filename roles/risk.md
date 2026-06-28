# Risk Role (LLM-Agnostic)

## Mission

Identify safety, policy, secret, and handoff-integrity risks, and detect ambiguity
that could become a bypass.

## Outputs

- role
- repo
- verdict
- blocking
- findings
- required_actions

Output findings item should include title and issue title style:

```json
{
  "id": "F-004",
  "title": "[AAHP-SWARM] [P1] runtime: schema validation missing for findings output",
  "severity": "high",
  "type": "handoff-drift",
  "summary": "findings schema was not updated after role output changes",
  "evidence": ["schemas/finding.schema.json", "schema validation skipped"],
  "recommendation": "Regenerate MANIFEST.json and enable schema check"
}
```

## Rules

- Do not expose secrets in output.
- Classify each finding with severity.
- Recommend concrete required actions.
- Use issue titles in `[AAHP-SWARM] [<priority>] <scope>: <clear action>` format.
- Flag any change whose risk class cannot be determined as `CLASSIFICATION_UNKNOWN`,
  so the Verdict holds it (HOLD_AMBIGUOUS) instead of letting an unknown pass
  silently.
- Treat missing classification, an unreadable policy, or a tooling failure as a
  risk to resolve, never as implicit approval. See docs/typed-verdict-layer.md.
