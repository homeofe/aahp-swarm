# AAHP Swarm Architecture Concept v0.1

**Status:** Draft v0.1  
**Date:** 2026-06-26  
**Author / Maintainer:** Emre Kohler / Elvatis  
**Working title:** `aahp-swarm`  

---

## 1. Executive Summary

`AAHP Swarm` is a proposed extension of the existing AAHP ecosystem into a coordinated, role-based multi-agent architecture for autonomous software maintenance, quality review, security-oriented analysis, and controlled execution.

The core idea is simple:

> Do not rely on one “genius agent”. Build a coordinated, auditable, stateful agent team.

Instead of treating AI-assisted development as isolated chat sessions, `AAHP Swarm` treats agents as specialized workers operating through a shared, verifiable state layer. The existing AAHP toolchain already provides most of the required foundation:

- `AAHP` as the structured handoff protocol
- `aahp-runner` as autonomous task executor
- `aahp-cron` as scheduled multi-project orchestrator
- `aahp-hub` as monitoring and control surface
- `aahp-orchestrator` as VS Code / human-in-the-loop integration
- `improvements` as a portable, LLM-agnostic workflow framework with routing, custom agents, commands, review cycles, and AAHP integration

This document captures the first conceptual version of the architecture and proposes how it can either extend the existing `improvements` repository or become a dedicated new project named `aahp-swarm`.

---

## 2. Why This Matters

Current AI coding workflows often look like this:

```text
Prompt in → code out → maybe tests → maybe review → context lost
```

That model does not scale well across multiple repositories, multiple agents, multiple LLM providers, or longer-running unattended workflows.

The AAHP ecosystem already moves toward a better model:

```text
State read → task selected → work performed → verification → handoff updated → next agent prepared
```

`AAHP Swarm` takes this one step further:

```text
Scout → Architect → Implementer → Tester → Reviewer → Risk Agent → Handoff Agent
```

Each role has a bounded responsibility, a defined input, a defined output, and a shared state contract.

This turns AI coding from ad-hoc prompting into something closer to:

> Agent Reliability Engineering.

---

## 3. Architectural Principle

The key architectural principle is:

> The model is not the product. The coordinated, verifiable agent organization is the product.

A single frontier model can be powerful, but it is difficult to govern, expensive to run, and hard to audit. A role-based swarm can be:

- more transparent
- more cost-efficient
- easier to verify
- easier to recover after failure
- safer for multi-repository automation
- more portable across model providers

---

## 4. High-Level Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                     Human Control Layer                      │
│       VS Code, GitHub Issues, AAHP Hub, Manual Review        │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                  Swarm Orchestration Layer                   │
│       aahp-cron + aahp-runner + aahp-orchestrator            │
│                                                              │
│  - discovers repositories                                    │
│  - syncs tasks and issues                                    │
│  - selects eligible work                                     │
│  - spawns role-specific agents                               │
│  - enforces limits, retries, and timeouts                    │
│  - records metrics and sessions                              │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                    AAHP Handoff State Layer                  │
│                                                              │
│  .ai/handoff/                                                │
│  ├── MANIFEST.json     → task graph, phase, checksums        │
│  ├── STATUS.md         → current project/system state        │
│  ├── NEXT_ACTIONS.md   → active task queue                   │
│  ├── TRUST.md          → verified/assumed facts              │
│  ├── CONVENTIONS.md    → project rules                       │
│  ├── WORKFLOW.md       → agent pipeline definition           │
│  └── LOG.md            → recent journal                      │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                     Specialized Agent Swarm                  │
│                                                              │
│  1. Scout Agent       → discovery and prioritization         │
│  2. Architect Agent   → planning and decomposition           │
│  3. Implementer Agent → code and documentation changes       │
│  4. Test Agent        → build/test/regression verification   │
│  5. Reviewer Agent    → diff, logic, and quality review      │
│  6. Risk Agent        → secrets, PII, drift, security checks │
│  7. Handoff Agent     → state update and transition          │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                 Git / CI / Verification Boundary             │
│                                                              │
│  - commits                                                   │
│  - pull requests                                             │
│  - GitHub Issues                                             │
│  - tests/builds                                              │
│  - aahp verify                                               │
│  - supply-chain/security checks                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Agent Roles

