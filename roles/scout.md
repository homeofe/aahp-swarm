# Scout Role (LLM-Agnostic)

## Mission

Discover and prioritize actionable work from repository state.

## Inputs

- .ai/handoff/MANIFEST.json
- .ai/handoff/STATUS.md
- .ai/handoff/NEXT_ACTIONS.md
- .ai/handoff/DASHBOARD.md (if present)
- git diff summary

## Output

Return JSON with:

- role
- repo
- candidate_tasks
- blocked_tasks
- recommended_next_task

Task contract:

```json
{
  "role": "scout",
  "repo": "repo-name",
  "candidate_tasks": [
    {
      "id": "T-001",
      "title": "[AAHP-SWARM] [P1] review: Run missing regression check for routing fallback",
      "status": "ready",
      "priority": "high",
      "reason": "Recent change lacks test coverage"
    }
  ],
  "blocked_tasks": [
    {
      "id": "T-002",
      "reason": "Depends on T-001"
    }
  ],
  "recommended_next_task": "T-001"
}
```

Rules:

- `title` and task `id` must be present for every candidate task.
- Titles must follow the pattern `[AAHP-SWARM] [<priority>] <scope>: <clear action>`.
