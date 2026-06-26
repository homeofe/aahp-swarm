# AAHP-SWARM Hub

This is a lightweight local dashboard for AAHP-SWARM state and run data.
It is intentionally minimal and neutral across LLM clients.

## Run

- from repo root:

```bash
node hub/server.js
```

- open browser at:

```
http://127.0.0.1:4173
```

## What it reads

- `.ai/handoff/*`
- `.ai/swarm/*`

## Settings

- repo root
- run mode
- refresh interval
- handoff and run directories

Settings are persisted in `hub/.local/hub-config.json` and `hub/.local/hub-secrets.json`, and are intentionally git-ignored.

## Why this exists

- no manual Markdown editing needed for routine status monitoring
- one place to view run state, findings, and session files
- can be extended with action buttons for your AAHP scripts (`verify`, `manifest`, `archive`)