### 5.1 Scout Agent

**Purpose:** Discover, classify, and prioritize work.

**Responsibilities:**

- Read `MANIFEST.json`, `STATUS.md`, and `NEXT_ACTIONS.md`
- Sync or inspect GitHub Issues
- Identify ready, blocked, stale, or risky tasks
- Detect missing tasks from project state
- Produce a short ranked candidate list

**Output:**

```json
{
  "role": "scout",
  "repo": "example-repo",
  "candidate_tasks": [
    {
      "id": "T-017",
      "priority": "high",
      "reason": "Ready task with no unresolved dependencies"
    }
  ]
}
```

---

### 5.2 Architect Agent

**Purpose:** Convert a selected task into an execution plan.

**Responsibilities:**

- Identify affected modules
- Define implementation boundaries
- Split large work into smaller task graph nodes
- Define acceptance criteria
- Identify required tests

**Output:**

```json
{
  "role": "architect",
  "task_id": "T-017",
  "plan": [
    "Inspect current routing module",
    "Add validation layer",
    "Add regression tests",
    "Run build and unit tests"
  ],
  "acceptance_criteria": [
    "Existing behavior remains stable",
    "Invalid input is rejected safely",
    "Tests pass locally"
  ]
}
```

---

### 5.3 Implementer Agent

**Purpose:** Execute scoped code or documentation changes.

**Responsibilities:**

- Modify files only within task scope
- Follow `CONVENTIONS.md`
- Avoid broad refactors unless explicitly planned
- Produce commits with conventional commit messages

**Output:**

- Code/documentation changes
- Local test/build result
- Commit candidate

---

### 5.4 Test Agent

**Purpose:** Verify behavior through concrete commands.

**Responsibilities:**

- Run unit tests, integration tests, lint, build, or smoke checks
- Record exact commands and results
- Update `TRUST.md` with verified/assumed status
- Flag missing test coverage

**Output:**

```json
{
  "role": "tester",
  "task_id": "T-017",
  "verified": [
    "npm test passed",
    "npm run build passed"
  ],
  "assumed": [
    "Manual UI QA not performed"
  ],
  "failed": []
}
```

---

### 5.5 Reviewer Agent

**Purpose:** Review correctness, scope, and maintainability.

**Responsibilities:**

- Inspect diff
- Check whether acceptance criteria are met
- Detect scope creep
- Detect incomplete handoff state
- Recommend follow-up tasks

**Output:**

```json
{
  "role": "reviewer",
  "verdict": "pass_with_notes",
  "findings": [
    {
      "severity": "low",
      "type": "documentation-gap",
      "summary": "README does not mention the new validation behavior"
    }
  ]
}
```

---

### 5.6 Risk Agent

**Purpose:** Safety, security, and governance checks.

**Responsibilities:**

- Check for secrets or credentials
- Check PII leakage in handoff files
- Check suspicious prompt-injection patterns
- Check dependency or supply-chain risk signals
- Check handoff drift: code changed but state not updated

**Output:**

```json
{
  "role": "risk",
  "verdict": "warning",
  "findings": [
    {
      "severity": "medium",
      "type": "handoff-drift",
      "summary": "Source files changed but STATUS.md was not updated"
    }
  ]
}
```

---

### 5.7 Handoff Agent

**Purpose:** Finalize state and prepare the next agent/session.

**Responsibilities:**

- Update `STATUS.md`
- Update `NEXT_ACTIONS.md`
- Update task status in `MANIFEST.json`
- Refresh checksums
- Write `LOG.md`
- Update `quick_context`
- Commit handoff state

**Output:**

- Clean AAHP handoff state
- Updated task graph
- Ready next task
- Audit trail

---

## 6. Standard Workflow

```text
1. Scheduler or human starts a swarm run
2. Scout Agent identifies eligible work
3. Architect Agent prepares plan and acceptance criteria
4. Implementer Agent performs the change
5. Test Agent runs verification commands
6. Reviewer Agent checks correctness and scope
7. Risk Agent checks governance and safety boundaries
8. Handoff Agent updates AAHP state
9. Runner commits result or marks task blocked
10. Hub displays status, logs, metrics, and any warnings
```

---

## 7. MVP Proposal: AAHP Review Swarm

