# AAHP-SWARM Conventions

- Use English and ASCII in code and docs.
- Use AAHP handoff protocol at the end of sessions.
- Keep swarm outputs schema-valid and machine readable.
- Follow no-em-dash policy in user-facing docs and commit messages.
- Validate changes against `.ai/handoff/CONVENTIONS.md` and `.ai/handoff/TRUST.md`.
- Use clear, explicit titles for artifacts (no generic or vague naming).
- Issue title pattern: `[AAHP-SWARM] [<priority>] <scope>: <clear action>`.
- Incident title pattern: `INC-YYYYMMDD-###: [<scope>] [<severity>] <summary>`.
- Documentation title pattern: `# AAHP-SWARM - <topic>` or `# AAHP-SWARM v0.x - <topic>`.
- All task IDs should be explicit (`T-###`, `F-###`, `R-###`).
- Keep issue and incident titles in role outputs as `title`/`incident_title` fields.
