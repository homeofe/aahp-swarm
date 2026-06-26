# Swarm Review Command (LLM-Agnostic)

Run a review-first swarm cycle.

Inputs:
- role outputs directories
- role definitions in roles/ (Claude wrappers in .claude/agents are optional)

Expected output:
- .ai/swarm/latest-run.json
- .ai/swarm/findings.jsonl
- .ai/swarm/SUMMARY.md