The safest and most useful first implementation is not a full autonomous security swarm. The recommended v0.1 MVP is:

> A review and quality swarm that checks changes across repositories before or after agent execution.

### MVP Scope

```text
Scout → Reviewer → Tester → Risk → Handoff
```

### MVP Checks

- Code quality
- Build health
- Test status
- Handoff drift
- Secrets/PII leakage
- Dependency risk indicators
- Documentation drift
- Missing follow-up tasks

### MVP Output

```json
{
  "repo": "aahp-runner",
  "phase": "review",
  "result": "warning",
  "findings": [
    {
      "id": "F-001",
      "severity": "medium",
      "type": "handoff-drift",
      "summary": "Code changed but STATUS.md was not updated",
      "recommended_task": "T-044: Regenerate handoff state"
    }
  ],
  "verified": [
    "build passes",
    "manifest checksum valid"
  ],
  "assumed": [
    "manual QA not performed"
  ]
}
```

---

## 8. Relationship to Existing `improvements` Repository

The `improvements` project already covers a significant part of this concept. It provides:

- portable AI-assisted development framework
- multi-model routing
- AAHP integration
- custom agents for research, architecture, implementation, review, and handoff management
- custom commands such as `/handoff`, `/status`, `/next`, `/route`, and `/review-cycle`
- cross-model review pattern
- cost-aware escalation
- LLM-agnostic documentation under `.llm/`

This means `AAHP Swarm` does not need to start from zero.

### What `improvements` already covers

```text
Researcher     → already present
Architect      → already present
Implementer    → already present
Reviewer       → already present
Handoff Manager→ already present
Routing logic  → already present
Review cycle   → already present
AAHP baseline  → already present
```

### What `AAHP Swarm` would add

```text
Scout Agent        → explicit discovery/prioritization role
Test Agent         → explicit verification role
Risk Agent         → explicit safety/governance role
Swarm Run Schema   → machine-readable run result
Finding Schema     → normalized issue/finding output
Verdict Schema     → pass/warn/fail/block result model
Swarm Policies     → role-specific safety and execution rules
Swarm Runner Mode  → pipeline-level orchestration over roles
Hub Integration    → visual swarm run status and findings
```

---

## 9. Two Possible Product Directions

### Option A: Extend `improvements`

Use `improvements` as the home for the concept.

**Pros:**

- Already contains agents, routing, commands, and AAHP integration
- Fastest path
- Lower maintenance overhead
- Good if the goal is a portable framework template

**Cons:**

- The repo may become conceptually broad
- Swarm runtime concerns may outgrow a copyable workflow template
- Harder to separate “framework docs” from “orchestration product”

Recommended if the next step is documentation, templates, and manual workflow guidance.

---

### Option B: Create `aahp-swarm`

Create a dedicated project for role-based swarm orchestration.

**Pros:**

- Clean product identity
- Can define schemas, policies, runtime, and CLI independently
- Easier to integrate with `aahp-runner`, `aahp-hub`, and `aahp-orchestrator`
- Better long-term fit for an actual agent operating layer

**Cons:**

- More initial setup
- Needs clear boundaries to avoid duplicating `aahp-runner`
- Requires versioned contracts with existing AAHP tools

Recommended if the target is an executable orchestration layer or a standalone product.

---

## 10. Recommended Direction

Recommended architecture path:

```text
Phase 1: Document as extension concept inside improvements
Phase 2: Add swarm policies, schemas, and role templates
Phase 3: Prototype a review-only swarm mode
Phase 4: If runtime grows, split into dedicated aahp-swarm repo
```

This avoids premature fragmentation while preserving a clear path to a standalone project.

---

## 11. Proposed Repository Structure for `aahp-swarm`

If split into a dedicated project, the structure could be:

```text
aahp-swarm/
├── README.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── MVP-REVIEW-SWARM.md
│   ├── ROLE-MODEL.md
│   ├── FINDINGS.md
│   └── ROADMAP.md
│
├── agents/
│   ├── scout.agent.md
│   ├── architect.agent.md
│   ├── implementer.agent.md
│   ├── tester.agent.md
│   ├── reviewer.agent.md
│   ├── risk.agent.md
│   └── handoff.agent.md
│
├── policies/
│   ├── safety-policy.md
│   ├── no-secrets-policy.md
│   ├── pii-policy.md
│   ├── dependency-policy.md
│   ├── commit-policy.md
│   └── review-policy.md
│
├── schemas/
│   ├── swarm-run.schema.json
│   ├── finding.schema.json
│   ├── verdict.schema.json
│   └── role-output.schema.json
│
├── workflows/
│   ├── review-swarm.workflow.json
│   ├── standard-dev.workflow.json
│   ├── release-hardening.workflow.json
│   └── incident-recovery.workflow.json
│
└── runtime/
    ├── dispatcher.ts
    ├── state-loader.ts
    ├── role-router.ts
    ├── verifier.ts
    ├── metrics-writer.ts
    └── abort-controller.ts
```

---

## 12. Initial Schemas

### 12.1 Swarm Run Result

```json
{
  "run_id": "swarm-2026-06-26-001",
  "repo": "example-repo",
  "started_at": "2026-06-26T12:00:00Z",
  "completed_at": "2026-06-26T12:08:00Z",
  "mode": "review",
  "result": "warning",
  "roles_executed": [
    "scout",
    "reviewer",
    "tester",
    "risk",
    "handoff"
  ],
  "findings": [],
  "verified": [],
  "assumed": [],
  "next_actions": []
}
```

### 12.2 Finding

```json
{
  "id": "F-001",
  "severity": "medium",
  "type": "handoff-drift",
  "summary": "Code changed but handoff state was not updated",
  "evidence": [
    "src/index.ts changed",
    ".ai/handoff/STATUS.md unchanged"
  ],
  "recommendation": "Run /handoff or create a follow-up task",
  "recommended_task": "T-044: Regenerate handoff state"
}
```

### 12.3 Verdict

```json
{
  "role": "risk",
  "verdict": "warning",
  "blocking": false,
  "reason": "Handoff drift detected but no secret leakage found"
}
```

---

## 13. Integration with Current Toolchain

### `AAHP`

Defines the handoff protocol, manifest, task graph, trust model, checksums, safety boundaries, and verification gates.

### `aahp-runner`

Executes tasks and can become the execution substrate for role-specific swarm stages.

### `aahp-cron`

Schedules swarm runs across projects and controls priority, limits, and execution windows.

### `aahp-hub`

Should display swarm runs, role status, findings, token cost, duration, warnings, and abort controls.

### `aahp-orchestrator`

Should allow human-in-the-loop triggering of swarm runs from VS Code and expose task/finding status in the dashboard.

### `improvements`

Should either host the first version of the role templates and policies or serve as the upstream workflow framework from which `aahp-swarm` derives its defaults.

---

## 14. Suggested Next Tasks

```text
T-001: Add this document as docs/AAHP-SWARM-v0.1.md in improvements
T-002: Compare existing improvements agents with proposed swarm roles
T-003: Draft scout.agent.md, tester.agent.md, and risk.agent.md
T-004: Define finding.schema.json and swarm-run.schema.json
T-005: Add review-swarm.workflow.json
T-006: Decide whether swarm remains inside improvements or becomes aahp-swarm
T-007: Prototype review-only swarm run in aahp-runner or adjacent CLI
T-008: Add aahp-hub view for swarm findings
```

---

## 15. Open Questions

1. Should `aahp-swarm` be only a specification/template layer or also an executable runtime?
2. Should role execution be handled by `aahp-runner`, or should `aahp-swarm` call `aahp-runner` as a dependency?
3. Should findings become first-class AAHP task objects?
4. Should swarm runs produce GitHub Issues automatically?
5. Should risk findings block commits by default?
6. Should `improvements` remain the portable template while `aahp-swarm` becomes the productized orchestration layer?

---

## 16. Working Position

The current working recommendation is:

> Start inside `improvements` as documentation and templates. If the concept requires runtime orchestration, schemas, metrics, and hub integration, split it into `aahp-swarm`.

Short positioning statement:

> AAHP Swarm turns autonomous AI coding from isolated chat sessions into an auditable, role-based agent operating system.

---

## 17. Version History

| Version | Date | Notes |
|---|---:|---|
| v0.1 | 2026-06-26 | Initial concept draft based on AAHP toolchain and improvements repository review |
